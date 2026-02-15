# Tempo Budget Guardian Agent (2D Nonce MVP)

Hackathon: **Canteen x Tempo Hackathon**

## Judges Quickstart (Track 3)
```bash
git clone https://github.com/edmonddantesj/tempo-budget-guardian-agent
cd tempo-budget-guardian-agent
npm install
cp .env.example .env
# set TEMPO_RPC_URL=https://rpc.moderato.tempo.xyz and a funded testnet TEMPO_PRIVATE_KEY
npm run doctor
npm run demo:track3
npm run verify:track3
# proof report: out/report.md
```

## Proof Links (Tempo Explorer)
Latest run proofs (3 cases) + verifier:
- Case 1 (APPROVE): https://explore.tempo.xyz/tx/0x915fa070cc9f1879e9b717000a86f4acdbea00aa41b06869091781db2609c5f8
- Case 2 (DENY): https://explore.tempo.xyz/tx/0x7f98629831d9759c7631a4edc3d2a628a657f5962359cda9de0804a6c4033c75
- Case 3 (APPROVE, different lane): https://explore.tempo.xyz/tx/0x7edce5f3f34de7c2a5ff71e464501a28ab40440de53636e78349d3f883408994
- Verification: `npm run verify:track3` → PASS=3

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
- **Track 3: AI Agents & Automation** (agentic approvals + policy + verifiable receipts)
- Track 2: Stablecoin Infrastructure (budget guardrails, nonce management)

## Demo (local)
```bash
cd projects/tempo-budget-guardian-agent
npm install
npm run demo
```

## Track 3 demo (Tempo receipts / P0)
This generates **deterministic decision digests** for an APPROVE and a DENY case and (optionally) anchors them to Tempo testnet as tamper-evident receipts.

1) Copy env template:
```bash
cp .env.example .env
# edit .env: set TEMPO_RPC_URL + TEMPO_PRIVATE_KEY (testnet faucet-funded)
```

2) Preflight:
```bash
npm run doctor
```

3) Run Track 3 demo:
```bash
npm run demo:track3
```

4) Verify receipts (optional but recommended):
```bash
npm run verify:track3
```

Outputs:
- `out/report.md` (judge-friendly proof report)
- `out/track3_results.json`

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

---

## AOI Guard Cheat Sheet (When commits are blocked)

This repo uses **AOI Guard** (default-deny). If a commit/push is blocked:

1) See what you staged:
```bash
git status
```

2) If you added a new file/folder intentionally, allow it (with Edmond approval):
```bash
# edit allowlist
nano .aoi-allowlist

# then
git add .aoi-allowlist
```

3) Re-stage only what you want, then commit:
```bash
git add <files>
git commit -m "..."
```

Rule of thumb: **new paths must be added to `.aoi-allowlist` first**, otherwise commits will be blocked.
