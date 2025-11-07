import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import { createKeyPairSignerFromBytes } from "@solana/kit";

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, ZodTypeAny } from 'zod';
import { get } from '../support/http.js';
import { t } from '../i18n/index.js';
import { type Ctx, resolveAuth } from '../context.js';
import { currencyZOD, InferFromShape, structData } from '../support/toolsData.js';
import { callPaid } from "../support/test402.js";



 



export function register402client(server: McpServer | any) {
    
    const get402clientShape = {
        url: z.string().describe("The 402 protected URL")
    } satisfies Record<string, ZodTypeAny>;

    server.registerTool(
        'pay_and_get_402_protected_url',
        {
            title: "Pay a HTTP 402 protected URL",
            description: "Pay a HTTP 402 protected URL using your P-Link managed account, and gets the result",
            inputSchema: get402clientShape, 
            annotations: { readOnlyHint: true }
        },
        async ({ url }: InferFromShape<typeof get402clientShape>, ctx: Ctx) => {
            const { apiKey } = resolveAuth(undefined, ctx);
            var jsP = {
                myKey: apiKey
            }
            const fet = await fetch(process.env.API_BASE +'/api/getAPIUser', {
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
            if (result.error) {
                return structData(result);
            }
            if (!result.pk) {
                return structData({error:'This is not a managed wallet'});
            }

            const pk = result.pk;
            process.stderr.write(`[caisse][info] ok data ++++\n`);

            const paidResult = await callPaid(url, pk);

            return structData(paidResult);
        }
    );
}