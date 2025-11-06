import 'dotenv/config';

let AUTH_OK = false;

export function resetAuth() {
  AUTH_OK = false;
}

export function isAuthorizedToken(raw?: string): boolean {
  if (!raw) return false;
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  const token = m?.[1] ?? raw; // accepte "Bearer XXX" ou juste "XXX" (pratique en dev)
  const allowed = (process.env.MCP_TOKENS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return allowed.includes(token);
}

export function markAuthed() { AUTH_OK = true; }
export function isAuthed() { return AUTH_OK; }

export function unauthorized(message = 'Unauthorized') {
  const err: any = new Error(message);
  err.code = -32001; // code JSON-RPC custom
  return err;
}

/**
 * Intercepte registerTool pour exiger un login avant tout appel (sauf whitelist).
 */
export function enforceAuthOnTools(server: any, whitelist: string[] = ['auth.login']) {
  const original = server.registerTool.bind(server);

  server.registerTool = (name: string, meta: any, handler: Function) => {
    const guarded = async (input: any, ...rest: any[]) => {
      if (!whitelist.includes(name) && !isAuthed()) {
        throw unauthorized('Login required (call auth.login first)');
      }
      return handler(input, ...rest);
    };
    return original(name, meta, guarded);
  };
}
