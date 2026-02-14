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

  // Accumulate stats when rounds resolve
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

  const agentEntry = entries.find((e) => e.isAgent);
  const humanEntries = entries.filter((e) => !e.isAgent);
  const agentRank = agentEntry
    ? entries.indexOf(agentEntry) + 1
    : null;

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-semibold text-zinc-300 uppercase tracking-[0.2em]">
          Leaderboard
        </h3>
        {agentRank && (
          <span className="text-[10px] text-fuchsia-400/70">
            AI is #{agentRank} of {entries.length}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-xs text-zinc-400 text-center py-4">
          Play a round to appear on the leaderboard
        </div>
      ) : (
        <div className="space-y-1">
          {entries.slice(0, 10).map((entry, i) => (
            <div
              key={entry.address}
              className={`flex items-center justify-between py-2 px-2.5 rounded text-xs ${
                entry.isAgent
                  ? "bg-fuchsia-950/30 border border-fuchsia-900/30"
                  : "bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-5 font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-400" : i === 2 ? "text-orange-400" : "text-zinc-400"}`}>
                  {i + 1}.
                </span>
                {entry.isAgent ? (
                  <span className="text-[10px] font-bold bg-fuchsia-600 text-white px-1.5 py-0.5 rounded">
                    Claude AI
                  </span>
                ) : (
                  <span className="text-zinc-400 font-mono">
                    {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                  </span>
                )}
                <span className="text-zinc-400">
                  {entry.roundsPlayed}r
                </span>
              </div>
              <span
                className={`font-mono font-bold ${entry.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {entry.totalProfit >= 0 ? "+" : ""}
                {entry.totalProfit.toFixed(4)}
                {toUsd && (
                  <span className="text-zinc-400 font-normal ml-1 text-[10px]">
                    ({toUsd(Math.abs(entry.totalProfit))})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
