// src/tools/auth.ts (ajout)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, } from 'zod';

import {  resolveAuth, setSessionAuth } from '../context.js';
import { BASE } from '../support/http.js';
import { getAPIuser, structData, wrapResult } from '../support/toolsData.js';
import { solAddressZod } from './payments.js';

export const CreateAccountInput = {
    email: z.string().email().describe("Email that will be associated with the wallet. This email can claim the funds on the wallet.")
};
export const AuthInput = {
    API_KEY: z.string().describe("API_KEY in order to access your account. You can receive your temporary API_KEY by email or get it on https://p-link.io")
} ;
export const otpInput = {
    email: z.string().email().describe("Email of your account."),
    otp: z.string().describe("otp in order to access your account. You can receive your one time password by email usgin this MCP server tools or get it on https://p-link.io")
};
export const getFundWalletShape = {
    amount: z.number().positive().default(10).optional().describe("Amount to fund in your wallet in USD"),
};
export const GetPKInput = {
    solanaWalletAddress: solAddressZod.optional().describe("Solana wallet address"),
};


export const get_PK_title = 'Get the private key of your wallet on secured app https://p-link.io';
export const get_wallet_and_api_key_title = 'Create a wallet for your email or get otp by email';
export const login_with_otp_title = 'Login using otp. Connect to your P-Link wallet using the one time password you received by email';
export const fund_my_wallet_title = 'Fund wallet : Obtain a link in order to fund your wallet of the desired amount using a credit card, or the Solana address of your wallet if you want to fund your account using Solana.';

export async function get_PK(args: any) {
    return { "instructions": "In order to get your private key, you need to connect on https://p-link.io" }
}
export async function get_wallet_and_api_key(args: any)  {
    const { email } = args;

    const resp: any = await fetch(BASE + '/api/getOrCreateApiKey/' + email);
    const res = await resp.json();

    const apiKey = res?.API_KEY ?? null;

    if (res?.error) {
        return {
            content: [{ type: 'text', text: res?.error }],
            is_error: true,
            structuredContent: resp,
        };
    }
    if (!apiKey) {
        return {
            content: [{ type: 'text', text: `API_KEY has been sent by email` }],
            ok: true,
            structuredContent: res,
        };
    }

    setSessionAuth({
        ok: true,
        APIKEY: apiKey,
        scopes: ['*'],
    });

    //ctx.auth = getSessionAuth();
    const resF = {
        result: 'Account created successfully',
        email,
        APIKEY: apiKey
    }
    return resF;
}
export async function login_with_otp(args: any) {
    const { otp, email } = args;

    var jsP = {
        otp,email
    }
    const fet = await fetch(BASE + '/api/consumeotp', {
        method: 'POST',
        headers: {
            Accept: 'application.json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsP)
    });
    var dat = await fet.text();
    process.stderr.write(`[caisse][info] APIuser ${dat}\n`);

    var data = JSON.parse(dat);
    //var data = await getAPIuser(API_KEY);

    if (typeof data === 'object' && data && 'API_KEY' in data && 'pubk' in data) {
        setSessionAuth({
            ok: true,
            APIKEY: data.API_KEY,
            scopes: ['*'],
        });
        return { result: 'Login successfull, otp consumed', publicSolanaWalletAddress: data.pubk }
        //ctx.auth = getSessionAuth();
    } else {
        throw new Error("otp incorrect");
        console.error('Erreur API:', data);
    }
    return data;
}
export async function fund_my_wallet(args: any) {
    const { amount } = args;
    const { apiKey } = resolveAuth(undefined, undefined);

    var data = await getAPIuser(apiKey);

    if (typeof data === 'object' && data && 'pubk' in data) {
        var callParams = {
            transaction_details: {
                source_currency: "usd",
                exchange_amount_in_USD: amount ? amount : 10,
                email: data.email
            },
            myCookie: apiKey,
            pubk: data.pubk
        }
        process.stderr.write(`[caisse][info] fund_my_wallet \n` + JSON.stringify( callParams ) );

        const response = await fetch(
            BASE + "/api/create-onramp-session",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(callParams),
            });
        const onrampData = await response.json();
        const strData = "In order to fund your wallet, you can send Solana to this address : " + data.pubk + " or if you want to use a credit card to fund your account, open this link : " + onrampData?.onrampSession?.redirect_url;

        return {
            result: strData,
            solanaWalletAddress: data.pubk,
            fundWalletLink: onrampData?.onrampSession?.redirect_url
        };

    } else {
        return { error: "User not found" };
    }
}


export function registerAuthTool(server: McpServer) {

    server.registerTool(
        'get_wallet_and_otp',
        {
            title: get_wallet_and_api_key_title,
            description: get_wallet_and_api_key_title,
            inputSchema: CreateAccountInput,
            annotations: { title: get_wallet_and_api_key_title, readOnlyHint: true }
        },
        async (e) => await wrapResult(get_wallet_and_api_key, e)
    );
    server.registerTool(
        'login_with_otp',
        {
            title: login_with_otp_title,
            description: login_with_otp_title,
            inputSchema: otpInput, // shape
            annotations: { title: login_with_otp_title, readOnlyHint: true }
        },
        async (e) => await wrapResult(login_with_otp, e)
    );
    server.registerTool(
        'fund_my_wallet',
        {
            title: fund_my_wallet_title,
            description: fund_my_wallet_title,
            inputSchema: getFundWalletShape, // shape
            annotations: { title: fund_my_wallet_title, readOnlyHint: true }
        },
        async (e) => await wrapResult(fund_my_wallet, e)
    );
    server.registerTool(
        'get_private_key_of_wallet',
        {
            title: get_PK_title,
            description: get_PK_title,
            inputSchema: GetPKInput, // shape
            annotations: { title: get_PK_title, readOnlyHint: true }
        },
        async (e) => await wrapResult(get_PK, e)
    );
    
}
