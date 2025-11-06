import { redis } from './redis.js';

const NS = (process.env.REDIS_NAMESPACE || 'mcp:oauth') + ':codes';
const key = (code: string) => `${NS}:${code}`;

export type PendingCode = {
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    login: string;
    apiKey: string;
    shopId: string;
    scope: string;
    exp: number; // epoch seconds
};

export async function saveCode(code: string, data: PendingCode, ttlSec = 300) {
    await redis.set(key(code), JSON.stringify(data), 'EX', ttlSec);
}
export async function loadCode(code: string): Promise<PendingCode | undefined> {
    const raw = await redis.get(key(code));
    return raw ? JSON.parse(raw) as PendingCode : undefined;
}
export async function deleteCode(code: string) {
    await redis.del(key(code));
}
