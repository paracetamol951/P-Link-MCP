
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const serverJsonInfos = {
    name: 'P-link',
    version: '0.9.1',
}
export function createPLinkMCPserver() {
    return new McpServer(serverJsonInfos);
}