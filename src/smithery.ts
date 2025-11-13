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
		"capabilities": {
			"tools": true,
			"resources": false,
			"prompts": false
		},
		"endpoints": [
			{
				"type": "http",
				"url": "https://mcp.p-link.io/mcp",
				"supports_streaming": true
			}
		],
		configSchema: {
			"type": "object",
			"properties": {
				"API_KEY": { "type": "string", "description": "API_KEY of your P-Link.io account" }
			},
			"required": []
		},
		"tools": [
			{
				"name": "get_wallet_and_api_key",
				"description": "Create wallet for this email and get API_KEY"
			},
			{
				"name": "login_with_api_key",
				"description": "Login using API_KEY"
			},
			{
				"name": "fund_my_wallet",
				"description": "Get the different ways in order to fund your wallet"
			},
			{
				"name": "send_money",
				"description": "Send money to an email, Solana wallet or phone number."
			},
			{
				"name": "request_payment_link",
				"description": "Create a payment link in order to request a payment to your account"
			},
			{
				"name": "get_my_wallet_info",
				"description": "Retrieve the wallet infos about the connected P-Link account (Solana wallet address, Balance)"
			},
			{
				"name": "get_transaction_state",
				"description": "Retrieve the state and details of a transaction using Solana trx ID"
			},
			{
				"name": "get_wallet_history",
				"description": "Retrieve list of the transactions related to my Solana wallet"
			},
			{
				"name": "pay_and_get_402_protected_url",
				"description": "Pay a HTTP 402 protected URL using your P-Link managed account, and returns the result"
			}
		]
	});
	if (config?.API_KEY) {
		setSessionAuth({ ok: true, APIKEY: config.API_KEY, scopes: ['*'] });
	}
	registerAuthTool(server);
	registerPaymentsTools(server);
	register402client(server);

	return server.server
}

