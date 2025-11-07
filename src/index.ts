
import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { setSessionAuth } from './context.js';
import oauthRouter, { bearerValidator } from './support/oauth.js';
import { registerPaymentsTools } from './tools/payments.js';
import { register402client } from './tools/402client.js';

const app = express();

app.use(await oauthRouter()); // <-- monte /.well-known, /oauth/*

// Middleware qui protège l’endpoint MCP par Bearer et initialise le "context" par requête
app.post('/mcp', async (req, res, next) => {
    try {
        const auth = req.get('authorization');
        const { apiKey } = await bearerValidator(auth);
        // Rendez ces infos dispos aux tools via le "session context" existant
        setSessionAuth({ ok: true, APIKEY: apiKey,  scopes: ['mcp:invoke', 'shop:read'] });
        next();
    } catch (e: any) {
        return res.status(401).json({ error: 'unauthorized', detail: e?.message || 'invalid token' });
    }
});

app.use(express.json());

app.use((req, _res, next) => {
    const auth = req.get('authorization') || '';
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    const apiKey = m?.[1] ?? req.get('x-api-key') ?? req.get('x-apikey') ?? '';
    if (apiKey ) {
        setSessionAuth({ ok: true,  APIKEY: apiKey, scopes: ['*'] });
        process.stderr.write('[mcp][auth] Session mise à jour depuis headers HTTP.\n');
    }
    next();
});

// CORS basique + exposition de l'en-tête de session pour les clients web (Inspector, etc.)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // ajuste en prod
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id, Mcp-Session-Id');
    // Crucial pour que les clients puissent LIRE l'ID de session renvoyé par initialize
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Ton serveur MCP — ajoute ici tes tools/resources/prompts
const mcpServer = new McpServer({
    name: 'p-link',
    version: '0.0.1',
});

//registerAuthTools(mcpServer);
registerPaymentsTools(mcpServer);
register402client(mcpServer);

// Map sessionId -> transport
const transports = new Map<string, StreamableHTTPServerTransport>();

/**
 * Récupère l'ID de session depuis les en-têtes, en gérant les variantes de casse.
 */
function getSessionId(req: express.Request): string | undefined {
    return req.get('Mcp-Session-Id') || req.get('mcp-session-id') || undefined;
}

/**
 * Express ne tape pas bien les handlers async dans certains environnements.
 * Petit helper pour capturer les erreurs async et les passer à `next()`.
 */
const asyncHandler =
    (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) =>
        (req: express.Request, res: express.Response, next: express.NextFunction) =>
            Promise.resolve(fn(req, res, next)).catch(next);

// POST /mcp : requêtes client -> serveur (initialize, tools/*, resources/*, …)
app.post(
    '/mcp',
    asyncHandler(async (req: express.Request, res: express.Response) => {
        const sessionId = getSessionId(req);

        let transport: StreamableHTTPServerTransport | undefined;

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
                onsessioninitialized: (newSessionId: string) => {
                    transports.set(newSessionId, transport!);
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
const handleSessionRequest = asyncHandler(async (req: express.Request, res: express.Response) => {
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

app.get("/", (req, res) => {
    res.redirect("https://p-link.io");
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
