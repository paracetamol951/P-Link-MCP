#!/usr/bin/env node
import { jsonSchema } from 'ai';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    InitializeRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";
import { auth402_title, pay_and_get_402_protected_url, get402clientShape } from "./tools/402client.js";

import { zodToJsonSchema } from "zod-to-json-schema";
import { get_wallet_and_api_key_title, CreateAccountInput, login_with_api_key, AuthInput, login_with_api_key_title, fund_my_wallet, fund_my_wallet_title, get_wallet_and_api_key } from './tools/auth.js';
import { getGetUserShape, send_money, getSendMoneyShape, send_money_title, request_payment_link, getCreatePLinkShape, request_payment_link_title, get_my_wallet_info, get_my_wallet_info_title, get_transaction_state, getGetTrxStateShape, get_transaction_state_title, get_wallet_history, getWalletHistoryShape, get_wallet_history_title } from './tools/payments.js';

// Tool definitions
const tools: Tool[] = [
    {
        name: "pay_and_get_402_protected_url",
        description: auth402_title,
        inputSchema: jsonSchema(zodToJsonSchema(z.object(get402clientShape))).jsonSchema,
        annotations: { title: 'Pay 402 link', destructiveHint: true, openWorldHint: true }
    },

    {
        name: "get_wallet_and_api_key",
        description: get_wallet_and_api_key_title,
        inputSchema: jsonSchema(zodToJsonSchema(z.object(CreateAccountInput))).jsonSchema,
        annotations: { title: get_wallet_and_api_key_title, readOnlyHint: true }
    },
    /*{
        name: "login_with_api_key",
        description: login_with_api_key_title,
        inputSchema: jsonSchema(zodToJsonSchema(z.object(AuthInput))).jsonSchema,
        annotations: { title: login_with_api_key_title, readOnlyHint: true }
    },
    {
        name: "fund_my_wallet",
        description: fund_my_wallet_title,
        inputSchema: jsonSchema(zodToJsonSchema(z.object(getGetUserShape))).jsonSchema,
        annotations: { title: fund_my_wallet_title, readOnlyHint: true }
    },


    {
        name: "send_money",
        description: send_money_title,
        inputSchema: jsonSchema(zodToJsonSchema(z.object(getSendMoneyShape))).jsonSchema,
        annotations: { title: send_money_title, readOnlyHint: true }
    },
    {
        name: "request_payment_link",
        description: request_payment_link_title,
        inputSchema: jsonSchema(zodToJsonSchema(z.object(getCreatePLinkShape))).jsonSchema,
        annotations: { title: request_payment_link_title, readOnlyHint: true }
    },
    {
        name: "get_my_wallet_info",
        description: get_my_wallet_info_title,
        inputSchema: jsonSchema(zodToJsonSchema(z.object(getGetUserShape))).jsonSchema,
        annotations: { title: get_my_wallet_info_title, readOnlyHint: true }
    },
    {
        name: "get_transaction_state",
        description: get_transaction_state_title,
        inputSchema: jsonSchema(zodToJsonSchema(z.object(getGetTrxStateShape))).jsonSchema,
        annotations: { title: get_transaction_state_title, readOnlyHint: true }
    },
    {
        name: "get_wallet_history",
        description: get_wallet_history_title,
        inputSchema: jsonSchema(zodToJsonSchema(z.object(getWalletHistoryShape))).jsonSchema,
        annotations: { title: get_wallet_history_title, readOnlyHint: true }
    },*/
];


// Main server setup
const server = new Server(
    {
        name: "solana-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Initialize handler - REQUIRED for MCP protocol
server.setRequestHandler(InitializeRequestSchema, async (request) => {
    return {
        protocolVersion: "2024-11-05",
        capabilities: {
            tools: {},
        },
        serverInfo: {
            name: "solana-mcp-server",
            version: "1.0.0",
        },
    };
});

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let result;

        switch (name) {

            case "get_wallet_and_api_key":
                result = await get_wallet_and_api_key(args);
                break;
            case "login_with_api_key":
                result = await login_with_api_key(args);
                break;
            case "fund_my_wallet":
                result = await fund_my_wallet(args);
                break;

            case "send_money":
                result = await send_money(args);
                break;
            case "request_payment_link":
                result = await request_payment_link(args);
                break;
            case "get_my_wallet_info":
                result = await get_my_wallet_info();
                break;
            case "get_transaction_state":
                result = await get_transaction_state(args);
                break;
            case "get_wallet_history":
                result = await get_wallet_history(args);
                break;

            case "pay_and_get_402_protected_url":
                result = await pay_and_get_402_protected_url(args);
                break;

            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});

// Export for Smithery
export default function createServer({ config }: { config?: any }): Server {
    return server;
}

// Start server (for standalone mode)
async function main() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Solana MCP server running on stdio");
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

// Only run standalone if this is the main module (ES modules check)
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('index.js')) {
    main().catch((error) => {
        console.error("Server error:", error);
        process.exit(1);
    });
}