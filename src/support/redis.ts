import { Redis } from "ioredis";

const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redis = new Redis(url, {
    lazyConnect: true,     // n’essaie PAS de se connecter automatiquement
    enableReadyCheck: false,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,  // désactive TOUTE reconnexion
    connectTimeout: 500,
});

// IMPORTANT : ignorer toute erreur AVANT qu’on décide si on utilise Redis
redis.on("error", () => {
    // ne RIEN afficher et ne rien throw ici
    // l’erreur de connexion sera gérée dans initStore()
});

function errMsg(e: unknown) {
    if (!e) return "(unknown)";
    if (typeof e === "string") return e;
    return (e as any)?.message || JSON.stringify(e);
}

export async function connectRedis() {
    try {
        await redis.connect();     // essaie UNE fois
        console.error("[redis] connected");
    } catch (e) {
        console.error("[redis] connect failed:", errMsg(e));
        throw e;
    }
}
