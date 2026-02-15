import crypto from 'node:crypto';

function canonicalize(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = canonicalize(value[k]);
    }
    return out;
  }
  return value;
}

export function decisionDigest({ policy, intent, decision, constraints = {}, nonce2d = {}, tsBucketSec = 60 }) {
  const now = Date.now();
  const bucket = Math.floor(now / 1000 / tsBucketSec) * tsBucketSec;

  const payload = canonicalize({
    policy_version: policy?.version || 'v0',
    policy_hash: policyHash(policy),
    intent,
    decision,
    constraints,
    nonce2d,
    ts_bucket: bucket
  });

  const json = JSON.stringify(payload);
  const digest = crypto.createHash('sha256').update(json).digest('hex');
  return {
    digest_hex: '0x' + digest,
    payload,
    bucket
  };
}

export function policyHash(policy) {
  const payload = canonicalize(policy || {});
  const json = JSON.stringify(payload);
  const h = crypto.createHash('sha256').update(json).digest('hex');
  return '0x' + h;
}
