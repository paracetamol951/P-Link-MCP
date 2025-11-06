import 'dotenv/config';
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.MCP_JWT_SECRET || 'change-me');

export type McpClaims = {
  sub: string;          // user id or email
  shopId?: string;
  scope?: string[];     // e.g., ['sales:read','sales:write']
};

export async function issueMcpToken(claims: McpClaims, ttlSeconds = 3600) {
  const now = Math.floor(Date.now()/1000);
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .setIssuer('caisse-mcp')
    .sign(secret);
}

export async function verifyMcpToken(token: string) {
  const { payload } = await jwtVerify(token, secret, { issuer: 'caisse-mcp' });
  return payload as McpClaims & { exp: number; iat: number };
}
