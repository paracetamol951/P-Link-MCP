import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { setSessionAuth } from './context.js';
import oauthRouter, { bearerValidator } from './support/oauth.js';
import { registerPaymentsTools } from './tools/payments.js';
import { register402client } from './tools/402client.js';

const app = express();

// Monte /.well-known, /oauth/*
app.use(await oauthRouter());

// CORS basique + exposition de l'en-tête de session pour les clients web (Inspector, etc.)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // ajuste en prod
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id, Mcp-Session-Id, x-api-key, x-apikey');
    // Crucial pour que les clients puissent LIRE l'ID de session renvoyé par initialize
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// IMPORTANT : parser le JSON AVANT le middleware d'auth POST /mcp pour lire req.body.method
app.use(express.json());

// Middleware d'auth pour POST /mcp : on LAISSE PASSER la méthode "initialize" sans auth.
// Pour toutes les autres méthodes (tools/resources/etc.), on exige Bearer OU x-api-key.
app.post('/mcp', async (req, res, next) => {
    try {
        const isInitialize = req.body?.method === 'initialize';
        if (isInitialize) {
            return next(); // 1re requête non authentifiée autorisée
        }

        // 1) Bearer (OAuth) si présent/valide
        const authHeader = req.get('authorization') || '';
        try {
            const { apiKey } = await bearerValidator(authHeader);
            setSessionAuth({ ok: true, APIKEY: apiKey, scopes: ['mcp:invoke', 'shop:read'] });
            return next();
        } catch {
            // ignore, on tentera x-api-key ensuite
        }

        // 2) Clé d'API (fallback) via en-têtes
        const apiKey = req.get('x-api-key') ?? req.get('x-apikey');
        if (apiKey) {
            setSessionAuth({ ok: true, APIKEY: apiKey, scopes: ['*'] });
            return next();
        }

        return res.status(401).json({ error: 'unauthorized', detail: 'missing or invalid token' });
    } catch (e) {
        return res.status(401).json({ error: 'unauthorized', detail: e?.message || 'invalid token' });
    }
});

// Optionnel : accepter une clé API même pour d'autres routes (GET/DELETE /mcp, etc.)
// Cela met à jour le contexte si un token est présent, sans bloquer l'initialize.
app.use((req, _res, next) => {
    const auth = req.get('authorization') || '';
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    const apiKey = m?.[1] ?? req.get('x-api-key') ?? req.get('x-apikey') ?? '';
    if (apiKey) {
        setSessionAuth({ ok: true, APIKEY: apiKey, scopes: ['*'] });
        process.stderr.write('[mcp][auth] Session mise à jour depuis headers HTTP.\n');
    }
    next();
});

// Ton serveur MCP — ajoute ici tes tools/resources/prompts
const mcpServer = new McpServer({
    name: 'p-link',
    version: '0.0.1',
});

registerPaymentsTools(mcpServer);
register402client(mcpServer);

// Map sessionId -> transport
const transports = new Map();

// Récupère l'ID de session depuis les en-têtes, en gérant les variantes de casse.
function getSessionId(req) {
    return req.get('Mcp-Session-Id') || req.get('mcp-session-id') || undefined;
}

// Helper pour capturer les erreurs async et les passer à `next()`.
const asyncHandler =
    (fn) =>
        (req, res, next) =>
            Promise.resolve(fn(req, res, next)).catch(next);

// POST /mcp : requêtes client -> serveur (initialize, tools/*, resources/*, …)
app.post(
    '/mcp',
    asyncHandler(async (req, res) => {
        const sessionId = getSessionId(req);

        let transport;

        if (sessionId) {
            transport = transports.get(sessionId);
            if (!transport) {
                return res.status(400).json({
                    jsonrpc: '2.0',
                    error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
                    id: null,
                });
            }
        } else {
            // Première requête d'initialisation attendue
            if (req.body?.method !== 'initialize') {
                return res.status(400).json({
                    jsonrpc: '2.0',
                    error: { code: -32000, message: 'Bad Request: Server not initialized' },
                    id: null,
                });
            }

            // Crée un transport; le SDK génère et renvoie l’ID de session via l’en-tête "Mcp-Session-Id"
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (newSessionId) => {
                    transports.set(newSessionId, transport);
                },
                // Optionnel :
                // enableDnsRebindingProtection: true,
                // allowedHosts: ['127.0.0.1', 'localhost'],
            });

            // Nettoyage à la fermeture
            transport.onclose = () => {
                const id = transport?.sessionId;
                if (id) transports.delete(id);
            };

            await mcpServer.connect(transport);
        }

        // Délègue la requête JSON-RPC/Stream au transport
        await transport.handleRequest(req, res, req.body);
    })
);

// GET /mcp : canal SSE pour une session donnée
// DELETE /mcp : fermeture de session
const handleSessionRequest = asyncHandler(async (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }
    const transport = transports.get(sessionId);
    if (!transport) {
        res.status(404).send('Unknown session');
        return;
    }
    // Le même handleRequest gère SSE (GET) et fermeture (DELETE)
    await transport.handleRequest(req, res);
});

app.get('/mcp', handleSessionRequest);
app.delete('/mcp', handleSessionRequest);

app.get('/', (_req, res) => {
    res.redirect('https://p-link.io');
});

// Lancement HTTP
const port = Number(process.env.PORT || 8787);
app
    .listen(port, () => {
        console.log(`MCP server running at http://localhost:${port}/mcp`);
    })
    .on('error', (error) => {
        console.error('Server error:', error);
        process.exit(1);
    });
