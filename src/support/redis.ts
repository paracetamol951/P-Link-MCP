// src/support/redis.ts
import { Redis } from 'ioredis';

const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redis = new Redis(url, {
    // ⚠️ augmente (ou neutralise) la limite par requête pendant le boot
    maxRetriesPerRequest: 3, // ou un nombre plus grand, ex. 20
    enableReadyCheck: true,
    // meilleure stratégie de reconnexion
    retryStrategy(times) {
        const delay = Math.min(1000 * Math.pow(2, times), 15000);
        return delay; // ms (retente indéfiniment)
    },
    connectTimeout: 10000,
    lazyConnect: true, // on appelle .connect() explicitement
});

function errMsg(e: unknown) {
    if (!e) return '(unknown)';
    if (typeof e === 'string') return e;
    const any = e as any;
    return any?.message || JSON.stringify(any);
}

redis.on('connect', () => process.stderr.write('[redis] connect\n'));
redis.on('ready', () => process.stderr.write('[redis] ready\n'));
redis.on('error', (e: unknown) => {
    const msg = e && typeof e === 'object' && 'message' in (e as any) ? (e as any).message : String(e);
    process.stderr.write(`[redis][error] ${msg}\n`);
});
export async function connectRedis() {
    try {
        await redis.connect();
        process.stderr.write('[redis] connected (await)\n');
    } catch (e) {
        process.stderr.write(`[redis][fatal] connect failed: ${errMsg(e)}\n`);
        throw e;
    }
}