

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BASE } from '../support/http.js';
import {  resolveAuth } from '../context.js';
import {  structData } from '../support/toolsData.js';

export function register402client(server: McpServer ) {
    
    const get402clientShape = {
        url: z.string().describe("The 402 protected URL")
    } ;

    server.registerTool(
        'pay_and_get_402_protected_url',
        {
            title: "Pay a HTTP 402 protected URL",
            description: "Pay a HTTP 402 protected URL using your P-Link managed account, and gets the result",
            inputSchema: get402clientShape,
            annotations: { title: 'Pay 402 link', destructiveHint: true, openWorldHint: true }
        },
        async ({ url } ) => {
            const { apiKey } = resolveAuth(undefined, undefined);
            var jsP = {
                myKey: apiKey,
                url
            }
            const fet = await fetch(BASE +'/api/pay402link', {
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
            return structData(result) as any;
        }
    );
}