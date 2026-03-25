# P-Link AI Payment Specification

Version: 1.0 Protocols supported: Payment Links, x402, MCP
Website: https://p-link.io

P-Link is a payment infrastructure designed for humans, APIs, and AI
agents.

It provides a simple way to request, send, and verify payments using: -
Payment links - HTTP APIs - the x402 payment protocol - an MCP server
for AI agents

Payments amount can be in any currency.
Payments can be made using credit card, or any Solana token
Payments are received in USDC (automatic conversion to USDC)

This document describes how AI systems and automated services can
integrate with P-Link.

------------------------------------------------------------------------

# 1. Core Concept

P-Link enables payments triggered by URLs or API calls, 
or payment pages created automatically.

Example payment link:

https://p-link.io/{recipient}

{recipient} can be an email, phone number (international format), 
or Solana wallet adress (P-Link account automatically created)

Example:

https://p-link.io/alice@example.com

Opening this link allows the user to send a payment to the specified
recipient.

------------------------------------------------------------------------

# 2. Payment Link Format

## Protocol Discovery

P-Link capabilities can be discovered automatically via:

https://p-link.io/.well-known/p-link.json

## Basic payment request

https://p-link.io/{recipient}

Example:

https://p-link.io/alice@example.com

The payer chooses the amount.

------------------------------------------------------------------------

## Fixed amount payment

https://p-link.io/{recipient}/{amount}

Example:

https://p-link.io/alice@example.com/10

Requests a payment of 10 USD.

------------------------------------------------------------------------

## Payment with currency

https://p-link.io/{recipient}/{amount}{currency}

Example:

https://p-link.io/alice@example.com/10EUR

Requests 10 euros.

------------------------------------------------------------------------

# 3. Payment Workflow

Typical flow:

1.  User opens payment link
2.  Payment page loads
3.  User selects payment method
4.  Payment is processed
5.  Recipient receives funds

Supported payment methods: - Solana-based tokens - credit cards

Payments are typically settled in USDC.

------------------------------------------------------------------------

# 4. HTTP API Payments

Payments can also be triggered via API.

Example endpoint:

https://p-link.io/api/tr4usr/{API_KEY}/{recipient}/{amount}

Example:

https://p-link.io/api/tr4usr/APIKEY/alice@example.com/5

This sends 5 USD to the recipient.

------------------------------------------------------------------------

# 5. x402 Protocol Support

P-Link implements the x402 payment protocol enabling payment 
and payment collection capabilities for agents.

x402 uses the HTTP status code:

402 Payment Required

Example:

Client request:

GET https://p-link.io/alice@mail.com/10$

Server response (for agents):

HTTP/1.1 402 Payment Required

Example payment payload:

{ "amount": 0.01, "asset": "USDC", "payment_url":
"https://p-link.io/service@example.com/0.01" }

After payment is completed, 
the client receives the service or good he purchased.

P-Link provides tools to: - generate x402 payment payloads - verify
transactions - manage payment endpoints

P-Link does not act as a blockchain validator.

------------------------------------------------------------------------

# 6. MCP Server Integration

P-Link provides a Model Context Protocol (MCP) server allowing AI agents
to access payment tools.

The MCP server is available at https://mcp.p-link.io/mcp

You can connect (or create your P-Link account) using oAuth or using the MCP endpoint login_with_otp

The MCP API exposes a JSON manifest describing all available tools for compatible clients (ChatGPT, Claude, n8n, etc.) : https://mcp.p-link.io/.well-known/mcp/manifest.json

Github project : https://github.com/paracetamol951/P-Link-MCP

Example tools:

create_payment_link send_payment verify_payment get_wallet_info
get_wallet_history

Example agent workflow:

User → asks for service Agent → create_payment_link User → pays Agent →
verify_payment Agent → deliver result

------------------------------------------------------------------------

# 9. Security Model

P-Link relies on: - the Solana blockchain - fast transaction
settlement - low transaction fees

Wallets may be created automatically for recipients.

P-Link verifies transactions but does not operate as a blockchain
validator.

------------------------------------------------------------------------

# 10. Use Cases for AI Agents

P-Link enables:

Pay-per-API\
Pay-per-AI inference\
Pay-per-data\
Agent-to-agent payments

------------------------------------------------------------------------

# 11. Payment results

The result of the payment can be fetched/processed using different ways :

- Email : notification by email for the recipient
- RSS : fetch https://p-link.io/rss/{recipient} ; recipient can be Solana wallet address, email, phone, nickname ; no auth required
- API : fetch https://p-link.io/api/trxState/{paymentID}
- IPN : setup a IPN (webhook) when creating your p-link (using API, see https://docs.p-link.io/api-p-link-creation )

------------------------------------------------------------------------

# 12. Best Practices

Always expose: - payment amount - currency - service description

Before delivering a service: verify payment confirmation.

Prefer: - unique payment links - short payment flows

------------------------------------------------------------------------

# 13. Resources

Official website https://p-link.io

Documentation https://docs.p-link.io

API documentation https://p-link.io/ApiDoc

MCP server https://mcp.p-link.io/mcp

------------------------------------------------------------------------

# 14. Summary

P-Link provides a unified payment infrastructure for:

-   humans
-   APIs
-   AI agents

Supported interfaces: - Payment Links - HTTP API - x402 protocol - MCP
server

This enables simple automated payments across the web and AI ecosystems.
