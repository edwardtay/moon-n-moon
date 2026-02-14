"use client";

import { useState, useEffect, useRef } from "react";
import type { PlayerBet, RoundPhase } from "@/hooks/use-game-stream";

interface LeaderboardEntry {
  address: string;
  totalProfit: number;
  roundsPlayed: number;
  isAgent: boolean;
}

interface LeaderboardProps {
  bets: PlayerBet[];
  phase?: RoundPhase;
  toUsd?: (bnb: number) => string | null;
}

export function Leaderboard({ bets, phase, toUsd }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const processedRoundRef = useRef(0);

  useEffect(() => {
    if (phase !== "crashed") return;

    const resolvedBets = bets.filter((b) => b.profit !== null);
    if (resolvedBets.length === 0) return;

    setEntries((prev) => {
      const map = new Map<string, LeaderboardEntry>();
      for (const entry of prev) {
        map.set(entry.address, { ...entry });
      }

      for (const bet of resolvedBets) {
        const existing = map.get(bet.address);
        if (existing) {
          existing.totalProfit += bet.profit ?? 0;
          existing.roundsPlayed++;
        } else {
          map.set(bet.address, {
            address: bet.address,
            totalProfit: bet.profit ?? 0,
            roundsPlayed: 1,
            isAgent: bet.isAgent,
          });
        }
      }

      return Array.from(map.values()).sort(
        (a, b) => b.totalProfit - a.totalProfit
      );
    });
  }, [phase, bets]);

  if (entries.length === 0) {
    return (
      <div
        className="rounded-xl px-3 py-2.5 text-center text-xs text-zinc-400"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        Leaderboard — play a round to appear
      </div>
    );
  }

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
          Leaderboard
        </span>
        <span className="text-xs text-zinc-400 font-mono">
          {entries.length} player{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-0.5 max-h-36 overflow-y-auto game-scrollbar">
        {entries.slice(0, 8).map((entry, i) => (
          <div
            key={entry.address}
            className="flex items-center justify-between py-1.5 px-2 rounded text-xs"
            style={{
              background: entry.isAgent
                ? "rgba(168,85,247,0.06)"
                : i === 0
                  ? "rgba(250,204,21,0.05)"
                  : "transparent",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-4 font-bold text-right"
                style={{
                  color:
                    i === 0
                      ? "#facc15"
                      : i === 1
                        ? "#d4d4d8"
                        : i === 2
                          ? "#fb923c"
                          : "#a1a1aa",
                }}
              >
                {i + 1}
              </span>
              {entry.isAgent ? (
                <span className="text-xs font-bold px-1 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  Claude
                </span>
              ) : (
                <span className="text-zinc-300 font-mono">
                  {entry.address.slice(0, 4)}..{entry.address.slice(-3)}
                </span>
              )}
              <span className="text-zinc-400 text-xs">
                {entry.roundsPlayed}r
              </span>
            </div>
            <span
              className="font-mono font-bold"
              style={{
                color: entry.totalProfit >= 0 ? "#34d399" : "#f87171",
              }}
            >
              {entry.totalProfit >= 0 ? "+" : ""}
              {entry.totalProfit.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
