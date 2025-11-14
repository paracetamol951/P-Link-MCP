import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, ZodTypeAny } from 'zod';
import { BASE, get } from '../support/http.js';
import { t } from '../i18n/index.js';
import { type Ctx, resolveAuth } from '../context.js';

/** Util pour typer un handler depuis un "shape" */
export type InferFromShape<S extends Record<string, ZodTypeAny>> = z.infer<z.ZodObject<S>>;
export function safeStringify(value: any, space = 2, maxLen = 4000) {
    try {
        const cache = new WeakSet();
        const s = JSON.stringify(
            value,
            (k, v) => {
                if (typeof v === 'bigint') return v.toString(); // éviter l’erreur BigInt
                if (typeof v === 'object' && v !== null) {
                    if (cache.has(v)) return '[Circular]';
                    cache.add(v);
                }
                return v;
            },
            space
        );
        return s.length > maxLen ? s.slice(0, maxLen) + '…(truncated)' : s;
    } catch (e) {
        return `[unstringifiable: ${(e as Error).message}]`;
    }
}
z.object({
})


export function structData(data: any) {
    // on ne touche PAS à structuredContent (c’est ce que ChatGPT utilise)
    try {
        const light = Array.isArray(data)
            ? data.slice(0, 5000)//.map(({ id, nom, email, tel, ...r }) => ({ id, nom, email, tel }))
            : data;

        const maxLength = 40000;
        const preview =
            typeof light === 'string'
                ? (light.length > maxLength ? light.slice(0, maxLength) + '…(truncated)' : light)
                : safeStringify(light, 2, maxLength);   // <-- aperçu court et “safe”
        const wrapped =
            Array.isArray(data)
                ? { data: data }
                : data && typeof data === 'object'
                    ? data
                    : { data: data };
        return {
            content: [{ type: 'text', text: preview }],
            structuredContent: wrapped,
        };
    } catch (e) {
    }
    return {
        content: [{ type: 'text', text: "Error" }],
        structuredContent: { type: 'text', text: "Error" },
    };
}
export async function getAPIuser(apiKey: string) {
    var jsP = {
        myKey: apiKey
    }
    const fet = await fetch(BASE + '/api/getAPIUser', {
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
export const currencyZOD = z.enum(['USD', 'EUR']).optional().default("USD")