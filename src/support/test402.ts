import { wrapFetchWithPayment, decodeXPaymentResponse, Signer, createSigner } from "x402-fetch";



export async function callPaid(url: string, pk: string) {

    const signer = await createSigner("solana-devnet", pk); // uncomment for solana


    const fetchWithPayment = wrapFetchWithPayment(fetch, signer, 100000000n, undefined, {
        svmConfig: {
            rpcUrl: 'https://wiser-fragrant-shadow.solana-mainnet.quiknode.pro/fe548342515a87fdabcfc1be8d04782f2ac34e77/'
        }
    });

    const res = await fetchWithPayment(url, {
        method: "GET",
        headers: {
            "X-PAYER": "4rSvHxNvj26wUyhuhrU1wytVsQNzFsBGS9MFz6tMEGU4"
        },
    });

    const body = await res.json();

    const PRhead = res.headers.get("x-payment-response");

    var paymentResponse = null;
    try {
        paymentResponse = decodeXPaymentResponse(res.headers.get("x-payment-response")!);
    } catch (e) {
        // invalid response
    }
    try {
        if (PRhead) {
            paymentResponse = JSON.parse(PRhead);
        }
    } catch (e) {
        // invalid response
    }
    return {
        acquiredItem:body, paymentResponse
    };
}
