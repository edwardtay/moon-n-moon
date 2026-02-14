"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RoundPhase, PlayerBet } from "@/hooks/use-game-stream";

interface BetPanelProps {
  phase: RoundPhase;
  bets: PlayerBet[];
  placeBet: (address: string, amount: number) => Promise<unknown>;
  cashOut: (address: string) => Promise<unknown>;
  multiplier: number;
  toUsd?: (bnb: number) => string | null;
}

const QUICK_BETS = [0.01, 0.05, 0.1, 0.5];

export function BetPanel({
  phase,
  bets,
  placeBet,
  cashOut,
  multiplier,
  toUsd,
}: BetPanelProps) {
  const { address, isConnected } = useAccount();
  const [betAmount, setBetAmount] = useState("0.01");
  const [loading, setLoading] = useState(false);

  const [showCelebration, setShowCelebration] = useState(false);
  const prevCashedOutRef = useRef(false);

  const myBet = bets.find(
    (b) => b.address.toLowerCase() === address?.toLowerCase()
  );
  const hasBet = !!myBet;
  const hasCashedOut =
    myBet?.cashOutMultiplier !== null && myBet?.cashOutMultiplier !== undefined;

  useEffect(() => {
    if (hasCashedOut && !prevCashedOutRef.current) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
    prevCashedOutRef.current = hasCashedOut;
  }, [hasCashedOut]);

  const handlePlaceBet = useCallback(async () => {
    if (!address || !betAmount) return;
    setLoading(true);
    try {
      const amount = parseFloat(betAmount);
      await placeBet(address, amount);
    } finally {
      setLoading(false);
    }
  }, [address, betAmount, placeBet]);

  const handleCashOut = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      await cashOut(address);
    } finally {
      setLoading(false);
    }
  }, [address, cashOut]);

  const potentialWin =
    hasBet && !hasCashedOut
      ? ((myBet!.amount * multiplier) / 100).toFixed(4)
      : null;

  if (!isConnected) {
    return (
      <div className="glass-card rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide">
          How to play
        </h3>
        <div className="space-y-2">
          {[
            { step: "1", label: "Bet BNB", color: "#facc15" },
            { step: "2", label: "Watch it grow", color: "#34d399" },
            { step: "3", label: "Cash out before crash", color: "#f87171" },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-2.5 text-xs">
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  background: `${item.color}15`,
                  color: item.color,
                  border: `1px solid ${item.color}30`,
                }}
              >
                {item.step}
              </div>
              <span className="text-zinc-300">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="text-center text-[10px] text-zinc-500 pt-1">
          Connect wallet to play
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      {/* Bet input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            step="0.01"
            min="0.001"
            max="10"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            disabled={hasBet || (phase !== "betting" && phase !== "waiting")}
            className="bg-black/40 border-white/[0.06] text-sm h-10 pr-12 font-mono focus:border-emerald-500/30 focus:ring-emerald-500/10"
            placeholder="0.01"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] font-semibold">
            BNB
          </span>
        </div>
      </div>

      {/* Quick bets */}
      <div className="flex gap-1">
        {QUICK_BETS.map((amt) => (
          <button
            key={amt}
            onClick={() => setBetAmount(String(amt))}
            disabled={hasBet || phase !== "betting"}
            className="flex-1 py-1.5 rounded-lg text-zinc-500 text-[10px] font-mono font-medium transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/[0.06] active:scale-95"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {amt}
          </button>
        ))}
      </div>

      {/* Action button */}
      {!hasBet && (
        <Button
          onClick={handlePlaceBet}
          disabled={
            phase !== "betting" ||
            loading ||
            !betAmount ||
            parseFloat(betAmount) <= 0
          }
          className="w-full h-11 text-sm font-bold rounded-xl transition-all active:scale-[0.98]"
          style={{
            background:
              phase === "betting"
                ? "linear-gradient(135deg, #00cc6a 0%, #00ff88 100%)"
                : "rgba(255,255,255,0.04)",
            color: phase === "betting" ? "#000" : "#71717a",
            border:
              phase === "betting"
                ? "1px solid rgba(0,255,136,0.4)"
                : "1px solid rgba(255,255,255,0.06)",
            boxShadow:
              phase === "betting"
                ? "0 0 30px rgba(0,255,136,0.2), inset 0 1px 0 rgba(255,255,255,0.15)"
                : "none",
          }}
        >
          {phase === "betting"
            ? loading
              ? "Placing..."
              : "Place Bet"
            : phase === "waiting"
              ? "Waiting..."
              : "Round in progress"}
        </Button>
      )}

      {/* Cash out — big and urgent */}
      {hasBet && !hasCashedOut && phase === "active" && (
        <Button
          onClick={handleCashOut}
          disabled={loading}
          className="w-full h-14 text-lg font-black rounded-xl transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
            color: "black",
            border: "1px solid rgba(245,158,11,0.4)",
            boxShadow: "0 0 30px rgba(245,158,11,0.2)",
            animation: "glow-pulse 1.5s ease-in-out infinite",
          }}
        >
          {loading ? "..." : `CASH OUT ${potentialWin}`}
          {toUsd && potentialWin && (
            <span className="text-xs font-medium ml-1 opacity-80">
              ({toUsd(parseFloat(potentialWin))})
            </span>
          )}
        </Button>
      )}

      {/* Win result */}
      {hasBet && hasCashedOut && (
        <div
          className={`text-center py-3 rounded-xl relative overflow-hidden ${showCelebration ? "animate-profit-pop" : ""}`}
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.15)",
          }}
        >
          <div className="text-emerald-400 font-bold text-lg">
            {((myBet!.cashOutMultiplier ?? 0) / 100).toFixed(2)}x
          </div>
          <div className="text-emerald-300/80 text-xs font-mono">
            +{myBet!.profit?.toFixed(4)} BNB
            {toUsd && myBet!.profit != null && (
              <span className="text-emerald-400/50 ml-1">({toUsd(myBet!.profit)})</span>
            )}
          </div>
        </div>
      )}

      {/* Bust result */}
      {hasBet && !hasCashedOut && phase === "crashed" && (
        <div
          className="text-center py-3 rounded-xl animate-screen-shake"
          style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.15)",
          }}
        >
          <div className="text-red-400 font-bold text-base">Busted</div>
          <div className="text-red-300/80 text-xs font-mono">
            -{myBet!.amount.toFixed(4)} BNB
            {toUsd && (
              <span className="text-red-400/50 ml-1">({toUsd(myBet!.amount)})</span>
            )}
          </div>
        </div>
      )}

      {/* Live bets — compact list */}
      {bets.length > 0 && (
        <div className="space-y-1 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
            Live bets
          </div>
          <div className="max-h-24 overflow-y-auto game-scrollbar space-y-0.5">
            {bets.map((bet) => (
              <div
                key={bet.address}
                className="flex items-center justify-between py-1 px-1.5 rounded text-[10px]"
                style={{
                  background: bet.isAgent
                    ? "rgba(168,85,247,0.05)"
                    : "transparent",
                }}
              >
                <div className="flex items-center gap-1.5">
                  {bet.isAgent ? (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-purple-500/20 text-purple-400">
                      AI
                    </span>
                  ) : (
                    <span className="text-zinc-600">&#x25CF;</span>
                  )}
                  <span className="text-zinc-500 font-mono">
                    {bet.isAgent
                      ? "Claude"
                      : `${bet.address.slice(0, 4)}..${bet.address.slice(-3)}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-zinc-500">{bet.amount}</span>
                  {bet.cashOutMultiplier && (
                    <span className="text-emerald-400 font-semibold">
                      {(bet.cashOutMultiplier / 100).toFixed(2)}x
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
