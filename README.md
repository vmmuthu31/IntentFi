# IntentFi - Express Intent. Lend Smarter. Borrow Better. Earn More.

![cover323](https://github.com/user-attachments/assets/a7184004-77ac-4f29-8419-fc45ce012abc)


## 🚀 Overview
Most “AI intent” projects stop at simple swaps or token transfers — acting as surface-level wrappers over existing DeFi tools. **IntentFi goes deeper.** We've built an execution-first, open-intent protocol that automates the most valuable parts of DeFi: **lending, borrowing, and yield strategies** — across chains, without gas, code, or coordination.

IntentFi transforms natural language into real, executable, cross-chain DeFi strategies. Powered by AI, account abstraction, and a modular strategy engine, users can express intents like _“Lend USDC at best APY”_ or _“Borrow ETH if rates drop”_ — and IntentFi handles bridging, routing, optimizing, and deploying, completely gasless and KYC-compliant.

> We don’t just interpret your intent — we execute it.

---

## 🎯 Problem
Despite billions in DeFi TVL, the majority of users are left behind due to:
- Overwhelming complexity
- Fragmented protocols and capital
- Chain-specific UIs and KYC hurdles
- Gas fees and manual bridging

**Existing intent protocols stop at swaps or simulations.** They lack depth, composability, and true execution.

---

## 🧠 Solution: Intent-Driven DeFi Automation
IntentFi allows users to define financial goals in natural language, such as:
- `"Lend USDC at best yield across chains"`
- `"Borrow ETH if interest rate is below 3%"`
- `"Move capital into safer vaults if APY drops"`

Our AI parses the input and builds an **executable DAG (Directed Acyclic Graph)** of DeFi actions like bridging, staking, borrowing, and exiting. All flows are:
- ✅ Gasless via Paymaster + Account Abstraction
- ✅ Compliant via Self Protocol KYC
- ✅ Routed across chains with Hyperlane & CCTP

---

## 🔧 How It Works

![image](https://github.com/user-attachments/assets/300b1518-1211-43b6-851b-068f6888634a)

1. **User Input:** `"Lend USDC at best APY, borrow ETH if rates drop"`
2. **AI Parsing:** Natural language is parsed into a DAG of intent blocks
3. **Strategy Builder:** Flow created with yield/borrow/exit conditions
4. **Execution:** Gasless, cross-chain bridging + protocol interaction
5. **Monitoring:** Auto-yield rebalancing + risk triggers activated

---

## 🔐 Core Features

- **Lending, Borrowing & Yielding via Intent**  
  Users can execute full-stack DeFi strategies by simply stating their goals in plain English. Whether it’s lending USDC, borrowing against BTC, or compounding yields — IntentFi handles it all automatically across chains.

- **Visual No-Code Builder**  
  A drag-and-drop UI allows users to design, preview, and customize DeFi strategies without writing a single line of code. This opens up powerful financial tools to non-technical users and institutions alike.

- **Live Strategy Optimization**  
  IntentFi constantly monitors APY, gas prices, and risk factors. It automatically rebalances, exits, or reroutes strategies based on real-time data — ensuring users always get optimal results.

- **One-Time KYC for All Chains**  
  Integrated with Self Protocol, IntentFi enables a single KYC verification that unlocks usage across all supported chains and strategies — ensuring regulatory readiness without repeated friction.

- **Cross-Chain Routing & Fallbacks**  
  Powered by Hyperlane and Circle CCTP, IntentFi bridges, swaps, and deploys capital across multiple chains. With built-in fallback logic, strategies remain robust even if one chain or protocol fails.


---

## 🌍 Use Cases

| Persona            | Intent Example                                  |
|--------------------|--------------------------------------------------|
| DeFi Explorer      | `Lend my USDC for highest APY across chains`     |
| Investor           | `Buy ETH every Friday if RSI < 40`               |
| Portfolio Manager  | `Rebalance to 60/40 stable/degen`                |
| DAO Treasury       | `Deploy idle funds with risk score < 3`          |

---

## 🧩 What Sets Us Apart

- **IntentFi goes beyond swaps — it unlocks DeFi’s real power**  
  Most “intent” platforms stop at simple token movements. We go deep — enabling users to lend, borrow, and compound yields across chains with just one sentence.

- **AI that actually executes, not just simulates**  
  Our LLM-powered engine turns natural language into live, executable DAGs (Directed Acyclic Graphs) — orchestrating real DeFi actions like bridging, lending, vaulting, exiting, and more.

- **Self-healing, risk-aware strategy automation**  
  Strategies don’t just run — they adapt. IntentFi constantly re-optimizes based on APY shifts, gas spikes, protocol risks, and user-defined triggers. It’s autopilot with an IQ.

- **Fully gasless, fully compliant — out of the box**  
  Every action is abstracted behind account abstraction and Paymaster tech. One-time KYC via Self Protocol ensures users can launch compliant strategies globally, without breaking flow.

- **Open-ended, not pre-packaged**  
  Forget rigid templates. Users define *what* they want — the system figures out *how*. That means infinite, composable intents instead of locked recipes.


---

## 🤝 Bounty Integrations

### 🌱 Self Protocol
- **Why:** One-time, privacy-preserving KYC for compliant DeFi
- **How We Used It:**
  - Enabled one-time KYC verification using Self Protocol’s decentralized identity layer. Issued verifiable credentials to users, allowing them to execute lending, borrowing, and yield strategies across chains without repeating compliance steps.
- **Impact:** Seamless compliance integration across all intents — unlocking secure, gasless, and institution-ready DeFi execution.

### ₿ Rootstock (RSK)
- **Why:** Native Bitcoin-based DeFi
- **How We Used It:**
  - Enabled BTC-backed borrowing and lending using RSK's ecosystem.
  - IntentFi automatically bridges assets to Rootstock and interacts with lending protocols.
- **Impact:** First BTC-native intent automation in DeFi.

### 🌍 Celo
- **Why:** Mobile-first, low-fee, eco-friendly DeFi
- **How We Used It:**
  - Deployed auto-yield strategies for Celo-based stablecoins.
  - Integrated Paymaster on Celo for full gasless UX.
- **Impact:** Mobile users can now launch DeFi strategies using only natural language — no wallet switching.

---

## 🔮 Vision
IntentFi aims to become the operating system for intent-driven finance — where users don’t manage DeFi manually, but define what they want and let the system execute it across chains, protocols, and risk layers.

We're building DeFi for the next billion users — by making it invisible.

---
## Deployed Contract

###CELO

PriceOracle: https://alfajores.celoscan.io/address/0x308b659C3B437cFB4F54573E9C3C03acEb8B5205
LendingPool: https://alfajores.celoscan.io/address/0x884184a9aFb1B8f44fAd1C74a63B739A7c82801D
YieldFarm: https://alfajores.celoscan.io/address/0xa2AE5cB0B0E23f710887BE2676F1381fb9e4fe44
DeFIPlatform: https://alfajores.celoscan.io/address/0x649f3f2F4aB598272f2796401968ed74CBeA948c
Identity Verifier: https://alfajores.celoscan.io/address/0x0c5c95131F3D573330d81Ab811B2eD15F9fe98a9
KYC LENDING POOL: https://alfajores.celoscan.io/address/0x015F0eC2A28684E3d4CdbC0FcE60607c4842f211

###ROOTSTOCK

PriceOracle: https://explorer.testnet.rootstock.io/address/0xc6C9FE196408c0Ade5F394d930cF90Ebab66511e
LendingPool: https://explorer.testnet.rootstock.io/address/0x60b588582b8308b9b41966fBd38821F31AA06537
YieldFarming: https://explorer.testnet.rootstock.io/address/0x2B65Eba61bac37Ae872bEFf9d1932129B0ed24ee
DeFIPlatform: https://explorer.testnet.rootstock.io/address/0x653c13Fb7C1E5d855448af2A385F2D97a623384E
RBTC Token address: https://explorer.testnet.rootstock.io/address/0x86E47CBf56d01C842AC036A56C8ea2fE0168a2D1


---

## 🛠 Tech Stack

### ✅ Core Layers
- **Intent Parsing:** LLM-powered agent
- **Automation:** Auto-yield monitoring, rebalancing, exit triggers
- **Gasless UX:** Paymaster
- **Compliance:** Self Protocol
- **Frontend:** Next.js + Tailwind
- **Backend:** Node.js + Firebase

---

## 🙌 Contributors
- Frontend Engineering: Vairamuthu
- Solidity Dev - Thirumurugan
- Design, and Research - Prashant  
- Integragtion Dev - Deepak
- Partner Protocols: Saga, Rootstock, Celo, Hyperlane, Self Protocol, Zircuit, Circle

---

## 📬 Contact
For demos, integration requests, or questions:  
- **Website:** https://intentfi.vercel.app\
- Built in EthTaipei <3

