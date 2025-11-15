import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {  resolveAuth } from '../context.js';
import { currencyZOD, getAPIuser,  structData, wrapResult } from '../support/toolsData.js';
import { BASE } from '../support/http.js';
const emailZod = z.string().email();
const phoneZod = z.string().regex(/^\+?[0-9]{6,15}$/, "Invalid phone number").describe("Phone number (00XX format)");
const solAddressZod = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana address").describe("Solana wallet address");
const recipientZod = z.union([emailZod, phoneZod, solAddressZod]).describe(
    "Email, phone number or wallet address"
);
const toZod = z.union([
    recipientZod,
    z.array(recipientZod).nonempty()
]).describe("One or multiple recipients");


export const getSendMoneyShape = {
    to: toZod,
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
/*export const getGetUserShape = {
    API_KEY: z.string().describe("API_KEY of the account you want to see. If not provided, shows details about the currently connected account"),
};*/
export const getGetWalletInfosShape = {
    pubk: z.string().optional().describe("The Solana address of the wallet you want to see, if not provided, uses the currently connected user wallet address.")
};
export const getGetTrxStateShape = {
    trxID: z.string().optional().describe("The transaction ID")
};
export const getWalletHistoryShape = {
    walletAddress: z.string().optional().describe("The Solana address of the wallet you want to see, if not provided, uses the currently connected user wallet address.")
};

export async function send_money(args: any) {
    const { to, amount, currency, title } = args;

    const { apiKey } = resolveAuth(undefined, undefined);

    var jsP = {
        myKey: apiKey,
        to:'',
        amount,
        currencyUsed: currency,
        title,
        destList:null
    }
    if (typeof to == "string") jsP.to = to;
    else {
        jsP.to = to[0];
        jsP.destList = to.join(';');
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
export async function request_payment_link(reqBody: any) {
    if (reqBody.title) {
        reqBody.title = reqBody.title.split('\u20AC').join('euro');
    }
    if (!reqBody.receivingPayment) {
        const { apiKey } = resolveAuth(undefined, undefined);

        var result = await getAPIuser(apiKey);
        if (result.pubk) reqBody.receivingPayment = result.pubk;

        if (result.error) {
            throw new Error(result.error);
        }
    }
    if (!reqBody.receivingPayment) {
        throw new Error('receivingPayment parameter required');
    }
    var req = await fetch(BASE + '/api/createPLink', {
        method: 'POST',
        body: JSON.stringify(reqBody)
    });
    var plink_Info = await req.json();

    return plink_Info;
}
export async function get_my_wallet_info(reqBody: any) {
    var pubk = '';
    var result = {error:'Not found'} as any
    if (reqBody.pubk) {
        pubk = reqBody.pubk;
        result = { pubk }
    } else {
        const { apiKey } = resolveAuth(undefined, undefined);
        var jsP = {
            myKey: apiKey
        }
        const fet = await fetch(BASE + '/api/getAPIUser', {
            method: 'POST',
            headers: {
                Accept: 'application.json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsP)
        });
        var dat = await fet.text();


        result = JSON.parse(dat);

        pubk = result.pubk;
    }
    if (pubk) {
        const walletInfos = await fetch(BASE + '/api/walletInfos/' + pubk + '/1/'+(new Date().getTime()), {
            method: 'POST',
            body: JSON.stringify(reqBody)
        });
        const walletBalance = await walletInfos.json();
        result = { ...result, ...walletBalance };
        return result;
    }
    throw Error("Invalid API_KEY");
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

export const send_money_title = "Send money to an email, Solana wallet or phone number. The provided email or phone can be used to claim the money of the wallet. If new user does not claim for 3 days, the money is returned to the sender.";
export const request_payment_link_title = "Create a payment link in order to request a payment to your account. This payment link can be used to pay you. Payment can be made using a credit card, or any Solana token (";
export const get_my_wallet_info_title = "Retrieve the wallet infos about the connected P-Link account (Solana wallet address, wallet balance, tokens detail)";
export const get_transaction_state_title = "Retrieve the state and details of a transaction using Solana trx ID";
export const get_wallet_history_title = "Transaction history : Retrieve list of the transactions related to the specified Solana wallet address (received and sent funds with dates)";

export function registerPaymentsTools(server: McpServer) {

    server.registerTool(
        'send_money',
        {
            title: send_money_title,
            description: send_money_title,
            inputSchema: getSendMoneyShape, 
            annotations: { title: send_money_title, destructiveHint: true, openWorldHint: true }
        },
        async (e) => await wrapResult(send_money,e)
    );

    server.registerTool(
        'request_payment_link',
        {
            title: request_payment_link_title,
            description: request_payment_link_title,
            inputSchema: getCreatePLinkShape, 
            annotations: { title: request_payment_link_title, readOnlyHint: true }
        },
        async (e) => await wrapResult(request_payment_link, e)
    );
    server.registerTool(
        'get_wallet_info',
        {
            title: get_my_wallet_info_title,
            description: get_my_wallet_info_title,
            inputSchema: getGetWalletInfosShape, 
            annotations: { title: get_my_wallet_info_title, readOnlyHint: true }
        },
        async (e) => await wrapResult(get_my_wallet_info, e)
    );
        
    server.registerTool(
        'get_transaction_state',
        {
            title: get_transaction_state_title,
            description: get_transaction_state_title,
            inputSchema: getGetTrxStateShape, 
            annotations: { title: get_transaction_state_title,readOnlyHint: true }
        },
        async (e) => await wrapResult(get_transaction_state, e)
    );
    
    server.registerTool(
        'get_wallet_history',
        {
            title: get_wallet_history_title,
            description: get_wallet_history_title,
            inputSchema: getWalletHistoryShape, 
            annotations: { title: get_wallet_history_title, readOnlyHint: true }
        },
        async (e) => await wrapResult(get_wallet_history, e)
    );
}