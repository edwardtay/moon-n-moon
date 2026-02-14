import { createWalletClient, http, defineChain, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { crashGameAbi } from "./crash-game-abi";

/**
 * Agent's own on-chain client.
 * Uses AGENT_PRIVATE_KEY to sign transactions (placeBet, claimWinnings).
 * Separate from the operator's chain-client which handles round lifecycle.
 */

const opBNBTestnet = defineChain({
  id: 5611,
  name: "opBNB Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: { default: { http: ["https://opbnb-testnet-rpc.bnbchain.org"] } },
  blockExplorers: { default: { name: "opBNBScan", url: "https://opbnb-testnet.bscscan.com" } },
  testnet: true,
});

interface ChainTarget {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  contract: `0x${string}`;
  label: string;
  failures: number;
  disabled: boolean;
}

let initialized = false;
let agentAddress: string | null = null;
const targets: ChainTarget[] = [];

function init() {
  if (initialized) return;
  initialized = true;

  // Read env vars lazily at runtime, not at module load (critical for Vercel SSG)
  const agentKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;
  const opbnbContract = process.env.NEXT_PUBLIC_CRASH_GAME_ADDRESS as `0x${string}` | undefined;
  const bscContract = process.env.NEXT_PUBLIC_CRASH_GAME_ADDRESS_BSC as `0x${string}` | undefined;

  if (!agentKey) {
    console.log("[agent-chain] No AGENT_PRIVATE_KEY — on-chain agent bets disabled");
    return;
  }

  const account = privateKeyToAccount(agentKey);
  agentAddress = account.address;
  console.log(`[agent-chain] Agent wallet: ${agentAddress}`);

  if (opbnbContract) {
    targets.push({
      client: createWalletClient({
        account,
        chain: opBNBTestnet,
        transport: http("https://opbnb-testnet-rpc.bnbchain.org"),
      }),
      contract: opbnbContract,
      label: "opBNB",
      failures: 0,
      disabled: false,
    });
  }

  if (bscContract) {
    targets.push({
      client: createWalletClient({
        account,
        chain: bscTestnet,
        transport: http("https://data-seed-prebsc-1-s1.bnbchain.org:8545"),
      }),
      contract: bscContract,
      label: "BSC",
      failures: 0,
      disabled: false,
    });
  }

  console.log(`[agent-chain] Initialized ${targets.length} chain(s)`);
}

export function getAgentWalletAddress(): string | null {
  init();
  if (!agentAddress) return null;
  return agentAddress;
}

/**
 * Agent places a bet on-chain. Sends real tBNB.
 * Fire-and-forget to both chains in parallel.
 */
export async function agentOnChainBet(amountBNB: number): Promise<void> {
  init();
  if (targets.length === 0) return;

  // Cap on-chain bet to 0.0001 tBNB to preserve testnet funds
  const cappedAmount = Math.min(amountBNB, 0.0001);
  const value = parseEther(cappedAmount.toFixed(18));

  await Promise.allSettled(
    targets
      .filter((t) => !t.disabled)
      .map(async (t) => {
        try {
          const hash = await t.client.writeContract({
            address: t.contract,
            abi: crashGameAbi,
            functionName: "placeBet",
            args: [],
            value,
          });
          t.failures = 0;
          console.log(`[agent-chain:${t.label}] placeBet tx: ${hash}`);
        } catch (err: unknown) {
          t.failures++;
          const msg = err instanceof Error ? err.message.slice(0, 80) : "unknown";
          console.log(`[agent-chain:${t.label}] placeBet failed (${t.failures}): ${msg}`);
          if (t.failures >= 3) {
            t.disabled = true;
            console.log(`[agent-chain:${t.label}] Disabled after 3 failures`);
          }
        }
      })
  );
}

/**
 * Agent claims winnings after a resolved round.
 * Fire-and-forget to both chains in parallel.
 */
export async function agentClaimWinnings(roundId: number): Promise<void> {
  init();
  if (targets.length === 0) return;

  await Promise.allSettled(
    targets
      .filter((t) => !t.disabled)
      .map(async (t) => {
        try {
          const hash = await t.client.writeContract({
            address: t.contract,
            abi: crashGameAbi,
            functionName: "claimWinnings",
            args: [BigInt(roundId)],
          });
          t.failures = 0;
          console.log(`[agent-chain:${t.label}] claimWinnings tx: ${hash}`);
        } catch (err: unknown) {
          t.failures++;
          const msg = err instanceof Error ? err.message.slice(0, 80) : "unknown";
          console.log(`[agent-chain:${t.label}] claimWinnings failed: ${msg}`);
        }
      })
  );
}

export function isAgentChainEnabled(): boolean {
  init();
  return targets.length > 0;
}
