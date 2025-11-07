import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, ZodTypeAny } from 'zod';
import { get } from '../support/http.js';
import { t } from '../i18n/index.js';
import { type Ctx, resolveAuth } from '../context.js';
import { currencyZOD, InferFromShape, structData } from '../support/toolsData.js';


export function registerPaymentsTools(server: McpServer | any) {
    const getSendMoneyShape = {
        to: z.string().describe("Email, phone or Solana wallet"),
        amount: z.number().positive().describe("Amount to send"),
        currency: currencyZOD.describe("Currency of specified amount to send"),
        title: z.string().optional().describe("A title for the transaction shown to the receiver")
    } satisfies Record<string, ZodTypeAny>;

    server.registerTool(
        'send_money',
        {
            title: "Send money",
            description: "Send money to an email, Solana wallet or phone number.",
            inputSchema: getSendMoneyShape, // ZodRawShape,
            //annotations: { readOnlyHint: true }
        },
        async ({ to, amount, currency, title }: InferFromShape<typeof getSendMoneyShape>, ctx: Ctx) => {
            const { apiKey } = resolveAuth(undefined, ctx);
            //const data = await get('/workers/getOrder.php', { idboutique: shopId, key: apiKey, to });
            var jsP = {
                myKey: apiKey,
                to,
                amount,
                currencyUsed: currency,
                title
            }
            const fet = await fetch('https://p-link.io/api/tr4usr', {
                method: 'POST',
                headers: {
                    Accept: 'application.json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsP)
            });
            var dat = await fet.text();
            process.stderr.write(`[caisse][info] dat ${dat}\n`);
            //console.log(dat);
            var result = JSON.parse(dat);
            //console.log(result);

            return structData(result);
            //return { content, structuredContent: isText ? undefined : data };
        }
    );
    const getCreatePLinkShape = {
        receivingPayment: z.string().optional().describe("Email, phone or Solana wallet of the recipient of the payment"),
        amount: z.number().positive().describe("Amount to request"),
        currency: currencyZOD.describe("Currency of specified amount to request"),
        title: z.string().optional().describe("A title for the payment shown to the payer"),
        description: z.string().optional().describe("A description, shown in the payment page"),
        returnOKURL: z.string().optional().describe("Optional : URL to redirect the client to after successfull payment"),
        returnURL: z.string().optional().describe("Optional : URL to redirect the client to after failed payment"),
        logo: z.string().optional().describe("Optional : URL to an image displayed in payment page"),
        param: z.string().optional().describe("Custom parameter"),
        webhook: z.string().optional().describe("HTTP webhook to call on payment success"),
        notificationEmail: z.string().optional().describe("Email to notify on payment success")
    } satisfies Record<string, ZodTypeAny>;

    server.registerTool(
        'request_payment_link',
        {
            title: "Create a payment link",
            description: "Create a payment link in order to request a payment",
            inputSchema: getCreatePLinkShape, // ZodRawShape,
            //annotations: { readOnlyHint: true }
        },
        async (reqBody: InferFromShape<typeof getCreatePLinkShape>, ctx: Ctx) => {
            //const { apiKey } = resolveAuth(undefined, ctx);
            if (reqBody.title) {
                reqBody.title = reqBody.title.split('\u20AC').join('euro');
            }
            if (!reqBody.receivingPayment) {
                const { apiKey } = resolveAuth(undefined, ctx);
                var jsP = {
                    myKey: apiKey
                }
                const fet = await fetch('http://localhost:3000/api/getAPIUser', {
                    method: 'POST',
                    headers: {
                        Accept: 'application.json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(jsP)
                });
                var dat = await fet.text();
                process.stderr.write(`[caisse][info] dat2 ${dat}\n`);
                //console.log(dat);
                var result = JSON.parse(dat);
                if (result.pubk) reqBody.receivingPayment = result.pubk;

                if (result.error) {
                    return structData(result);
                }
                //http://localhost:3000/api/getAPIUser/mHIt9QDOqVA6IZp9mD34fh
            }
            if (!reqBody.receivingPayment) {
                return structData({
                    error:'receivingPayment parameter required'});
            }
            var req = await fetch('http://localhost:3000/api/createPLink', {
                //var req = await fetch('https://p-link.io/api/createPLink', {
                method: 'POST',
                body: JSON.stringify(reqBody)
            });
            var plink_Info = await req.json();
            //console.log('plink_Info', plink_Info); 


            return structData(plink_Info);
        }
    );

    const getGetUserShape = {} satisfies Record<string, ZodTypeAny>;

    server.registerTool(
        'get_my_wallet_info',
        {
            title: "Wallet infos",
            description: "Retrieve the wallet infos about the connected P-Link account (Solana wallet address)",
            inputSchema: getGetUserShape, // ZodRawShape,
            //annotations: { readOnlyHint: true }
        },
        async (reqBody: InferFromShape<typeof getGetUserShape>, ctx: Ctx) => {

            const { apiKey } = resolveAuth(undefined, ctx);
            var jsP = {
                myKey: apiKey
            }
            const fet = await fetch('http://localhost:3000/api/getAPIUser', {
                method: 'POST',
                headers: {
                    Accept: 'application.json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsP)
            });
            var dat = await fet.text();
            process.stderr.write(`[caisse][info] dat2 ${dat}\n`);

            var result = JSON.parse(dat);

            if (result?.pubk) {
                process.stderr.write(`[caisse][info] fetch wallet infos\n`);
                const walletInfos = await fetch("https://p-link.io/api/walletInfos/" + result.pubk + '/1');
                const walletBalance = await walletInfos.json();
                result = { ...result, ...walletBalance };
            }
            return structData(result);
        }
    );

    const getGetTrxStateShape = {
        trxID: z.string().optional().describe("The transaction ID")
    } satisfies Record<string, ZodTypeAny>;

    server.registerTool(
        'get_transaction_state',
        {
            title: "Get transaction state",
            description: "Retrieve the state and details of a transaction using Solana trx ID",
            inputSchema: getGetTrxStateShape, // ZodRawShape,
            annotations: { readOnlyHint: true }
        },
        async ({ trxID }: InferFromShape<typeof getGetTrxStateShape>, ctx: Ctx) => {

            const fet = await fetch('http://localhost:3000/api/trxState/'+trxID+'/'+new Date().getTime() );
            var dat = await fet.text();
            process.stderr.write(`[caisse][info] dat2 ${dat}\n`);

            var result = JSON.parse(dat);
            return structData(result);
        }
    );
    const getWalletHistoryShape = {
        walletAddress: z.string().optional().describe("The wallet address")
    } satisfies Record<string, ZodTypeAny>;

    server.registerTool(
        'get_wallet_history',
        {
            title: "Get wallet history",
            description: "Retrieve list of the transactions related to the specified Solana wallet address",
            inputSchema: getWalletHistoryShape, // ZodRawShape,
            annotations: { readOnlyHint: true }
        },
        async ({ walletAddress }: InferFromShape<typeof getWalletHistoryShape>, ctx: Ctx) => {

            const fet = await fetch('http://localhost:3000/api/walletHistory/' + walletAddress +'/'+new Date().getTime() );
            var dat = await fet.text();
            process.stderr.write(`[caisse][info] dat2 ${dat}\n`);

            var result = JSON.parse(dat);
            return structData(result);
        }
    );
}
/*
export function createPaymentsTools(): ToolDefinition[] {
    return [
        // send_money
        {
            name: "send_money",
            description: "Send money to an email or phone number.",
            inputSchema: z.object({
                to: z.string().describe("Email or phone (E.164)"),
                amount: z.number().positive(),
                currency: z.string().default("USDC"),
                memo: z.string().optional()
            }),
            async handler({ input }) {
                const { to, amount, currency, memo } = input as z.infer<this["inputSchema"]>;
                const res = await coreSendMoney({ to, amount, currency, memo });
                return { content: [{ type: "text", text: JSON.stringify(res) }] };
            }
        },

        // request_money
        {
            name: "request_money",
            description: "Create a payment link (P-Link) to request money.",
            inputSchema: z.object({
                from: z.string().optional().describe("Optional suggested payer"),
                amount: z.number().positive(),
                currency: z.string().default("USDC"),
                note: z.string().optional()
            }),
            async handler({ input }) {
                const { from, amount, currency, note } = input as z.infer<this["inputSchema"]>;
                const res = await coreRequestLink({ from, amount, currency, note });
                return { content: [{ type: "text", text: JSON.stringify(res) }] };
            }
        },

        // send_money_request
        {
            name: "send_money_request",
            description: "Send an email containing a P-Link payment request.",
            inputSchema: z.object({
                to: z.string(),
                plink: z.string().url(),
                subject: z.string().default("Payment request"),
                message: z.string().default("Please complete your payment using the link below.")
            }),
            async handler({ input }) {
                const { to, plink, subject, message } = input as z.infer<this["inputSchema"]>;
                const res = await sendPaymentEmail({ to, plink, subject, message });
                return { content: [{ type: "text", text: JSON.stringify(res) }] };
            }
        },

        // payment_history
        {
            name: "payment_history",
            description: "Retrieve recent wallet payment history.",
            inputSchema: z.object({
                limit: z.number().int().min(1).max(100).default(20),
                cursor: z.string().optional()
            }),
            async handler({ input }) {
                const { limit, cursor } = input as z.infer<this["inputSchema"]>;
                const res = await corePaymentHistory({ limit, cursor });
                return { content: [{ type: "text", text: JSON.stringify(res) }] };
            }
        },

        // pay_link (HTTP 402 client)
        {
            name: "pay_link",
            description: "Pay an HTTP 402-protected resource and return its content.",
            inputSchema: z.object({
                url: z.string().url(),
                maxAmount: z.number().positive().default(5),
                currency: z.string().default("USDC")
            }),
            async handler({ input }) {
                const { url, maxAmount, currency } = input as z.infer<this["inputSchema"]>;
                const res = await corePay402({ url, maxAmount, currency });
                return { content: [{ type: "text", text: JSON.stringify(res) }] };
            }
        }
    ];
}
*/