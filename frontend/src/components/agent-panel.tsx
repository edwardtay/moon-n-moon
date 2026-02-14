"use client";

import { useState, useEffect, useRef } from "react";
import type { PlayerBet, RoundPhase, RoundHistory } from "@/hooks/use-game-stream";
import { AIEyeMascot } from "./mascots";

interface AgentPanelProps {
  phase: RoundPhase;
  bets: PlayerBet[];
  multiplier: number;
  history: RoundHistory[];
  thinking: string;
  toUsd?: (bnb: number) => string | null;
}

interface AgentRecord {
  wins: number;
  losses: number;
  totalProfit: number;
}

export function AgentPanel({
  phase,
  bets,
  multiplier,
  history,
  thinking,
  toUsd,
}: AgentPanelProps) {
  const agentBet = bets.find((b) => b.isAgent);
  const [record, setRecord] = useState<AgentRecord>({
    wins: 0,
    losses: 0,
    totalProfit: 0,
  });
  const lastRoundIdRef = useRef(0);

  useEffect(() => {
    if (phase !== "crashed") return;
    const currentRoundId = history[0]?.roundId ?? 0;
    if (currentRoundId <= lastRoundIdRef.current) return;
    lastRoundIdRef.current = currentRoundId;
    if (!agentBet) return;

    setRecord((prev) => {
      if (
        agentBet.cashOutMultiplier &&
        agentBet.profit !== null &&
        agentBet.profit >= 0
      ) {
        return {
          wins: prev.wins + 1,
          losses: prev.losses,
          totalProfit: prev.totalProfit + (agentBet.profit ?? 0),
        };
      } else if (agentBet.profit !== null) {
        return {
          wins: prev.wins,
          losses: prev.losses + 1,
          totalProfit: prev.totalProfit + (agentBet.profit ?? 0),
        };
      }
      return prev;
    });
  }, [phase, history, agentBet]);

  const statusText = () => {
    if (!agentBet) {
      if (phase === "betting") return "Analyzing...";
      if (phase === "active") return "Sitting out";
      return "Idle";
    }
    if (agentBet.cashOutMultiplier) {
      return `Cashed out at ${(agentBet.cashOutMultiplier / 100).toFixed(2)}x`;
    }
    if (phase === "active") return "Holding...";
    if (phase === "crashed") return "Busted";
    return "Bet placed";
  };

  const statusColor = () => {
    if (!agentBet) return "#71717a";
    if (agentBet.cashOutMultiplier) return "#34d399";
    if (phase === "crashed" && !agentBet.cashOutMultiplier) return "#f87171";
    if (phase === "active") return "#facc15";
    return "#a1a1aa";
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <AIEyeMascot size={24} animate={phase === "active" || phase === "betting"} />
        <span className="text-[10px] font-semibold text-purple-400/80 uppercase tracking-[0.2em]">
          Claude AI
        </span>
        <span className="ml-auto text-[10px] text-zinc-400 font-mono">
          {record.wins}W {record.losses}L
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div
            className="text-lg font-bold"
            style={{ color: statusColor() }}
          >
            {statusText()}
          </div>
          {agentBet && (
            <div className="text-xs text-zinc-300 font-mono mt-0.5">
              {agentBet.amount.toFixed(4)} BNB
              {toUsd && <span className="text-zinc-400 ml-1">({toUsd(agentBet.amount)})</span>}
              {agentBet.profit !== null && (
                <span
                  style={{
                    color: agentBet.profit >= 0 ? "#34d399" : "#f87171",
                  }}
                >
                  {" "}
                  ({agentBet.profit >= 0 ? "+" : ""}
                  {agentBet.profit.toFixed(4)})
                </span>
              )}
            </div>
          )}
        </div>

        {phase === "active" && agentBet && !agentBet.cashOutMultiplier && (
          <div className="text-right">
            <div className="text-[10px] text-zinc-400">Potential</div>
            <div className="text-sm font-mono font-bold text-amber-400">
              {((agentBet.amount * multiplier) / 100).toFixed(4)}
            </div>
          </div>
        )}
      </div>

      {/* Thinking — displayed prominently */}
      {thinking && (
        <div
          className="rounded-xl px-3 py-2.5 mt-1"
          style={{
            background: "rgba(168,85,247,0.04)",
            border: "1px solid rgba(168,85,247,0.08)",
          }}
        >
          <p className="text-xs text-zinc-400 italic leading-relaxed">
            &ldquo;{thinking}&rdquo;
          </p>
        </div>
      )}

      {/* Session P&L */}
      {(record.wins > 0 || record.losses > 0) && (
        <div className="flex items-center justify-between text-xs pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span className="text-zinc-400">Session P&L</span>
          <span
            className="font-mono font-bold"
            style={{
              color: record.totalProfit >= 0 ? "#34d399" : "#f87171",
            }}
          >
            {record.totalProfit >= 0 ? "+" : ""}
            {record.totalProfit.toFixed(4)} BNB
            {toUsd && <span className="text-zinc-400 ml-1">({toUsd(Math.abs(record.totalProfit))})</span>}
          </span>
        </div>
      )}
    </div>
  );
}
