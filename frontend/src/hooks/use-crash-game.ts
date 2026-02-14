"use client";

import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { parseEther } from "viem";
import { bscTestnet } from "viem/chains";
import { crashGameAbi } from "@/lib/crash-game-abi";

const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CRASH_GAME_ADDRESS as `0x${string}` | undefined;

/**
 * Hook for on-chain CrashGame interactions.
 * Falls back gracefully when contract isn't deployed yet.
 */
export function useCrashGame() {
  const { address } = useAccount();
  const { writeContractAsync, isPending: isBetting } = useWriteContract();

  const enabled = !!CONTRACT_ADDRESS && !!address;

  // Read player stats from contract
  const { data: statsData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: crashGameAbi,
    functionName: "getPlayerStats",
    args: address ? [address] : undefined,
    chainId: bscTestnet.id,
    query: { enabled },
  });

  // Read current round ID
  const { data: currentRoundId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: crashGameAbi,
    functionName: "currentRoundId",
    chainId: bscTestnet.id,
    query: { enabled: !!CONTRACT_ADDRESS },
  });

  /**
   * Place a bet on-chain (sends BNB to contract).
   */
  async function placeBetOnChain(amountBnb: number) {
    if (!CONTRACT_ADDRESS) {
      console.warn("Contract not deployed — using off-chain mode");
      return null;
    }
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: crashGameAbi,
      functionName: "placeBet",
      value: parseEther(amountBnb.toString()),
      chainId: bscTestnet.id,
    });
  }

  /**
   * Claim winnings for a resolved round.
   */
  async function claimWinnings(roundId: number) {
    if (!CONTRACT_ADDRESS) return null;
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: crashGameAbi,
      functionName: "claimWinnings",
      args: [BigInt(roundId)],
      chainId: bscTestnet.id,
    });
  }

  const playerStats = statsData
    ? {
        profit: Number(statsData[0]) / 1e18,
        wagered: Number(statsData[1]) / 1e18,
        rounds: Number(statsData[2]),
      }
    : null;

  return {
    isContractDeployed: !!CONTRACT_ADDRESS,
    placeBetOnChain,
    claimWinnings,
    isBetting,
    playerStats,
    currentRoundId: currentRoundId ? Number(currentRoundId) : 0,
  };
}
