"use client";

import { memo } from "react";
import type { RoundHistory } from "@/hooks/use-game-stream";

interface RoundHistoryBarProps {
  history: RoundHistory[];
}

function getChipStyle(crashPoint: number) {
  const x = crashPoint / 100;
  if (x < 1.3)
    return { bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.2)" };
  if (x < 2)
    return { bg: "rgba(251,146,60,0.1)", color: "#fb923c", border: "rgba(251,146,60,0.15)" };
  if (x < 5)
    return { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.15)" };
  if (x < 10)
    return { bg: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "rgba(96,165,250,0.15)" };
  return { bg: "rgba(232,121,249,0.12)", color: "#e879f9", border: "rgba(232,121,249,0.2)" };
}

export const RoundHistoryBar = memo(function RoundHistoryBar({ history }: RoundHistoryBarProps) {
  if (history.length === 0) {
    return (
      <div className="h-8 flex items-center justify-center text-xs text-zinc-400">
        No rounds played yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 game-scrollbar">
      {history.slice(0, 20).map((round) => {
        const style = getChipStyle(round.crashPoint);
        return (
          <div
            key={round.roundId}
            className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold cursor-default transition-transform hover:scale-105"
            style={{
              background: style.bg,
              color: style.color,
              border: `1px solid ${style.border}`,
            }}
            title={`Round #${round.roundId} — ${(round.crashPoint / 100).toFixed(2)}x`}
          >
            {(round.crashPoint / 100).toFixed(2)}x
          </div>
        );
      })}
    </div>
  );
});
