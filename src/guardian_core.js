// Extracted core logic to make Track 3 demo easier to script.
// Mirrors the decision rules in src/guardian.js (policy keys kept consistent).

class NonceManager {
  constructor(initial = {}) {
    this.state = { ...initial };
  }
  next(lane) {
    const cur = this.state[lane] ?? 0;
    const nextSeq = cur + 1;
    this.state[lane] = nextSeq;
    return { lane, seq: nextSeq };
  }
}

export function runGuardianOnce({ policy, intent, ledger = { events: [], nonce_state: {} } }) {
  const nonce = new NonceManager(ledger?.nonce_state || {});

  const { date, category, amount, merchant } = intent;
  if (!date || !category || typeof amount !== 'number') {
    return {
      decision: 'block',
      reason: 'invalid intent',
      constraints: {},
      nonce2d: { lane: 'default', seq: 0 }
    };
  }

  const reasons = [];

  const dayBudget = policy.daily_budget_usdc;
  const catCap = (policy.category_caps_usdc || {})[category] ?? null;

  const spentDay = (ledger.events || []).filter((e) => e.date === date).reduce((acc, e) => acc + (e.amount || 0), 0);
  const spentCat = (ledger.events || []).filter((e) => e.date === date && e.category === category).reduce((acc, e) => acc + (e.amount || 0), 0);

  if (dayBudget != null && spentDay + amount > dayBudget) {
    reasons.push(`Daily budget exceeded: spent ${spentDay} + ${amount} > ${dayBudget}`);
  }
  if (catCap != null && spentCat + amount > catCap) {
    reasons.push(`Category cap exceeded (${category}): spent ${spentCat} + ${amount} > ${catCap}`);
  }
  if ((policy.blocked_merchants || []).includes(merchant)) {
    reasons.push(`Merchant blocked by policy: ${merchant}`);
  }

  const lane = policy.lane_by === 'category' ? category : 'default';
  const suggested = nonce.next(lane);
  const nonce_state = nonce.state;

  if (reasons.length) {
    return {
      decision: 'deny',
      reason: reasons.join(' | '),
      constraints: {},
      nonce2d: suggested,
      nonce_state
    };
  }

  const remaining_daily = dayBudget == null ? null : Number(dayBudget) - (spentDay + amount);
  const remaining_category = catCap == null ? null : Number(catCap) - (spentCat + amount);

  return {
    decision: 'approve',
    reason: `Approved by policy. Lane=${lane}`,
    constraints: {
      max_amount: amount,
      remaining_daily,
      remaining_category
    },
    nonce2d: suggested,
    nonce_state
  };
}
