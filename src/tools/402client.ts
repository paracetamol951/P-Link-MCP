import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BASE } from '../support/http.js';
import {  resolveAuth } from '../context.js';
import {  structData, wrapResult } from '../support/toolsData.js';

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
export const auth402_title = "Pay a HTTP 402 protected URL using your P-Link managed account, and returns the result";

export const get402clientShape = {
        url: z.string().describe("The 402 protected URL (can be any link complying to the x402 protocol)")
    } ;

export function register402client(server: McpServer ) {
    
    server.registerTool(
        'pay_and_get_402_protected_url',
        {
            title: auth402_title,
            description: auth402_title,
            inputSchema: get402clientShape,
            annotations: { title: auth402_title, destructiveHint: true, openWorldHint: true }
        },
        async (e) => await wrapResult(pay_and_get_402_protected_url, e)
    );
}