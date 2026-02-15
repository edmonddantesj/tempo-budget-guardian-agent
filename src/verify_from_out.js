#!/usr/bin/env node
/**
 * Verify all anchored cases from out/track3_results.json
 *
 * Usage:
 *   node src/verify_from_out.js
 */

import fs from 'node:fs';
import { JsonRpcProvider } from 'ethers';
import { loadDotEnv } from './env.js';

loadDotEnv();

const rpcUrl = process.env.TEMPO_RPC_URL;
const chainId = Number(process.env.TEMPO_CHAIN_ID || '42431');
if (!rpcUrl) {
  console.error('Missing TEMPO_RPC_URL (.env)');
  process.exit(2);
}

const provider = new JsonRpcProvider(rpcUrl, chainId);
const results = JSON.parse(fs.readFileSync('out/track3_results.json', 'utf-8'));

let ok = 0;
let fail = 0;

for (const r of results) {
  const txHash = r?.proof?.tx_hash;
  const digest = r?.decision_digest;
  if (!txHash || !r?.proof?.anchored) {
    console.log('SKIP (not anchored)', r?.guardian?.decision);
    continue;
  }
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    console.log('FAIL tx not found', txHash);
    fail++;
    continue;
  }
  const pass = (tx.data || '').toLowerCase() === (digest || '').toLowerCase();
  if (pass) {
    console.log('PASS', r?.guardian?.decision, txHash);
    ok++;
  } else {
    console.log('FAIL mismatch', r?.guardian?.decision, txHash);
    console.log(' expected', digest);
    console.log(' got     ', tx.data);
    fail++;
  }
}

console.log(`Summary: PASS=${ok} FAIL=${fail}`);
process.exit(fail ? 4 : 0);
