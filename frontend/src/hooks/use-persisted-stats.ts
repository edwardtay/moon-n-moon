"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RoundPhase, PlayerBet, RoundHistory } from "@/hooks/use-game-stream";

const STORAGE_KEY = "mnm-stats-v1";

interface PersistedStats {
  humanWins: number;
  humanLosses: number;
  aiWins: number;
  aiLosses: number;
  totalRounds: number;
  allCrashPoints: number[]; // last 100
}

const DEFAULT: PersistedStats = {
  humanWins: 0,
  humanLosses: 0,
  aiWins: 0,
  aiLosses: 0,
  totalRounds: 0,
  allCrashPoints: [],
};

function load(): PersistedStats {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

function save(stats: PersistedStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // localStorage full or unavailable
  }
}

export function usePersistedStats() {
  const [stats, setStats] = useState<PersistedStats>(DEFAULT);
  const lastProcessedRoundRef = useRef(0);
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    setStats(load());
    initialized.current = true;
  }, []);

  // Save to localStorage whenever stats change (after init)
  useEffect(() => {
    if (initialized.current) save(stats);
  }, [stats]);

  const processRound = useCallback(
    (phase: RoundPhase, bets: PlayerBet[], history: RoundHistory[]) => {
      if (phase !== "crashed") return;
      const currentRoundId = history[0]?.roundId ?? 0;
      if (currentRoundId <= 0 || currentRoundId <= lastProcessedRoundRef.current) return;
      lastProcessedRoundRef.current = currentRoundId;

      const crashPoint = history[0]?.crashPoint ?? 0;
      const humanBets = bets.filter((b) => !b.isAgent);
      const aiBet = bets.find((b) => b.isAgent);

      setStats((prev) => {
        let { humanWins, humanLosses, aiWins, aiLosses, totalRounds, allCrashPoints } = { ...prev };

        totalRounds++;
        allCrashPoints = [crashPoint, ...allCrashPoints].slice(0, 100);

        // Count human outcomes
        for (const bet of humanBets) {
          if (bet.cashOutMultiplier && bet.profit !== null && bet.profit >= 0) {
            humanWins++;
          } else if (bet.profit !== null) {
            humanLosses++;
          }
        }

        // Count AI outcomes
        if (aiBet) {
          if (aiBet.cashOutMultiplier && aiBet.profit !== null && aiBet.profit >= 0) {
            aiWins++;
          } else if (aiBet.profit !== null) {
            aiLosses++;
          }
        }

        return { humanWins, humanLosses, aiWins, aiLosses, totalRounds, allCrashPoints };
      });
    },
    []
  );

  const avgCrash =
    stats.allCrashPoints.length > 0
      ? stats.allCrashPoints.reduce((s, c) => s + c, 0) / stats.allCrashPoints.length / 100
      : 0;

  const maxCrash =
    stats.allCrashPoints.length > 0
      ? Math.max(...stats.allCrashPoints) / 100
      : 0;

  return {
    humanWins: stats.humanWins,
    humanLosses: stats.humanLosses,
    aiWins: stats.aiWins,
    aiLosses: stats.aiLosses,
    totalRounds: stats.totalRounds,
    avgCrash,
    maxCrash,
    processRound,
  };
}
