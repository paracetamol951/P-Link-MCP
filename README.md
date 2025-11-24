# 🧾 P-Link.io MCP Server

[![smithery badge](https://smithery.ai/badge/@paracetamol951/p-link-mcp)](https://smithery.ai/server/@paracetamol951/p-link-mcp)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Demo video](https://img.shields.io/badge/Demo-online-brightgreen.svg)](https://smithery.ai/chat?mcp=@paracetamol951/p-link-mcp)
[![GitHub Stars](https://img.shields.io/github/stars/paracetamol951/P-Link-MCP?style=social)](https://github.com/paracetamol951/P-Link-MCP/stargazers)

[![P-Link MCP and 402](https://github.com/paracetamol951/P-Link-MCP/blob/main/P-Link_MCP.png)](https://youtu.be/sw9ASYZHEzY)

**P-Link MCP Server** is a server compliant with the **MCP (Model Context Protocol)**, integrating fetch-402 client from coinbase, and HTTP 402 protocol on server side, allowing ChatGPT, Claude, and other MCP-compatible clients to connect to a **payment system** on Solana.

It provides a simple interface to:
- Pay 402 links  
- Create 402 payment links (supporting agent payment on Solana and human payment by card, Solana wallet, or P-Link account) 
- Send money to any email or phone number  
- View transaction history
- View wallet information (balance, public wallet address)


> 🟢 Live Server: [https://mcp.p-link.io](https://mcp.p-link.io)

> 🟢 Live Demo: [https://smithery.ai/chat?mcp=@paracetamol951/p-link-mcp](https://smithery.ai/chat?mcp=@paracetamol951/p-link-mcp)

[![P-Link MCP and 402](https://github.com/paracetamol951/P-Link-MCP/blob/main/doc/PresentationVideoThumb.jpg)](https://youtu.be/sw9ASYZHEzY)

---

**Connect your Solana wallet to ChatGPT, Claude, or n8n — and manage your purchases simply by talking.**

This project exposes the **p-link.io** API as **Model Context Protocol (MCP)** tools, available over **HTTP (Streamable)** and/or **STDIO**.

---

## 🚀 Features

- **send_money**: Send an amount of money to a wallet, an email, or a phone number. Can be any email or phone number. If the user has no P-Link account, an account is created for him and the access is emailed or sent by phone. If the user already has a P-Link account, the wallet is reused. **If the account is not claimed within 3 days, the funds are returned to the sender.**
- **request_payment_link** : Create a payment link in order to be paid the desired amount, you can also provide a webhook that will be called on payment success, or a notification email address, or customize the payment page using the parameters. The payment link obtained complies to the HTTP 402 specification, which means AI can pay for the ressource protected by this link. Payment can be made using any Solana token, and get converted to USDC during the transaction. Humans can pay by card. Payment hook can be easily connected to automation tools (IFTTT, Framer, etc).
- **get_wallet_info** : Get information about your wallet (balance, public address, etc)
- **get_wallet_history** : Retrieve list of the transactions related to my Solana wallet
- **pay_and_get_402_protected_url** : Pay a HTTP 402 protected URL, and returns the protected result. The assistant will use your wallet in order to pay for the requested ressource.
- **get_wallet_and_otp** : Create wallet for this email and get otp
- **login_with_otp** : Login using otp
- **fund_my_wallet** : Get the different ways in order to fund your wallet : Sending Solana cryptocurrency to the specified Solana public wallet address, or use a the provided link in order to fund your account using a credit card (provided by Stripe).
- **get_private_key_of_wallet** : Get the private key of your wallet. First call this tool with no otp and the server will send you an OPT to provide to this tool.

---

## 🔹 Example usage (ChatGPT / Claude MCP)

- 💬 "Hi ! What is the balance of my wallet ?"  
- 💬 "Can you buy the shoes i like at : https://p-link.io/@phh/0.01?PRODUCT=My_Favorite_shoes&id=888"  
- 💬 "Send 0.2$ to @Paracetamol"  
- 💬 "Send 0.2$ to s.smith@mail.com"  
- 💬 "Can you check the status of this transaction ?"  
- 💬 "Create a payment link of 10 euros"  
- 💬 "Show me my transaction history"  
- 💬 "Pay for this P-Link my friend sent me : https://p-link.io/@Paracetamol/0.1"  

---

## ⚙Prerequisities

There are no prerequisities, using the MCP server, you can call the tool **get_wallet_and_otp** in order to create a wallet associated with your email address, and login with it.
Then if you want to send funds, you can use the tool **fund_my_wallet** that will give you the instructions to fund your wallet using a Solana wallet or a credit card.

If you already have a P-Link account, you can specify the API_KEY parameter, if you want to create your account with your assistant, just leave this parameter.
In the software, you can get your APIKEY in API, Send money page : https://p-link.io/ApiDoc/Send

---

## ⚙️ Installation

### Claude

#### Minimum installation

Edit the file `claude_desktop_config.json` in your Claude Desktop configuration directory:

Windows
```
%APPDATA%\Claude\claude_desktop_config.json
```

Mac OS
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

Provide the following content after replacing your SHOPID and APIKEY.

```json
  {
  "mcpServers": {
    "plink": {
      "command": "npx",
      "args": [
        "plink-mcp-server",
        "--apikey=[replaceWithYourAPIKEY]"
      ]
    }
  }
}
```


### ChatGPT

> Requires a workspace account

In **Settings → Connectors → Create Connector**, fill in the following:

| Variable | Value |
|-----------|--------|
| `Name` | `P-Link` |
| `Description` | `Can process payments, send money, request payment` |
| `MCP Server URL` | `https://mcp.p-link.io/mcp` |
| `Authentication` | `oAuth` |

Once added, the connector will be **available in new conversations**.


### Other MCP clients

#### Stdio Install

##### Via npx

Create an installation folder and run the following command in your shell:

```bash
npx plink-mcp-server --apikey=abcdef123456
```

##### Via npm

```bash
# Dependencies
git clone https://github.com/paracetamol951/P-Link-MCP.git

# Dependencies
npm install

# Environment variables (see below)

# Build
npm run build
```


#### HTTP Install

🐳 Run the MCP server in HTTP mode with Docker:

```bash
docker compose up
```

---

### Environment variables

| Variable | Default | Description |
|-----------|----------|-------------|
| `APIKEY` | `----` | Required: your API key |

Create a `.env` file:

```env
APIKEY=XXXXXXXXXXXXXX
```

---

## 💻 Compatible Clients examples

- **ChatGPT (OpenAI)** — via external MCP configuration  
- **Claude (Anthropic)** — via "Tools manifest URL"  
- **n8n / Flowise / LangChain** — import via public URL 
- You are welcome to complete !

---

## Demo video

[![Demo video](https://github.com/paracetamol951/P-Link-MCP/blob/main/doc/DemoThumb.jpg)](https://youtu.be/MTsc_nKiofw)

---

## 🧩 MCP Manifest Endpoint

The MCP API exposes a JSON manifest describing all available tools for compatible clients (ChatGPT, Claude, n8n, etc.) :
https://mcp.p-link.io/.well-known/mcp/manifest.json

---

## 📋 License

© 2025. GNU GENERAL PUBLIC LICENSE
```
