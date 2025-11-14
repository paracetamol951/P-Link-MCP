

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BASE } from '../support/http.js';
import {  resolveAuth } from '../context.js';
import {  structData } from '../support/toolsData.js';

export async function pay_and_get_402_protected_url(args: any) {
    const { url } = args;
    const { apiKey } = resolveAuth(undefined, undefined);
    var jsP = {
        myKey: apiKey,
        url
    }
    const fet = await fetch(BASE + '/api/pay402link', {
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
    return result;
}
export const auth402_title = "Pay a HTTP 402 protected URL";
export const auth402_desc = "Pay a HTTP 402 protected URL using your P-Link managed account, and gets the result";
export const get402clientShape = {
        url: z.string().describe("The 402 protected URL")
    } ;

export function register402client(server: McpServer ) {
    
    server.registerTool(
        'pay_and_get_402_protected_url',
        {
            title: auth402_title,
            description: auth402_desc,
            inputSchema: get402clientShape,
            annotations: { title: 'Pay 402 link', destructiveHint: true, openWorldHint: true }
        },
        async ({ url }) => {
            const r = pay_and_get_402_protected_url(url);
            return structData(r) as any;
        }
    );
}