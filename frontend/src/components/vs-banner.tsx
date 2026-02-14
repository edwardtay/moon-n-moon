"use client";

import { memo } from "react";
import type { PlayerBet, RoundHistory } from "@/hooks/use-game-stream";
import { AstronautMascot, AIEyeMascot } from "./mascots";

interface VsBannerProps {
  bets: PlayerBet[];
  history: RoundHistory[];
  agentThinking: string;
  toUsd?: (bnb: number) => string | null;
}

export const VsBanner = memo(function VsBanner({ bets, history, agentThinking, toUsd }: VsBannerProps) {
  const agentBet = bets.find((b) => b.isAgent);
  const humanBets = bets.filter((b) => !b.isAgent);
  const humanCount = humanBets.length;

  const agentProfit = agentBet?.profit ?? 0;
  const humanProfit = humanBets.reduce((sum, b) => sum + (b.profit ?? 0), 0);

  return (
    <div className="relative rounded-2xl overflow-hidden noise-bg" style={{
      background: "linear-gradient(135deg, rgba(59,130,246,0.04) 0%, #09090b 40%, #09090b 60%, rgba(168,85,247,0.04) 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div className="relative flex items-center justify-between px-6 py-5">
        {/* Humans side */}
        <div className="flex-1 flex items-center gap-4">
          <AstronautMascot size={52} />
          <div>
            <div className="text-[10px] text-blue-400/70 uppercase tracking-[0.2em] font-semibold mb-1.5">
              Humans
            </div>
            <div className="text-xl font-bold text-zinc-200">
              {humanCount > 0
                ? `${humanCount} player${humanCount > 1 ? "s" : ""}`
                : "No players yet"}
            </div>
            {humanProfit !== 0 && (
              <div
                className="text-sm font-mono mt-1"
                style={{
                  color: humanProfit >= 0 ? "#34d399" : "#f87171",
                }}
              >
                {humanProfit >= 0 ? "+" : ""}
                {humanProfit.toFixed(4)} BNB
                {toUsd && <span className="opacity-60 ml-1">({toUsd(Math.abs(humanProfit))})</span>}
              </div>
            )}
          </div>
        </div>

        {/* VS divider */}
        <div className="flex-shrink-0 mx-6 relative">
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-20"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)",
              transform: "scale(2.5)",
            }}
          />
          <div
            className="relative w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-sm font-black text-zinc-300 tracking-wider">
              VS
            </span>
          </div>
        </div>

        {/* AI side */}
        <div className="flex-1 flex items-center justify-end gap-4">
          <div className="text-right">
            <div className="text-[10px] text-purple-400/70 uppercase tracking-[0.2em] font-semibold mb-1.5">
              Claude AI
            </div>
            <div className="text-xl font-bold text-zinc-200 font-mono">
              {agentBet
                ? `${agentBet.amount.toFixed(3)} BNB`
                : "Analyzing..."}
            </div>
            {agentProfit !== 0 && (
              <div
                className="text-sm font-mono mt-1"
                style={{
                  color: agentProfit >= 0 ? "#34d399" : "#f87171",
                }}
              >
                {agentProfit >= 0 ? "+" : ""}
                {agentProfit.toFixed(4)} BNB
                {toUsd && <span className="opacity-60 ml-1">({toUsd(Math.abs(agentProfit))})</span>}
              </div>
            )}
          </div>
          <AIEyeMascot size={52} />
        </div>
      </div>

      {/* AI thinking ticker */}
      {agentThinking && (
        <div
          className="px-5 py-2.5"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.04)",
            background: "rgba(168,85,247,0.02)",
          }}
        >
          <div className="flex items-start gap-2 text-xs">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="text-purple-400/50 font-semibold text-[10px] uppercase tracking-wider">
                Claude&apos;s reasoning
              </span>
              <p className="text-zinc-300 italic mt-0.5 leading-relaxed truncate">
                {agentThinking}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
