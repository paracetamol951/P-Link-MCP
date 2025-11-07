#!/usr/bin/env node
import fs from "fs";
import path from "path";

// --- Helpers CLI ---
// npx caisse-enregistreuse-mcp-server --shopid=12345 --apikey=abcdef123456


function has(flag: string): boolean {
    return process.argv.includes(flag);
}

function getKV(key: string): string | undefined {
    const arg = process.argv.find(a => a.startsWith(`--${key}=`));
    return arg ? arg.split("=")[1] : undefined;
}

function getEnvFile(): string | undefined {
    const arg = getKV("env");
    if (arg) return arg;
    const defaultPath = path.resolve(process.cwd(), ".env");
    return fs.existsSync(defaultPath) ? defaultPath : undefined;
}

function loadDotenv(filePath?: string) {
    if (!filePath || !fs.existsSync(filePath)) return;
    const envText = fs.readFileSync(filePath, "utf8");
    for (const line of envText.split("\n")) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
        if (match) {
            const [, key, value] = match;
            process.env[key] = value;
        }
    }
}

// --- Main ---
(async () => {
    const mode = has("--http") ? "http" : "stdio";
    const port = Number(getKV("port") || process.env.PORT || 8787);
    const lang = getKV("lang") || process.env.MCP_LANG || "fr";
    const envFile = getEnvFile();

    // variables explicites
    const apiKey = getKV("apikey") || process.env.APIKEY;

    // on charge un éventuel .env ensuite pour ne pas écraser les flags
    loadDotenv(envFile);

    if (apiKey) process.env.APIKEY = apiKey;
    process.env.MCP_LANG = lang;

    if (!process.env.SHOPID || !process.env.APIKEY) {
        console.error("❌ SHOPID et APIKEY doivent être définis via --shopid/--apikey ou .env");
        process.exit(1);
    }

    if (mode === "http") {
        process.env.PORT = String(port);
        console.log(`[MCP] HTTP → port=${port}, langue=${lang}, shop=${process.env.SHOPID}`);
        await import("./index.js");
    } else {
        //console.log(`[MCP] STDIO → langue=${lang}, shop=${process.env.SHOPID}`);
        await import("./stdio.js");
    }
})();
