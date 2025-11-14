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

// Tool definitions
const tools: Tool[] = [
    {
        name: "pay_and_get_402_protected_url",
        description: auth402_title,
        inputSchema: jsonSchema(zodToJsonSchema(z.object(get402clientShape))).jsonSchema,
        annotations: { title: 'Pay 402 link', destructiveHint: true, openWorldHint: true }
    },

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
            case "pay_and_get_402_protected_url":
                result = await pay_and_get_402_protected_url(args);
                break;
            /*case "import_wallet":
                result = await handleImportWallet(args);
                break;
            case "list_wallets":
                result = await handleListWallets();
                break;*/
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