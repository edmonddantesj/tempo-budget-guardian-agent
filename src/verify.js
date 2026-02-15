#!/usr/bin/env node
/**
 * Verify Tempo on-chain receipt for a decision digest.
 *
 * Checks that tx.input (data) matches the expected decision_digest (bytes32 hex).
 *
 * Usage:
 *   node src/verify.js --tx <0xhash> --digest <0xdigest>
 *
 * Env:
 *   TEMPO_RPC_URL, TEMPO_CHAIN_ID (42431)
 */

import { JsonRpcProvider } from 'ethers';
import { loadDotEnv } from './env.js';

loadDotEnv();

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] || null;
}

const txHash = arg('--tx');
const digest = arg('--digest');

if (!txHash || !txHash.startsWith('0x')) {
  console.error('Missing --tx 0x...');
  process.exit(1);
}
if (!digest || !digest.startsWith('0x')) {
  console.error('Missing --digest 0x...');
  process.exit(1);
}

const rpcUrl = process.env.TEMPO_RPC_URL;
const chainId = Number(process.env.TEMPO_CHAIN_ID || '42431');
if (!rpcUrl) {
  console.error('Missing TEMPO_RPC_URL (.env)');
  process.exit(2);
}

const provider = new JsonRpcProvider(rpcUrl, chainId);

const tx = await provider.getTransaction(txHash);
if (!tx) {
  console.error('TX not found');
  process.exit(3);
}

const input = (tx.data || '').toLowerCase();
const expected = digest.toLowerCase();

if (input === expected) {
  console.log('PASS');
  console.log('tx_hash=', txHash);
  console.log('digest=', digest);
  process.exit(0);
}

console.log('FAIL');
console.log('tx_hash=', txHash);
console.log('expected_digest=', digest);
console.log('tx_input=', tx.data);
process.exit(4);
