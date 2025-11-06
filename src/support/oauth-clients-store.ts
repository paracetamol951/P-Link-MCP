import { redis } from './redis.js';

const NS = (process.env.REDIS_NAMESPACE || 'mcp:oauth') + ':clients';

function key(clientId: string) { return `${NS}:${clientId}`; }
function listKey() { return `${NS}:index`; } // set des client_ids

export type OAuthClient = {
    redirect_uris: string[];
    public: true;
};

export async function saveClient(clientId: string, data: OAuthClient) {
    await redis.multi()
        .set(key(clientId), JSON.stringify(data))
        .sadd(listKey(), clientId)
        .exec();
}

export async function getClient(clientId: string): Promise<OAuthClient | undefined> {
    const raw = await redis.get(key(clientId));
    return raw ? JSON.parse(raw) as OAuthClient : undefined;
}

export async function clientExists(clientId: string) {
    return !!(await redis.exists(key(clientId)));
}

export async function listClients(): Promise<string[]> {
    return await redis.smembers(listKey());
}

export async function deleteClient(clientId: string) {
    await redis.multi()
        .del(key(clientId))
        .srem(listKey(), clientId)
        .exec();
}
