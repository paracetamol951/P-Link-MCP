import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { setSessionAuth } from './context.js';
import oauthRouter, { bearerValidator } from './support/oauth.js';
import { registerPaymentsTools } from './tools/payments.js';
import { register402client } from './tools/402client.js';
import { registerAuthTool } from './tools/auth.js';

const app = express();

// Monte /.well-known, /oauth/*
app.use(await oauthRouter());

// CORS basique + exposition de l'en-tête de session pour les clients web (Inspector, etc.)
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // ajuste en prod
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, mcp-session-id, Mcp-Session-Id, x-api-key, x-apikey'
    );
    // Crucial pour que les clients puissent LIRE l'ID de session renvoyé par initialize
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// IMPORTANT : parser le JSON AVANT le middleware d'auth POST /mcp pour lire req.body.method
app.use(express.json());

// Types utilitaires
type BearerValidatorResult = { apiKey: string };

// Middleware d'auth pour POST /mcp : on LAISSE PASSER la méthode "initialize" sans auth.
// Pour toutes les autres méthodes (tools/resources/etc.), on exige Bearer OU x-api-key.
// (extrait)
/*app.post('/mcp', async (req, res, next) => {
    try {
        console.log('isInitialize');
        const isInitialize = (req.body as any)?.method === 'initialize';
        if (isInitialize) return next();

        // 1) OAuth Bearer
        const authHeader = req.get('authorization') || '';
        try {
            const { apiKey } = await bearerValidator(authHeader);
            setSessionAuth({ ok: true, APIKEY: apiKey, scopes: ['mcp:invoke', 'shop:read'] });
            return next();
        } catch {  }

        // 2) Fallback X-API-KEY
        const apiKey = req.get('x-api-key') ?? req.get('x-apikey');
        if (apiKey) {
            setSessionAuth({ ok: true, APIKEY: apiKey, scopes: ['*'] });
            return next();
        }

        return next();  // ← passe quand même (même sans auth)
    } catch (e) {
        const detail = e instanceof Error ? e.message : 'invalid token';
        console.log(e);
        return res.status(401).json({ error: 'unauthorized', detail }); // ← 401 ici
    }
});*/

app.post('/mcp', async (req, res, next) => {
    try {
        // 0) initialize passe sans auth
        if (req.body?.method === 'initialize') return next();

        // 1) Bearer OAuth prioritaire
        const auth = req.get('authorization') ?? req.get('Authorization');
        if (auth?.startsWith('Bearer ')) {
            const { apiKey } = await bearerValidator(auth); // RS256 + iss/aud/exp
            setSessionAuth({
                ok: true,
                APIKEY: apiKey,  
                scopes: ['mcp:invoke'],
            });
            return next();
        }

        // 2) Fallback optionnel x-api-key
        const xKey = req.get('x-api-key') ?? req.get('x-apikey');
        if (xKey) {
            setSessionAuth({ ok: true,  APIKEY: xKey, scopes: ['*'] });
            return next();
        }
        return next();

        //return res.status(401).json({ error: 'unauthorized', detail: 'Missing Bearer or x-api-key' });
    } catch (e: any) {
        return res.status(401).json({ error: 'invalid_token', detail: e?.message || 'bad bearer' });
    }
});


// Ton serveur MCP — ajoute ici tes tools/resources/prompts
const mcpServer = new McpServer({
    name: 'p-link',
    version: '0.0.1',
});

registerPaymentsTools(mcpServer);
register402client(mcpServer);
registerAuthTool(mcpServer);

// Map sessionId -> transport
const transports: Map<string, StreamableHTTPServerTransport> = new Map();

/**
 * Récupère l'ID de session depuis les en-têtes, en gérant les variantes de casse.
 */
function getSessionId(req: Request): string | undefined {
    return req.get('Mcp-Session-Id') || req.get('mcp-session-id') || undefined;
}

/**
 * Helper pour capturer les erreurs async et les passer à `next()`.
 */
const asyncHandler =
    <T extends (req: Request, res: Response, next: NextFunction) => Promise<any>>(fn: T) =>
        (req: Request, res: Response, next: NextFunction) =>
            Promise.resolve(fn(req, res, next)).catch(next);

// POST /mcp : requêtes client -> serveur (initialize, tools/*, resources/*, …)
app.post(
    '/mcp',
    asyncHandler(async (req: Request, res: Response) => {
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
            const method = (req.body as any)?.method;
            if (method !== 'initialize') {
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
        await transport.handleRequest(req as any, res as any, (req as any).body);
    })
);

// GET /mcp : canal SSE pour une session donnée
// DELETE /mcp : fermeture de session
const handleSessionRequest = asyncHandler(async (req: Request, res: Response) => {
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
    await transport.handleRequest(req as any, res as any);
});

app.get('/mcp', handleSessionRequest);
app.delete('/mcp', handleSessionRequest);

app.get('/', (_req: Request, res: Response) => {
    res.redirect('https://p-link.io');
});

// Lancement HTTP
const port = Number(process.env.PORT || 8787);
app
    .listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`MCP server running at http://localhost:${port}/mcp`);
    })
    .on('error', (error: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Server error:', error);
        process.exit(1);
    });
