// src/tools/auth.ts (ajout)
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, ZodTypeAny } from 'zod';
//import { postJson } from '../support/http.js';
import { t } from '../i18n/index.js';
import { Ctx, getSessionAuth, setSessionAuth } from '../context.js';
import { BASE } from '../support/http.js';
import { getAPIuser } from '../support/toolsData.js';

// --- EXISTANT ---
// const AuthInput = {...} etc.
// export function registerAuthTools(server: McpServer | any) { ... outils existants ... }

// --- NOUVEAU ---
const CreateAccountInput = {
    email: z.string().email(),
} satisfies Record<string, ZodTypeAny>;

type CreateAccountArgs = z.infer<z.ZodObject<typeof CreateAccountInput>>;

const AuthInput = {
    API_KEY: z.string(),
} satisfies Record<string, ZodTypeAny>;

type AuthArgs = z.infer<z.ZodObject<typeof AuthInput>>;
type AuthResponse = {
    APIKEY: string;
};

export function registerAuthTool(server: McpServer | any) {
    server.registerTool(
        'login_with_api_key',
        {
            title: 'Login using API_KEY',
            description: 'Login using API_KEY',
            inputSchema: AuthInput, // shape
        },
        async ({ API_KEY }: AuthArgs, ctx: Ctx) => {
        //async ({ APIKEY }: { API_KEY: string }, ctx: Ctx) => {
            var data = await getAPIuser(API_KEY);

            if (typeof data === 'object' && data && 'pubk' in data ) {
                setSessionAuth({
                    ok: true,
                    APIKEY: API_KEY,
                    scopes: ['*'], 
                });

                ctx.auth = getSessionAuth();
            } else {
                console.error('Erreur API:', data);
            }
            const strData = typeof data === 'string'
                ? data
                : JSON.stringify(data, null, 2)
            //process.stderr.write(`[caisse][info] set contxt: ${strData}\n`);
            return {
                content: [
                    {
                        type: 'text',
                        text: strData,
                    },
                ],
                structuredContent: data, 
            };
        }
    );
    server.registerTool(
        'get_wallet_and_api_key',
        {
            title:  'Get a wallet and an API_KEY',
            description:  'Create wallet for this email and get API_KEY.',
            inputSchema: CreateAccountInput,
        },
        async ({ email }: CreateAccountArgs, ctx: Ctx) => {

            const resp: any = await fetch(BASE + '/api/getOrCreateApiKey/' + email);
            const res = await resp.json();

            const apiKey = res?.API_KEY ?? null;

            if (res?.error) {
                return {
                    content: [{ type: 'text', text: res?.error }],
                    is_error: true,
                    structuredContent: resp,
                };
            }
            if (!apiKey) {
                return {
                    content: [{ type: 'text', text: `API_KEY has been sent by email` }],
                    ok: true,
                    structuredContent: res,
                };
            }

            setSessionAuth({
                ok: true,
                APIKEY: apiKey,
                scopes: ['*'],
            });

            ctx.auth = getSessionAuth();

            const summary = [
                `Account created for ${email}.`,
                `APIKEY stored in session.`,
            ].join(' ');

            return {
                content: [{ type: 'text', text: summary }],
                structuredContent: { ok: true, email, APIKEY: apiKey },
            };
        }
    );
}
