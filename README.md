# Tempo Budget Guardian Agent (2D Nonce MVP)

Hackathon: **Canteen x Tempo Hackathon**

## One-line
An **agentic policy layer** that approves/denies payment intents under a daily/category budget, while producing **parallel-safe 2D nonce suggestions** (lane + sequence) for Tempo-style workflows.

## Problem
Stablecoin apps and agentic automations need to execute many payments quickly. Without guardrails, you get:
- overspending (budget drift)
- unsafe actions (wrong merchant/action)
- concurrency bugs when multiple payments are prepared in parallel

## Solution
This MVP simulates a **Budget Guardian Agent**:
- Evaluates each payment intent against a policy (daily budget + category caps + blocked merchants)
- Assigns a **2D nonce** (`lane`, `seq`) to each intent so parallel flows remain ordered per lane
- Writes an auditable ledger of approved intents
- **(Agentic UX)** Can generate a policy file from natural language (lightweight parser)

> Integration with Tempo signing/RPC can be added; this MVP focuses on core logic + auditability.

## Tracks fit
- **AI Agents & Automation** (agentic approvals + policy)
- Stablecoin Infrastructure (budget guardrails, nonce management)

## Demo (local)
```bash
cd projects/tempo-budget-guardian-agent
npm run demo
```

## Natural-language policy (agentic UX)
Generate `policy.json` from a short instruction:
```bash
cd projects/tempo-budget-guardian-agent
node src/policy_from_text.js --text "daily 15, food 12, transport 10, block scam-mart" --out policy.json
# or Korean-ish
node src/policy_from_text.js --text "오늘 예산 15, food 12, transport 10, scam-mart 금지" --out policy.json
```
Then run with it:
```bash
POLICY=policy.json LEDGER=ledger.example.json INTENTS=intents.example.json node src/guardian.js
```

### Demo (slower, for screen recording)
```bash
cd projects/tempo-budget-guardian-agent
DEMO_DELAY_MS=800 npm run demo
```

## Repo structure
- `src/guardian.js` — core logic
- `policy.example.json` — sample policy
- `intents.example.json` — sample intents
- `ledger.example.json` — ledger output

## License
MIT
