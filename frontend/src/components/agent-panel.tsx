"use client";

import { useState, useEffect, useRef } from "react";
import type { PlayerBet, RoundPhase, RoundHistory } from "@/hooks/use-game-stream";

interface AgentStripProps {
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

export function AgentStrip({
  phase,
  bets,
  multiplier,
  history,
  thinking,
  toUsd,
}: AgentStripProps) {
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
      return `Out @ ${(agentBet.cashOutMultiplier / 100).toFixed(2)}x`;
    }
    if (phase === "active") return "Holding...";
    if (phase === "crashed") return "Busted";
    return "In";
  };

  const statusColor = () => {
    if (!agentBet) return "#71717a";
    if (agentBet.cashOutMultiplier) return "#34d399";
    if (phase === "crashed" && !agentBet.cashOutMultiplier) return "#f87171";
    if (phase === "active") return "#facc15";
    return "#a1a1aa";
  };

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(168,85,247,0.04)",
        border: "1px solid rgba(168,85,247,0.1)",
      }}
    >
      {/* Main row: AI status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: statusColor(),
              boxShadow: `0 0 6px ${statusColor()}`,
            }}
          />
          <span className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider">
            Claude
          </span>
          <span
            className="text-xs font-semibold truncate"
            style={{ color: statusColor() }}
          >
            {statusText()}
          </span>
          {agentBet && (
            <span className="text-[10px] text-zinc-500 font-mono flex-shrink-0">
              {agentBet.amount.toFixed(3)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 text-[10px] font-mono">
          <span className="text-zinc-500">
            {record.wins}W {record.losses}L
          </span>
          {(record.wins > 0 || record.losses > 0) && (
            <span
              className="font-bold"
              style={{ color: record.totalProfit >= 0 ? "#34d399" : "#f87171" }}
            >
              {record.totalProfit >= 0 ? "+" : ""}
              {record.totalProfit.toFixed(3)}
            </span>
          )}
        </div>
      </div>

      {/* AI thinking — single line */}
      {thinking && (
        <p className="text-[10px] text-zinc-500 italic mt-1.5 truncate leading-tight">
          &ldquo;{thinking}&rdquo;
        </p>
      )}
    </div>
  );
}
