# 📘 IntentFi - Express Intent. Lend Smarter. Borrow Better. Earn More.

![cover323](https://github.com/user-attachments/assets/bc11667b-1080-46a6-94a8-1a6b730761f0)


## 🚀 Overview
IntentFi is the first AI-powered, open-intent protocol that turns natural language into real, executable cross-chain DeFi strategies. Built for users, DAOs, and institutions, IntentFi focuses on enabling **yielding, lending, and borrowing** flows using open intents. The protocol provides a fully gasless, compliant, and no-code DeFi experience powered by a modular architecture.

We believe DeFi shouldn’t feel like coding. With IntentFi, users simply say what they want to do — and the system understands, optimizes, and executes their financial goals.

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

### 🌱 Saga
- **Why:** Modular chains with native intent support
- **How We Used It:**
  - Created a dedicated Saga chain to run execution logic and strategy DAG computation in a scalable, low-latency environment.
  - Integrated with Saga's interchain messaging to offload intensive computation from L1.
- **Impact:** Faster strategy execution and gasless coordination.

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

## 🛠 Tech Stack

### ✅ Core Layers
- **Intent Parsing:** LLM-powered agent
- **Automation:** Auto-yield monitoring, rebalancing, exit triggers
- **Gasless UX:** Zircuit AA + Circle Paymaster
- **Compliance:** Self Protocol + HashKey Chain
- **Cross-Chain Infra:** Hyperlane (Open Intents), Circle CCTP
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

