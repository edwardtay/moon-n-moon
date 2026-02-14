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

  // Trigger celebration animation on cash-out
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
      // Instant off-chain bet — no wallet signature needed.
      // On-chain proof is handled by the operator wallet (commit-reveal).
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
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 tracking-wide">
          How to play
        </h3>
        <div className="space-y-3">
          {[
            {
              step: "1",
              label: "Place a bet",
              desc: "Choose your BNB amount when betting opens",
              color: "#facc15",
            },
            {
              step: "2",
              label: "Watch it grow",
              desc: "The multiplier climbs — 1.5x, 2x, 5x...",
              color: "#34d399",
            },
            {
              step: "3",
              label: "Cash out in time",
              desc: "Hit cash out before it crashes. Beat Claude!",
              color: "#f87171",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{
                  background: `${item.color}15`,
                  color: item.color,
                  border: `1px solid ${item.color}30`,
                }}
              >
                {item.step}
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-200">
                  {item.label}
                </div>
                <div className="text-xs text-zinc-300">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2">
          <div className="text-center text-xs text-zinc-400 mb-2">
            Connect wallet to start playing
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300 tracking-wide">
          Your bet
        </h3>
        {phase === "betting" && (
          <span className="text-[10px] font-mono text-amber-400 animate-pulse">
            OPEN
          </span>
        )}
      </div>

      {/* Bet amount input */}
      <div className="space-y-2">
        <div className="relative">
          <Input
            type="number"
            step="0.01"
            min="0.001"
            max="10"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            disabled={hasBet || (phase !== "betting" && phase !== "waiting")}
            className="bg-black/40 border-white/[0.06] text-lg h-12 pr-16 font-mono focus:border-emerald-500/30 focus:ring-emerald-500/10"
            placeholder="0.01"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-semibold">
            BNB
          </span>
        </div>

        {/* Quick bet buttons */}
        <div className="flex gap-1.5">
          {QUICK_BETS.map((amt) => (
            <button
              key={amt}
              onClick={() => setBetAmount(String(amt))}
              disabled={hasBet || phase !== "betting"}
              className="flex-1 py-2 rounded-lg text-zinc-400 text-xs font-mono font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] active:scale-95"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {amt}
            </button>
          ))}
        </div>
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
          className="w-full h-12 text-base font-bold rounded-xl transition-all active:scale-[0.98]"
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
              ? "Waiting for round..."
              : "Round in progress"}
        </Button>
      )}

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
          {loading ? "Cashing out..." : `Cash Out — ${potentialWin} BNB${toUsd && potentialWin ? ` (${toUsd(parseFloat(potentialWin))})` : ""}`}
        </Button>
      )}

      {hasBet && hasCashedOut && (
        <div
          className={`text-center py-4 rounded-xl relative overflow-hidden ${showCelebration ? "animate-profit-pop" : ""}`}
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.15)",
          }}
        >
          {showCelebration && (
            <>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-sm pointer-events-none"
                  style={{
                    left: `${10 + Math.random() * 80}%`,
                    top: "50%",
                    animation: `confetti-fall 1.5s ease-out forwards`,
                    animationDelay: `${i * 0.08}s`,
                  }}
                >
                  {["✨", "🎉", "💰", "🔥"][i % 4]}
                </div>
              ))}
            </>
          )}
          <div className="text-emerald-400 font-bold text-lg">
            {((myBet!.cashOutMultiplier ?? 0) / 100).toFixed(2)}x
          </div>
          <div className="text-emerald-300/80 text-sm font-mono">
            +{myBet!.profit?.toFixed(4)} BNB
            {toUsd && myBet!.profit != null && (
              <span className="text-emerald-400/50 ml-1">({toUsd(myBet!.profit)})</span>
            )}
          </div>
        </div>
      )}

      {hasBet && !hasCashedOut && phase === "crashed" && (
        <div
          className="text-center py-4 rounded-xl animate-screen-shake"
          style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.15)",
          }}
        >
          <div className="text-red-400 font-bold text-lg">Busted 💀</div>
          <div className="text-red-300/80 text-sm font-mono">
            -{myBet!.amount.toFixed(4)} BNB
            {toUsd && (
              <span className="text-red-400/50 ml-1">({toUsd(myBet!.amount)})</span>
            )}
          </div>
        </div>
      )}

      {/* Current bets list */}
      {bets.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-[0.15em]">
            Players this round
          </div>
          <div className="max-h-32 overflow-y-auto game-scrollbar space-y-1">
            {bets.map((bet) => (
              <div
                key={bet.address}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs"
                style={{
                  background: bet.isAgent
                    ? "rgba(232,121,249,0.06)"
                    : "rgba(255,255,255,0.02)",
                  border: bet.isAgent
                    ? "1px solid rgba(232,121,249,0.1)"
                    : "1px solid transparent",
                }}
              >
                <div className="flex items-center gap-2">
                  {bet.isAgent ? (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(168,85,247,0.2)",
                        color: "#c084fc",
                      }}
                    >
                      AI
                    </span>
                  ) : (
                    <span className="text-zinc-400">●</span>
                  )}
                  <span className="text-zinc-300 font-mono">
                    {bet.isAgent
                      ? "Claude"
                      : `${bet.address.slice(0, 6)}...${bet.address.slice(-4)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-zinc-400">{bet.amount}</span>
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
