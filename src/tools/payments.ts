import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {  resolveAuth } from '../context.js';
import { currencyZOD, getAPIuser,  structData } from '../support/toolsData.js';
import { BASE } from '../support/http.js';

export const getSendMoneyShape = {
    to: z.string().describe("Email, phone or Solana wallet"),
    amount: z.number().positive().describe("Amount to send"),
    currency: currencyZOD.describe("Currency of specified amount to send"),
    title: z.string().optional().describe("A title for the transaction shown to the receiver")
};
export const getCreatePLinkShape = {
    receivingPayment: z.string().optional().describe("Email, phone or Solana wallet of the recipient of the payment"),
    amount: z.number().positive().describe("Amount to request"),
    currency: currencyZOD.describe("Currency of specified amount to request"),
    title: z.string().optional().describe("A title for the payment shown to the payer"),
    description: z.string().optional().describe("A description, shown in the payment page"),
    returnOKURL: z.string().optional().describe("Optional : URL to redirect the client to after successfull payment"),
    returnURL: z.string().optional().describe("Optional : URL to redirect the client to after failed payment"),
    logo: z.string().optional().describe("Optional : URL to an image displayed in payment page"),
    param: z.string().optional().describe("Custom parameter"),
    webhook: z.string().optional().describe("HTTP webhook to call on payment success"),
    notificationEmail: z.string().optional().describe("Email to notify on payment success")
};
export const getGetUserShape = {};
export const getGetTrxStateShape = {
    trxID: z.string().optional().describe("The transaction ID")
};
export const getWalletHistoryShape = {
    walletAddress: z.string().optional().describe("The wallet address")
};

export async function send_money(args: any) {
    const { to, amount, currency, title } = args;

    const { apiKey } = resolveAuth(undefined, undefined);

    var jsP = {
        myKey: apiKey,
        to,
        amount,
        currencyUsed: currency,
        title
    }
    const fet = await fetch(BASE + '/api/tr4usr', {
        method: 'POST',
        headers: {
            Accept: 'application.json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsP)
    });
    var dat = await fet.text();
    process.stderr.write(`[caisse][info] dat ${dat}\n`);
    //console.log(dat);
    var result = JSON.parse(dat);
    return result;
}
export async function request_payment_link(args: any) {
    const { reqBody } = args;
    if (reqBody.title) {
        reqBody.title = reqBody.title.split('\u20AC').join('euro');
    }
    if (!reqBody.receivingPayment) {
        const { apiKey } = resolveAuth(undefined, undefined);

        var result = await getAPIuser(apiKey);
        if (result.pubk) reqBody.receivingPayment = result.pubk;

        if (result.error) {
            return structData(result);
        }
    }
    if (!reqBody.receivingPayment) {
        return structData({
            error: 'receivingPayment parameter required'
        });
    }
    var req = await fetch(BASE + '/api/createPLink', {
        method: 'POST',
        body: JSON.stringify(reqBody)
    });
    var plink_Info = await req.json();

    return plink_Info;
}
export async function get_my_wallet_info() {
    const { apiKey } = resolveAuth(undefined, undefined);
    var jsP = {
        myKey: apiKey
    }
    process.stderr.write(`[caisse][info] XapiKey ${apiKey}\n`);
    const fet = await fetch(BASE + '/api/getAPIUser', {
        method: 'POST',
        headers: {
            Accept: 'application.json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsP)
    });
    var dat = await fet.text();
    process.stderr.write(`[caisse][info] dat2 ${dat}\n`);

    var result = JSON.parse(dat);

    if (result?.pubk) {
        process.stderr.write(`[caisse][info] fetch wallet infos\n`);
        const walletInfos = await fetch(BASE + '/api/walletInfos/' + result.pubk + '/1');
        const walletBalance = await walletInfos.json();
        result = { ...result, ...walletBalance };
    }
    return result;
}
export async function get_transaction_state(args: any) {
    const { trxID } = args;
    const fet = await fetch(BASE + '/api/trxState/' + trxID + '/' + new Date().getTime());
    var dat = await fet.text();
    process.stderr.write(`[caisse][info] dat2 ${dat}\n`);

    var result = JSON.parse(dat);
    return result;
}
export async function get_wallet_history(args: any) {
    const { walletAddress } = args;
    const fet = await fetch(BASE + '/api/walletHistory/' + walletAddress + '/' + new Date().getTime());
    var dat = await fet.text();
    process.stderr.write(`[caisse][info] dat2 ${dat}\n`);

    var result = JSON.parse(dat);
    return result;
}

export const send_money_title = "Send money to an email, Solana wallet or phone number.";
export const request_payment_link_title = "Create a payment link in order to request a payment to your account";
export const get_my_wallet_info_title = "Retrieve the wallet infos about the connected P-Link account (Solana wallet address, wallet balance)";
export const get_transaction_state_title = "Retrieve the state and details of a transaction using Solana trx ID";
export const get_wallet_history_title = "Transaction history : Retrieve list of the transactions related to the specified Solana wallet address";

export function registerPaymentsTools(server: McpServer) {

    server.registerTool(
        'send_money',
        {
            title: send_money_title,
            description: send_money_title,
            inputSchema: getSendMoneyShape, // ZodRawShape,
            annotations: { title: send_money_title, destructiveHint: true, openWorldHint: true }
        },
        async ({ to, amount, currency, title }) => {
            const result = send_money({ to, amount, currency, title })
            return structData(result) as any;
        }
    );

    server.registerTool(
        'request_payment_link',
        {
            title: request_payment_link_title,
            description: request_payment_link_title,
            inputSchema: getCreatePLinkShape, // ZodRawShape,
            annotations: { title: request_payment_link_title, readOnlyHint: true }
        },
        async (reqBody) => {
            const result = request_payment_link(reqBody)
            return structData(result) as any;
        }
    );
        
    server.registerTool(
        'get_my_wallet_info',
        {
            title: get_my_wallet_info_title,
            description: get_my_wallet_info_title,
            inputSchema: getGetUserShape, // ZodRawShape,
            annotations: { title: get_my_wallet_info_title, readOnlyHint: true }
        },
        async (reqBody) => {

            const result = get_my_wallet_info()
            return structData(result) as any;
        }
    );
        
    server.registerTool(
        'get_transaction_state',
        {
            title: get_transaction_state_title,
            description: get_transaction_state_title,
            inputSchema: getGetTrxStateShape, // ZodRawShape,
            annotations: { title: get_transaction_state_title,readOnlyHint: true }
        },
        async ({ trxID }) => {
            const result = get_transaction_state({ trxID })
            return structData(result) as any;
        }
    );
    
    server.registerTool(
        'get_wallet_history',
        {
            title: get_wallet_history_title,
            description: get_wallet_history_title,
            inputSchema: getWalletHistoryShape, // ZodRawShape,
            annotations: { title: get_wallet_history_title, readOnlyHint: true }
        },
        async (param) => {
            const result = get_wallet_history(param)
            return structData(result) as any;
        }
    );
}