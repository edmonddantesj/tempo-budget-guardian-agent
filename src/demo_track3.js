import fs from 'node:fs';
import path from 'node:path';

import { loadDotEnv } from './env.js';
import { decisionDigest } from './decision_digest.js';
import { anchorDigest } from './tempo_anchor.js';

import { runGuardianOnce } from './guardian_core.js';

loadDotEnv();

const rpcUrl = process.env.TEMPO_RPC_URL;
const chainId = process.env.TEMPO_CHAIN_ID || '42431';
const pk = process.env.TEMPO_PRIVATE_KEY;
const explorerBase = process.env.TEMPO_EXPLORER_TX_BASE || '';

function explorerLink(txHash) {
  if (!explorerBase) return txHash;
  return explorerBase.replace(/\/$/, '') + '/' + txHash;
}

function ensureOutDir() {
  const outDir = path.join(process.cwd(), 'out');
  fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

const policy = JSON.parse(fs.readFileSync('policy.example.json', 'utf-8'));
const intents = JSON.parse(fs.readFileSync('intents.example.json', 'utf-8'));

// Pick 3 scenarios: approve, deny, approve-with-constraints (different lane).
const approveIntent = intents[0];
const denyIntent = {
  ...approveIntent,
  merchant: 'big-ads',
  amount: 20.0
};
const approve2Intent = intents.find((x) => x.category === 'transport') || {
  ...approveIntent,
  category: 'transport',
  merchant: 'taxi',
  amount: 4.0
};

const outDir = ensureOutDir();

const results = [];

// Keep a tiny in-memory ledger to demonstrate cumulative budget + 2D nonces.
const ledger = { events: [], nonce_state: {} };

for (const intent of [approveIntent, denyIntent, approve2Intent]) {
  const r = runGuardianOnce({ policy, intent, ledger });

  // Update in-memory ledger state (simulate commit on approve)
  ledger.nonce_state = r.nonce_state || ledger.nonce_state;
  if (r.decision === 'approve') {
    ledger.events.push({
      date: intent.date,
      category: intent.category,
      amount: intent.amount,
      merchant: intent.merchant || '',
      nonce: r.nonce2d
    });
  }

  const dd = decisionDigest({
    policy,
    intent,
    decision: r.decision,
    constraints: r.constraints,
    nonce2d: r.nonce2d
  });

  let proof = { anchored: false };
  if (rpcUrl && pk) {
    try {
      const rec = await anchorDigest({ rpcUrl, chainId, privateKey: pk, digestHex: dd.digest_hex });
      proof = {
        anchored: true,
        chain_id: Number(chainId),
        tx_hash: rec.hash,
        tx_link: explorerLink(rec.hash),
        status: rec.status,
        block: rec.blockNumber
      };
    } catch (e) {
      proof = { anchored: false, error: e?.message || String(e) };
    }
  } else {
    proof = { anchored: false, error: 'Missing TEMPO_RPC_URL or TEMPO_PRIVATE_KEY; skipped anchoring' };
  }

  results.push({
    intent,
    guardian: r,
    decision_digest: dd.digest_hex,
    policy_hash: dd.payload.policy_hash,
    proof
  });
}

fs.writeFileSync(path.join(outDir, 'track3_results.json'), JSON.stringify(results, null, 2));

let md = `# Tempo Budget Guardian — Track 3 Proof Report\n\n`;
md += `This report shows **policy decisions** anchored to Tempo testnet as **tamper-evident receipts**.\n\n`;
md += `- chain_id: ${chainId}\n`;
md += `- generated: ${new Date().toISOString()}\n\n`;

for (const [i, r] of results.entries()) {
  md += `## Case ${i + 1}: ${r.guardian.decision.toUpperCase()}\n`;
  md += `- intent: ${JSON.stringify(r.intent)}\n`;
  md += `- decision_digest: \`${r.decision_digest}\`\n`;
  md += `- policy_hash: \`${r.policy_hash}\`\n`;
  if (r.proof.anchored) {
    md += `- tempo_tx: ${r.proof.tx_link || r.proof.tx_hash}\n`;
    md += `- receipt_status: ${r.proof.status}\n`;
  } else {
    md += `- tempo_tx: (not anchored)\n`;
    md += `- error: ${r.proof.error || 'unknown'}\n`;
  }
  md += `\n`;
}

fs.writeFileSync(path.join(outDir, 'report.md'), md);

console.log(`Wrote: out/track3_results.json`);
console.log(`Wrote: out/report.md`);

for (const r of results) {
  if (r.proof.anchored) console.log('TX', r.proof.tx_hash);
}
