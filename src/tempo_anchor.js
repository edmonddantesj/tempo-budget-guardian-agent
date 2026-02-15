import { JsonRpcProvider, Wallet } from 'ethers';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReceiptRaw(provider, txHash, { timeoutMs = 30_000, intervalMs = 800 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // Use raw JSON-RPC to avoid ethers receipt decoding issues on Tempo custom tx types.
    const rec = await provider.send('eth_getTransactionReceipt', [txHash]);
    if (rec) return rec;
    await sleep(intervalMs);
  }
  return null;
}

export async function anchorDigest({ rpcUrl, chainId, privateKey, digestHex }) {
  if (!rpcUrl) throw new Error('TEMPO_RPC_URL required');
  if (!privateKey) throw new Error('TEMPO_PRIVATE_KEY required');
  if (!digestHex || !digestHex.startsWith('0x')) throw new Error('digestHex must be 0x...');

  const provider = new JsonRpcProvider(rpcUrl, chainId ? Number(chainId) : undefined);
  const wallet = new Wallet(privateKey, provider);

  // Minimal on-chain footprint: self-tx with calldata = digest bytes.
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0n,
    data: digestHex
  });

  const raw = await waitReceiptRaw(provider, tx.hash);

  // status is hex string "0x1" / "0x0" in raw receipt
  const status = raw?.status ? Number(raw.status) : null;
  const blockNumber = raw?.blockNumber ? Number(raw.blockNumber) : null;

  return {
    from: tx.from,
    to: tx.to,
    hash: tx.hash,
    blockNumber,
    status
  };
}
