import { t } from './i18n/index.js';
// __I18N_READY__
﻿// src/stdio.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z, ZodTypeAny } from 'zod';

// ⬇️ IMPORTANT : garde bien les suffixes ".js" car le build ESM référencera build/*.js
import { registerSalesTools } from './tools/sales.js';
import { registerDataTools } from './tools/data.js';
import { setSessionAuth, getSessionAuth } from './context.js';
import { registerPaymentsTools } from './tools/payments.js';
import { register402client } from './tools/402client.js';

// ==== Session globale (STDIO: une seule connexion) ====
type AuthState = { ok: boolean; SHOPID?: string; APIKEY?: string; scopes?: string[] };

/** Vérifie qu'un objet est un ZodRawShape (Record<string, ZodTypeAny>) */
function isZodRawShape(x: unknown): x is Record<string, ZodTypeAny> {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
    for (const v of Object.values(x as Record<string, unknown>)) {
        if (!v || typeof v !== 'object' || !(v as any)._def) return false;
    }
    return true;
}

/** Normalise en ZodRawShape ; log si correction appliquée */
function ensureZodRawShape(
    maybeShape: unknown,
    kind: 'inputSchema' | 'outputSchema',
    toolName: string
): Record<string, ZodTypeAny> {
    if (isZodRawShape(maybeShape)) return maybeShape;
    process.stderr.write(`[caisse][patch] ${kind} absent/non-ZodRawShape → {} pour ${toolName}\n`);
    return {};
}

async function main() {
    const envShop = process.env.SHOPID ?? process.env.MCP_SHOPID;
    const envKey = process.env.APIKEY ?? process.env.MCP_APIKEY;
    if (!getSessionAuth() && envShop && envKey) {
        setSessionAuth({ ok: true, SHOPID: envShop, APIKEY: envKey, scopes: ['*'] });
        process.stderr.write('[caisse][auth] Session initialisée depuis variables d’environnement.\n');
    }
    // --- Logs de contexte ---
    try {
        // @ts-ignore
        const __dir = typeof __dirname !== 'undefined' ? __dirname : '(no __dirname)';
        process.stderr.write(`[caisse][path] __dirname=${__dir}\n`);
        process.stderr.write(`[caisse][env] API_BASE=${process.env.API_BASE ?? ''} \n`);
    } catch { }

    // --- Création du serveur MCP ---
    const server = new McpServer({
        name: 'p-link',
        version: '0.0.1',
    });
    // --- Guard inline: protège tous les tools sauf whitelist ---
    type Ctx = { auth?: { ok: boolean; user?: string; shopId?: string; scopes?: string[] } };
    // Wrap de registerTool
    

    

    // --- Enregistrement des outils métier ---
    try {
        //registerAuthTools(server);
        registerPaymentsTools(server);
        register402client(server);
    } catch (e: any) {
        process.stderr.write(`[caisse][error] Echec registerXTools: ${e?.stack || e}\n`);
    }

    // --- Tool "ping" minimal (inputSchema sous forme de shape, pas z.object) ---
    (server as any).registerTool(
        'ping',
        {
            title: t('tools.ping.title'),
            description: t('tools.ping.description'),
            inputSchema: { msg: z.string().optional() }, // ✅ ZodRawShape
        },
        async ({ msg }: { msg?: string }) => ({
            content: [{ type: 'text', text: `pong${msg ? ': ' + msg : ''}` }],
            structuredContent: { ok: true, echo: msg ?? null },
        })
    );


    // --- Démarrage en STDIO ---
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write(`[caisse][info] Server started and connected successfully (stdio)\n`);
}

// --- Garde-fous globaux ---
process.on('unhandledRejection', (err: any) => {
    process.stderr.write(`[caisse][fatal] UnhandledRejection: ${err?.stack || err}\n`);
});
process.on('uncaughtException', (err: any) => {
    process.stderr.write(`[caisse][fatal] UncaughtException: ${err?.stack || err}\n`);
});

main().catch((e) => {
    process.stderr.write(`[caisse][fatal] main() failed: ${e?.stack || e}\n`);
    process.exit(1);
});
