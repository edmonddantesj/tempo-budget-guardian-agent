# 60–90s Demo Script (Tempo Budget Guardian Agent)

## Goal
Show: (1) problem, (2) agent policy decisioning, (3) 2D nonce concept, (4) auditability.

## Recording plan (QuickTime recommended)
- Record **terminal only** (clean)
- One take is fine

## Script (voice + terminal)
**0–10s — Hook**
> “Tempo stablecoin apps need safe, parallel payments. This is a Budget Guardian Agent that approves/denies payment intents and outputs 2D nonce suggestions.”

**10–35s — Run the demo**
In terminal:
```bash
cd projects/tempo-budget-guardian-agent
npm run demo
```
Say:
> “Each intent is evaluated against a policy: daily budget, category caps, blocked merchants.”

**35–60s — Point out 2D nonce + ledger**
Scroll output and say:
> “For parallel safety, each intent receives a (lane, seq) 2D nonce suggestion—lane by category, sequence per lane.”
> “Approved intents are written to a ledger for auditability.”

Optionally show ledger:
```bash
cat ledger.example.json
```

**60–90s — Close**
> “This MVP is simulator-first and is designed to integrate with Tempo signing/RPC next.”

## Tips
- If output is long, just highlight one approve + one deny + one blocked merchant.
- Keep it under 90 seconds.
