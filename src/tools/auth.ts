// src/tools/auth.ts (ajout)
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, ZodTypeAny } from 'zod';
//import { postJson } from '../support/http.js';
import { t } from '../i18n/index.js';
import { Ctx, getSessionAuth, resolveAuth, setSessionAuth } from '../context.js';
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
const getGetUserShape = {} satisfies Record<string, ZodTypeAny>;
type GetUserShapeArgs = z.infer<z.ZodObject<typeof getGetUserShape>>;

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
        'fund_my_wallet',
        {
            title: 'Fund your wallet',
            description: 'Get the different ways in order to fund your wallet',
            inputSchema: getGetUserShape, // shape
        },
        async ({ }: GetUserShapeArgs, ctx: Ctx) => {

            const { apiKey } = resolveAuth(undefined, ctx);


            var data = await getAPIuser(apiKey);

            if (typeof data === 'object' && data && 'pubk' in data) {
                var callParams = {
                    transaction_details: {
                        source_currency: t("usd"),
                        destination_exchange_amount: 10,
                        email: data.email
                    },
                    myCookie: apiKey,
                    pubk: data.pubk
                }
                try {
                    const response = await fetch(
                        BASE+"/api/create-onramp-session",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(callParams),
                        });
                    const onrampData = await response.json();
                    const strData = "In order to fund your wallet, you can send Solana to this address : " + data.pubk + " or if you want to use a credit card to fund your account, open this link : " + onrampData?.onrampSession?.redirect_url;
                    //process.stderr.write(`[caisse][info] set contxt: ${strData}\n`);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: strData,
                            },
                        ],
                        structuredContent: {
                            solanaWalletAddress: data.pubk,
                            fundWalletLink: onrampData?.onrampSession?.redirect_url,
                            debug: onrampData
                        },
                    };

                } catch (e) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: e?.toString(),
                            },
                        ],
                        structuredContent: e,
                    };
                }
            } else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: "User not found",
                        },
                    ],
                    structuredContent: {
                        error: "User not found",
                    },
                };
            }

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
                `APIKEY : ` + apiKey,
            ];

            return {
                content: [{ type: 'text', text: summary.join(' ') }],
                structuredContent: { ok: true, email, APIKEY: apiKey },
            };
        }
    );
}
