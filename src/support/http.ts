import { fetch, type RequestInit } from 'undici';

export const BASE = process.env.API_BASE || 'https://caisse.enregistreuse.fr';
// en tête du fichier
export type Formish = Record<
    string,
    | string
    | number
    | boolean
    | null
    | undefined
    | Array<string | number | boolean>
>;
function serializeForForm(
    key: string,
    value: unknown,
    usp: URLSearchParams
) {
    const push = (k: string, v: unknown) => {
        if (v === undefined || v === null || v === '') return;
        if (
            typeof v === 'string' ||
            typeof v === 'number' ||
            typeof v === 'boolean'
        ) {
            usp.append(k, String(v));
        } else if (v instanceof Date) {
            usp.append(k, v.toISOString());
        } else if (Array.isArray(v)) {
            // Si tableau: on ajoute une entrée par élément
            for (const item of v) push(k, item);
        } else {
            // objets/unknown => JSON
            usp.append(k, JSON.stringify(v));
        }
    };

    push(key, value);
}
export function qs(params: Record<string, unknown>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === '') continue;
        if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
        else sp.append(k, String(v));
    }
    return sp.toString();
}


export async function get(path: string, params: Record<string, unknown>) {
    const url = `${BASE}${path}?${qs(params)}`;
    process.stderr.write(`[caisse][patch] GET ${url} ${path} ${params} \n`);
    const res = await fetch(url);
    return asJsonOrText(res as unknown as Response);
}
// remplace la signature de asJsonOrText et sa déclaration
export async function asJsonOrText(res: Response): Promise<unknown> {
    const buf = await res.arrayBuffer();
    const txt = new TextDecoder().decode(buf);
    const ct = res.headers.get('content-type') || '';

    if (ct.includes('application/json')) {
        try { return JSON.parse(txt); } catch {
            /* fallthrough */
            process.stderr.write(`[caisse][patch] could not parse JSON ${txt} \n`);
        }
    }
    // essaie quand même JSON si le serveur oublie le content-type
    try { return JSON.parse(txt); } catch { /*texte brut*/
        process.stderr.write(`[caisse][patch] could not parse JSON ${txt} \n`);
    }
    process.stderr.write(`[caisse][patch] return TXT ${txt} \n`);
    return txt;
}

// AJOUTE / MODIFIE postForm pour accepter des primitives
export async function postForm(
    path: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
): Promise<unknown> {
    const sp = new URLSearchParams();

    for (const [k, v] of Object.entries(body)) {
        serializeForForm(k, v, sp);
    }

    try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`${BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', ...headers },
            body: sp.toString(),
            signal: controller.signal,
        } as RequestInit).finally(() => clearTimeout(to));
        return asJsonOrText(res as unknown as Response);
    } catch {
        return { error: 'Request failed' };
    }
}

// aligne postJsonRaw sur unknown aussi
export async function postJsonRaw(
    path: string,
    body: unknown,
    headers: Record<string, string> = {}
): Promise<unknown> {
    try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`${BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
            signal: controller.signal
        } as RequestInit).finally(() => clearTimeout(to));
        return asJsonOrText(res as unknown as Response);
    } catch {
        return { error: 'Request failed' };
    }
}
