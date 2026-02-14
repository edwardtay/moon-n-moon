import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
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
 * Server-side chain client for operator wallet.
 * Calls startRound/lockRound/endRound/recordCashOut on the CrashGame contract.
 * All calls are fire-and-forget — the off-chain game engine is the source of truth.
 */

const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CRASH_GAME_ADDRESS as `0x${string}` | undefined;

const OPERATOR_KEY = process.env.OPERATOR_PRIVATE_KEY as
  | `0x${string}`
  | undefined;

let walletClient: ReturnType<typeof createWalletClient> | null = null;
let publicClient: ReturnType<typeof createPublicClient> | null = null;

// Circuit breaker: stop spamming after consecutive failures
let consecutiveFailures = 0;
const MAX_FAILURES = 3;
let circuitOpen = false;

function getClients() {
  if (!OPERATOR_KEY || !CONTRACT_ADDRESS) return null;

  if (!walletClient) {
    const account = privateKeyToAccount(OPERATOR_KEY);
    walletClient = createWalletClient({
      account,
      chain: opBNBTestnet,
      transport: http("https://opbnb-testnet-rpc.bnbchain.org"),
    });
    publicClient = createPublicClient({
      chain: opBNBTestnet,
      transport: http("https://opbnb-testnet-rpc.bnbchain.org"),
    });
  }

  return { walletClient, publicClient };
}

async function send(
  functionName: string,
  args: unknown[] = []
) {
  if (circuitOpen) return null; // Circuit breaker open — skip silently

  const clients = getClients();
  if (!clients || !CONTRACT_ADDRESS) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await (clients.walletClient as any).writeContract({
      address: CONTRACT_ADDRESS,
      abi: crashGameAbi,
      functionName,
      args,
    });

    consecutiveFailures = 0; // Reset on success
    console.log(`[chain] ${functionName} tx: ${hash}`);
    return hash;
  } catch (err) {
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_FAILURES && !circuitOpen) {
      circuitOpen = true;
      console.log(`[chain] Circuit breaker OPEN after ${MAX_FAILURES} failures. On-chain calls paused.`);
    }
    return null;
  }
}

export async function onChainStartRound(commitHash: string) {
  return send("startRound", [commitHash as `0x${string}`]);
}

export async function onChainLockRound() {
  return send("lockRound");
}

export async function onChainRecordCashOut(
  player: string,
  multiplier: number
) {
  return send("recordCashOut", [
    player as `0x${string}`,
    BigInt(multiplier),
  ]);
}

export async function onChainEndRound(
  crashMultiplier: number,
  salt: string
) {
  return send("endRound", [
    BigInt(crashMultiplier),
    salt as `0x${string}`,
  ]);
}

export function isChainEnabled(): boolean {
  return !!OPERATOR_KEY && !!CONTRACT_ADDRESS;
}
