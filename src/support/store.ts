import { redis, connectRedis } from "./redis.js";

const memory = {
    kv: new Map<string, any>(),
    sets: new Map<string, Set<string>>(),
};

let useMemory = true;

export async function initStore() {
    try {
        console.error("[store] Try connect Redis backend");
        await connectRedis();
        useMemory = false;
        console.error("[store] Using Redis backend");
    } catch {
        useMemory = true;
        console.error("[store] Using IN-MEMORY fallback backend");

        try {
            // Empêche ioredis d’essayer de se reconnecter en boucle
            await redis.quit();
        } catch { }

        // Optionnel : supprime tous les listeners Redis pour être propre
        redis.removeAllListeners();
    }
}

// ---- Helpers mémoire ----

function memGet(key: string) {
    return memory.kv.get(key) ?? null;
}
function memSet(key: string, value: any) {
    memory.kv.set(key, value);
}
function memDel(key: string) {
    memory.kv.delete(key);
}
function memExists(key: string) {
    return memory.kv.has(key) ? 1 : 0;
}

function memSAdd(key: string, ...members: string[]) {
    let set = memory.sets.get(key);
    if (!set) {
        set = new Set();
        memory.sets.set(key, set);
    }
    members.forEach(m => set!.add(m));
}
function memSMembers(key: string): string[] {
    return Array.from(memory.sets.get(key) ?? []);
}
function memSRem(key: string, member: string) {
    memory.sets.get(key)?.delete(member);
}

// ---- MULTI (pipeline) mémoire ----

function createMemoryMulti() {
    const ops: (() => void)[] = [];

    return {
        set(key: string, value: any, ...args: any[]) {
            ops.push(() => memSet(key, value));
            return this;
        },
        del(key: string) {
            ops.push(() => memDel(key));
            return this;
        },
        sadd(key: string, member: string) {
            ops.push(() => memSAdd(key, member));
            return this;
        },
        srem(key: string, member: string) {
            ops.push(() => memSRem(key, member));
            return this;
        },
        exec() {
            ops.forEach(op => op());
            return Promise.resolve([]); // structure type redis
        }
    };
}

// ---- STORE API ----

export const store = {

    // GET
    async get(key: string) {
        if (useMemory) return memGet(key);
        return await redis.get(key);
    },

    // SET (compatible redis args)
    async set(key: string, value: any, ...args: any[]) {
        if (useMemory) {
            memSet(key, value);
            // TTL (EX ttl)
            if (args.length >= 2) {
                const opt = String(args[0]).toUpperCase();
                const ttl = Number(args[1]);
                if (opt === "EX" && !isNaN(ttl)) {
                    setTimeout(() => memDel(key), ttl * 1000);
                }
                if (opt === "PX" && !isNaN(ttl)) {
                    setTimeout(() => memDel(key), ttl);
                }
            }
            return;
        }
        return await redis.set(key, value, ...args);
    },

    // DEL
    async del(key: string) {
        if (useMemory) {
            memDel(key);
            return 1;
        }
        return await redis.del(key);
    },

    // EXISTS
    async exists(key: string) {
        if (useMemory) return memExists(key);
        return await redis.exists(key);
    },

    // SADD
    async sadd(key: string, member: string) {
        if (useMemory) {
            memSAdd(key, member);
            return 1;
        }
        return await redis.sadd(key, member);
    },

    // SMEMBERS
    async smembers(key: string): Promise<string[]> {
        if (useMemory) return memSMembers(key);
        return await redis.smembers(key);
    },

    // SREM
    async srem(key: string, member: string) {
        if (useMemory) {
            memSRem(key, member);
            return 1;
        }
        return await redis.srem(key, member);
    },

    // INCR
    async incr(key: string) {
        if (useMemory) {
            const v = (memGet(key) || 0) + 1;
            memSet(key, v);
            return v;
        }
        return await redis.incr(key);
    },

    // MULTI
    multi() {
        if (useMemory) return createMemoryMulti();
        return redis.multi();
    }
};
