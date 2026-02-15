import { JsonRpcProvider, Wallet } from 'ethers';
import { loadDotEnv } from './env.js';

loadDotEnv();

const rpcUrl = process.env.TEMPO_RPC_URL;
const chainIdExpected = Number(process.env.TEMPO_CHAIN_ID || '42431');
const pk = process.env.TEMPO_PRIVATE_KEY;

if (!rpcUrl) {
  console.error('Missing TEMPO_RPC_URL. Create .env from .env.example');
  process.exit(1);
}

const provider = new JsonRpcProvider(rpcUrl, chainIdExpected);

try {
  const net = await provider.getNetwork();
  const block = await provider.getBlockNumber();
  console.log(`RPC OK: chainId=${net.chainId} block=${block}`);
  if (Number(net.chainId) !== chainIdExpected) {
    console.log(`WARN: expected chainId ${chainIdExpected}`);
  }

  if (pk) {
    const w = new Wallet(pk, provider);
    const bal = await provider.getBalance(w.address);
    console.log(`Wallet: ${w.address}`);
    console.log(`Balance: ${bal.toString()} (wei)`);
  } else {
    console.log('No TEMPO_PRIVATE_KEY set (tx anchoring will be skipped).');
  }
} catch (e) {
  console.error('Doctor failed:', e?.message || e);
  process.exit(2);
}
