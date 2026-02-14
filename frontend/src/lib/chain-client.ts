import { createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { crashGameAbi } from "./crash-game-abi";

const opBNBTestnet = defineChain({
  id: 5611,
  name: "opBNB Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: { default: { http: ["https://opbnb-testnet-rpc.bnbchain.org"] } },
  blockExplorers: { default: { name: "opBNBScan", url: "https://opbnb-testnet.bscscan.com" } },
  testnet: true,
});

/**
 * Dual-chain client for operator wallet.
 * Sends commit-reveal proofs to BOTH opBNB Testnet and BSC Testnet.
 * All calls are fire-and-forget — the off-chain game engine is the source of truth.
 *
 * ENV VARS are read lazily inside initChains() — NOT at module load —
 * because Vercel serverless may load this module during SSG when env vars aren't available.
 */

// Per-chain state
interface ChainState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletClient: any;
  contractAddress: `0x${string}`;
  consecutiveFailures: number;
  circuitOpen: boolean;
  label: string;
}

const MAX_FAILURES = 5;
let initialized = false;
const chains: ChainState[] = [];

function initChains() {
  if (initialized) return;
  initialized = true;

  // Read env vars lazily at runtime, not at module load
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY as `0x${string}` | undefined;
  const opbnbContract = process.env.NEXT_PUBLIC_CRASH_GAME_ADDRESS as `0x${string}` | undefined;
  const bscContract = process.env.NEXT_PUBLIC_CRASH_GAME_ADDRESS_BSC as `0x${string}` | undefined;

  console.log(`[chain] initChains: opKey=${operatorKey ? "SET" : "MISSING"}, opbnb=${opbnbContract || "MISSING"}, bsc=${bscContract || "MISSING"}`);

  if (!operatorKey) {
    console.log("[chain] No OPERATOR_PRIVATE_KEY — on-chain calls disabled");
    return;
  }

  const account = privateKeyToAccount(operatorKey);
  console.log(`[chain] Operator: ${account.address}`);

  if (opbnbContract) {
    chains.push({
      walletClient: createWalletClient({
        account,
        chain: opBNBTestnet,
        transport: http("https://opbnb-testnet-rpc.bnbchain.org"),
      }),
      contractAddress: opbnbContract,
      consecutiveFailures: 0,
      circuitOpen: false,
      label: "opBNB",
    });
    console.log(`[chain] opBNB contract: ${opbnbContract}`);
  }

  if (bscContract) {
    chains.push({
      walletClient: createWalletClient({
        account,
        chain: bscTestnet,
        transport: http("https://data-seed-prebsc-1-s1.bnbchain.org:8545"),
      }),
      contractAddress: bscContract,
      consecutiveFailures: 0,
      circuitOpen: false,
      label: "BSC",
    });
    console.log(`[chain] BSC contract: ${bscContract}`);
  }

  console.log(`[chain] Initialized ${chains.length} chain(s)`);
}

async function sendToChain(
  chain: ChainState,
  functionName: string,
  args: unknown[]
): Promise<string | null> {
  if (chain.circuitOpen) return null;

  try {
    const hash = await chain.walletClient.writeContract({
      address: chain.contractAddress,
      abi: crashGameAbi,
      functionName,
      args,
    });

    chain.consecutiveFailures = 0;
    console.log(`[chain:${chain.label}] ${functionName} tx: ${hash}`);
    return hash;
  } catch (err: unknown) {
    chain.consecutiveFailures++;
    const msg = err instanceof Error ? err.message.slice(0, 100) : "unknown";
    console.log(`[chain:${chain.label}] ${functionName} FAILED (${chain.consecutiveFailures}): ${msg}`);
    if (chain.consecutiveFailures >= MAX_FAILURES && !chain.circuitOpen) {
      chain.circuitOpen = true;
      console.log(`[chain:${chain.label}] Circuit breaker OPEN after ${MAX_FAILURES} failures.`);
    }
    return null;
  }
}

async function sendAll(functionName: string, args: unknown[] = []) {
  initChains();
  if (chains.length === 0) {
    console.log(`[chain] sendAll(${functionName}) — no chains initialized`);
    return;
  }

  console.log(`[chain] sendAll(${functionName}) — ${chains.length} chain(s)`);
  // Fire to all chains in parallel — don't wait for each other
  await Promise.allSettled(
    chains.map((c) => sendToChain(c, functionName, args))
  );
}

export async function onChainStartRound(commitHash: string) {
  return sendAll("startRound", [commitHash as `0x${string}`]);
}

export async function onChainLockRound() {
  return sendAll("lockRound");
}

export async function onChainRecordCashOut(
  player: string,
  multiplier: number
) {
  return sendAll("recordCashOut", [
    player as `0x${string}`,
    BigInt(multiplier),
  ]);
}

export async function onChainEndRound(
  crashMultiplier: number,
  salt: string
) {
  return sendAll("endRound", [
    BigInt(crashMultiplier),
    salt as `0x${string}`,
  ]);
}

export function isChainEnabled(): boolean {
  // Also lazy — check env at call time
  return !!process.env.OPERATOR_PRIVATE_KEY &&
    (!!process.env.NEXT_PUBLIC_CRASH_GAME_ADDRESS || !!process.env.NEXT_PUBLIC_CRASH_GAME_ADDRESS_BSC);
}
