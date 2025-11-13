/**
 * Local Filesystem MCP Server
 * 
 * This server provides tools to explore the local filesystem.
 * To run your server, run "npm run dev"
 *
 * You might find these resources useful:
 *
 * MCP's TypeScript SDK (helps you define your server)
 * https://github.com/modelcontextprotocol/typescript-sdk
 *
 * smithery.yaml (defines user-level config, like settings or API keys)
 * https://smithery.ai/docs/build/project-config/smithery-yaml
 *
 * smithery CLI (run "npx @smithery/cli dev" or explore other commands below)
 * https://smithery.ai/docs/concepts/cli
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from "zod"
import {  registerAuthTool } from "./tools/auth.js"
import { registerPaymentsTools } from './tools/payments.js';
import { register402client } from './tools/402client.js';
import { setSessionAuth } from './context.js';

// Optional: If you have user-level config, define it here
// This should map to the config in your smithery.yaml file
export const configSchema = z.object({
	API_KEY: z
		.string()
		.default('')
		.describe("API_KEY from P-Link.io [optional]"),
})

export default function createServer({
	config,
}: {
	config: z.infer<typeof configSchema>
}) {
	const server = new McpServer({
		name: 'p-link',
		version: '0.0.1',
	});
	if (config?.API_KEY) {

		setSessionAuth({ ok: true, APIKEY: config.API_KEY, scopes: ['*'] });
	}
	registerAuthTool(server);
	registerPaymentsTools(server);
	register402client(server);

	return server.server
}

