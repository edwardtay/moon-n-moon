"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from "wagmi";
import { type Abi, type Address } from "viem";
import { toast } from "sonner";
import { useEffect } from "react";

// ============================================================
// PATTERN: Read contract value
// ============================================================
// Copy this pattern when you need to read on-chain state.
//
// Usage:
//   const { data: balance, isLoading } = useContractRead({
//     address: "0x...",
//     abi: myAbi,
//     functionName: "balanceOf",
//     args: [userAddress],
//   });
//
export function useContractRead<T = unknown>({
  address,
  abi,
  functionName,
  args = [],
  enabled = true,
}: {
  address: Address | undefined;
  abi: Abi;
  functionName: string;
  args?: unknown[];
  enabled?: boolean;
}) {
  const result = useReadContract({
    address,
    abi,
    functionName,
    args,
    query: { enabled: enabled && !!address },
  });

  return {
    data: result.data as T | undefined,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}

// ============================================================
// PATTERN: Write to contract with full lifecycle toasts
// ============================================================
// Copy this pattern when you need to send a transaction.
// Handles: wallet prompt → pending → confirmed → error
// Shows toast notifications at each step automatically.
//
// Usage:
//   const { write, isPrompting, isConfirming, isConfirmed } = useContractWrite({
//     address: "0x...",
//     abi: myAbi,
//     functionName: "mint",
//     onSuccess: () => refetchBalance(),
//   });
//   <Button onClick={() => write({ args: [1n] })} disabled={isPrompting || isConfirming}>
//     Mint
//   </Button>
//
export function useContractWrite({
  address,
  abi,
  functionName,
  onSuccess,
}: {
  address: Address | undefined;
  abi: Abi;
  functionName: string;
  onSuccess?: () => void;
}) {
  const { writeContract, data: txHash, isPending: isPrompting, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Toast lifecycle
  useEffect(() => {
    if (txHash && isConfirming) {
      toast.loading("Transaction pending...", { id: txHash });
    }
  }, [txHash, isConfirming]);

  useEffect(() => {
    if (txHash && isConfirmed) {
      toast.success("Transaction confirmed", { id: txHash });
      onSuccess?.();
    }
  }, [txHash, isConfirmed, onSuccess]);

  useEffect(() => {
    const err = writeError || receiptError;
    if (err) {
      toast.error(err.message.split("\n")[0]);
    }
  }, [writeError, receiptError]);

  const write = ({ args = [] }: { args?: unknown[] } = {}) => {
    if (!address) return;
    writeContract({ address, abi, functionName, args });
  };

  return { write, txHash, isPrompting, isConfirming, isConfirmed };
}

// ============================================================
// PATTERN: Watch contract events
// ============================================================
// Copy this pattern to react to on-chain events in real-time.
//
// Usage:
//   useContractEvent({
//     address: "0x...",
//     abi: myAbi,
//     eventName: "Transfer",
//     onEvent: (logs) => {
//       console.log("New transfer:", logs);
//       refetchBalance();
//     },
//   });
//
export function useContractEvent({
  address,
  abi,
  eventName,
  onEvent,
  enabled = true,
}: {
  address: Address | undefined;
  abi: Abi;
  eventName: string;
  onEvent: (logs: unknown[]) => void;
  enabled?: boolean;
}) {
  useWatchContractEvent({
    address,
    abi,
    eventName,
    onLogs: onEvent,
    enabled: enabled && !!address,
  });
}
