#!/usr/bin/env node
/**
 * 2D Nonce Budget Guardian Agent (Tempo hackathon demo)
 *
 * Goal: demonstrate an agentic policy layer that can approve/deny payment intents
 * while managing parallel-safe sequencing ("2D nonce" concept) and budget caps.
 *
 * NOTE: This is a simulator/MVP for hackathon submission.
 * Integrating Tempo RPC/signing can be added later.
 */

import fs from 'node:fs';

function loadJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * NonceManager: maintains a (lane x seq) model.
 * - lane: represents parallel dimension (e.g., merchant category, workflow, or channel)
 * - seq: monotonically increases within a lane
 */
class NonceManager {
  constructor(initial = {}) {
    this.state = { ...initial }; // lane -> nextSeq
  }

  next(lane) {
    const cur = this.state[lane] ?? 0;
    const nextSeq = cur + 1;
    this.state[lane] = nextSeq;
    return { lane, seq: nextSeq };
  }
}

/**
 * BudgetGuardian
 * - Enforces per-day budget and per-category caps.
 * - Produces a decision with reasons + suggested (lane, seq) nonce.
 */
class BudgetGuardian {
  constructor({ policy, ledger }) {
    this.policy = policy;
    this.ledger = ledger;
    this.nonce = new NonceManager(ledger?.nonce_state || {});
  }

  // Sum spending for a day (YYYY-MM-DD)
  spentOn(date, category = null) {
    return (this.ledger.events || [])
      .filter((e) => e.date === date)
      .filter((e) => (category ? e.category === category : true))
      .reduce((acc, e) => acc + (e.amount || 0), 0);
  }

  decide(intent) {
    const reasons = [];
    const recs = [];

    const { date, category, amount, merchant } = intent;

    if (!date || !category || typeof amount !== 'number') {
      return {
        ok: false,
        action: 'block',
        reasons: ['Invalid intent: date/category/amount required'],
      };
    }

    const dayBudget = this.policy.daily_budget_usdc;
    const catCap = (this.policy.category_caps_usdc || {})[category] ?? null;

    const spentDay = this.spentOn(date);
    const spentCat = this.spentOn(date, category);

    if (dayBudget != null && spentDay + amount > dayBudget) {
      reasons.push(`Daily budget exceeded: spent ${spentDay} + ${amount} > ${dayBudget}`);
    }
    if (catCap != null && spentCat + amount > catCap) {
      reasons.push(`Category cap exceeded (${category}): spent ${spentCat} + ${amount} > ${catCap}`);
    }

    // Simple risk flags
    if ((this.policy.blocked_merchants || []).includes(merchant)) {
      reasons.push(`Merchant blocked by policy: ${merchant}`);
    }

    const lane = this.policy.lane_by === 'category' ? category : 'default';
    const suggestedNonce = this.nonce.next(lane);

    if (reasons.length > 0) {
      return {
        ok: true,
        action: 'deny',
        reasons,
        recommendations: recs,
        suggested_nonce: suggestedNonce,
      };
    }

    return {
      ok: true,
      action: 'approve',
      reasons: [`Approved by policy. Lane=${lane}`],
      recommendations: recs,
      suggested_nonce: suggestedNonce,
    };
  }

  commit(intent, decision) {
    // In a real integration, commit after tx success. Here, commit on approve for demo.
    if (decision.action !== 'approve') return;
    this.ledger.events = this.ledger.events || [];
    this.ledger.events.push({
      ts: nowIso(),
      date: intent.date,
      category: intent.category,
      merchant: intent.merchant || '',
      amount: intent.amount,
      nonce: decision.suggested_nonce,
    });
    this.ledger.nonce_state = this.nonce.state;
  }
}

function main() {
  const policyPath = process.env.POLICY || 'policy.json';
  const ledgerPath = process.env.LEDGER || 'ledger.json';
  const intentsPath = process.env.INTENTS || 'intents.json';

  const policy = loadJson(policyPath);
  const ledger = fs.existsSync(ledgerPath) ? loadJson(ledgerPath) : { events: [], nonce_state: {} };
  const intents = loadJson(intentsPath);

  const guardian = new BudgetGuardian({ policy, ledger });

  const out = [];

  // Optional: slow down for screen-recorded demos.
  // Set DEMO_DELAY_MS=800 (or similar) to pause between intents.
  const delayMs = Number(process.env.DEMO_DELAY_MS || 0);
  const stream = String(process.env.DEMO_STREAM || '0') === '1';

  const sleepSync = (ms) => {
    if (!ms || ms <= 0) return;
    const sab = new SharedArrayBuffer(4);
    const ia = new Int32Array(sab);
    Atomics.wait(ia, 0, 0, ms);
  };

  const pretty = (obj) => JSON.stringify(obj, null, 2);

  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i];
    const decision = guardian.decide(intent);
    guardian.commit(intent, decision);
    out.push({ intent, decision });

    if (stream) {
      console.log(`\n--- Intent #${i + 1}/${intents.length} ---`);
      console.log(pretty(intent));
      console.log('Decision:');
      console.log(pretty({ action: decision.action, reasons: decision.reasons, suggested_nonce: decision.suggested_nonce }));
    }

    sleepSync(delayMs);
  }

  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

  if (!stream) {
    // Default: single JSON blob (good for machines)
    console.log(JSON.stringify({
      project: 'tempo-budget-guardian-agent',
      version: '0.1.0',
      out
    }, null, 2));
  } else {
    console.log('\n=== Summary (JSON) ===');
    console.log(pretty({ project: 'tempo-budget-guardian-agent', version: '0.1.0', out }));
  }
}

main();
