#!/usr/bin/env node
/**
 * policy_from_text.js
 * Natural-language policy → policy.json (simple parser)
 *
 * Examples:
 *   node src/policy_from_text.js --text "daily 15, food 12, transport 10, block scam-mart" --out policy.json
 *   node src/policy_from_text.js --text "오늘 예산 15, food 12, scam-mart 금지" --out policy.json
 */

import fs from 'node:fs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;

    const raw = a.slice(2);
    if (raw.includes('=')) {
      const [k, ...rest] = raw.split('=');
      args[k] = rest.join('=');
      continue;
    }

    const k = raw;
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[k] = next;
      i++;
    } else {
      args[k] = 'true';
    }
  }
  return args;
}

function normalize(text) {
  return text
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumberAfter(keyword, text) {
  // keyword can be 'daily' or '예산'
  const re = new RegExp(`${keyword}[^0-9]*([0-9]+(?:\\.[0-9]+)?)`, 'i');
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}

function parseCategoryCaps(text) {
  // patterns like "food 12" "transport:10" "food=12"
  const caps = {};
  const re = /\b([a-z][a-z0-9_-]{1,30})\b\s*(?:[:=]|\s)\s*([0-9]+(?:\.[0-9]+)?)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].toLowerCase();
    const val = Number(m[2]);
    // Avoid capturing 'daily 15' as a category cap
    if (key === 'daily') continue;
    if (Number.isFinite(val)) caps[key] = val;
  }
  return caps;
}

function parseBlockedMerchants(text) {
  // English: "block X", "deny X"
  // Korean: "X 금지", "X 차단"
  const blocked = new Set();

  // block <token>
  for (const re of [/\bblock\s+([a-z0-9_-]{2,40})\b/gi, /\bdeny\s+([a-z0-9_-]{2,40})\b/gi]) {
    let m;
    while ((m = re.exec(text)) !== null) blocked.add(m[1].toLowerCase());
  }

  // <token> 금지/차단
  for (const re of [/\b([a-z0-9_-]{2,40})\b\s*(?:금지|차단)/gi]) {
    let m;
    while ((m = re.exec(text)) !== null) blocked.add(m[1]);
  }

  return Array.from(blocked);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const text = args.text ? normalize(args.text) : '';
  const out = args.out || 'policy.json';

  if (!text) {
    console.error('Missing --text');
    process.exit(2);
  }

  const daily = parseNumberAfter('daily', text) ?? parseNumberAfter('예산', text) ?? parseNumberAfter('budget', text);
  const caps = parseCategoryCaps(text);
  const blocked = parseBlockedMerchants(text);

  const policy = {
    daily_budget_usdc: daily ?? 15,
    category_caps_usdc: Object.keys(caps).length ? caps : { food: 12, transport: 10 },
    blocked_merchants: blocked,
    lane_by: 'category',
    _source: {
      kind: 'nlp-lite',
      text,
    },
  };

  fs.writeFileSync(out, JSON.stringify(policy, null, 2));
  console.log(JSON.stringify({ ok: true, out, policy }, null, 2));
}

main();
