"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type RoundPhase = "waiting" | "betting" | "active" | "crashed";

export interface PlayerBet {
  address: string;
  amount: number;
  cashOutMultiplier: number | null;
  profit: number | null;
  isAgent: boolean;
  isGhost?: boolean;
}

export interface GameState {
  roundId: number;
  phase: RoundPhase;
  multiplier: number;
  crashPoint: number | null;
  serverSeed: string | null;
  commitHash: string | null;
  bets: PlayerBet[];
  startTime: number | null;
  bettingEndsAt: number | null;
  countdown: number;
}

export interface RoundHistory {
  roundId: number;
  crashPoint: number;
  serverSeed: string;
}

const DEFAULT_STATE: GameState = {
  roundId: 0,
  phase: "waiting",
  multiplier: 100,
  crashPoint: null,
  serverSeed: null,
  commitHash: null,
  bets: [],
  startTime: null,
  bettingEndsAt: null,
  countdown: 0,
};

export function useGameStream() {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [connected, setConnected] = useState(false);
  const [agentThinking, setAgentThinking] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastTickUpdateRef = useRef(0);

  useEffect(() => {
    const es = new EventSource("/api/game/stream");
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      // Reconnect handled automatically by EventSource
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        switch (parsed.type) {
          case "state":
            setState(parsed.data);
            break;

          case "history":
            setHistory(parsed.data);
            break;

          case "countdown":
            setState((prev) => ({
              ...prev,
              phase: "waiting",
              countdown: parsed.data.countdown,
              ...(parsed.data.roundId ? { roundId: parsed.data.roundId } : {}),
            }));
            break;

          case "betting_open":
            setState((prev) => ({
              ...prev,
              phase: "betting",
              multiplier: 100,
              crashPoint: null,
              serverSeed: null,
              bets: [],
              bettingEndsAt: parsed.data.bettingEndsAt,
              ...(parsed.data.roundId ? { roundId: parsed.data.roundId } : {}),
              ...(parsed.data.commitHash
                ? { commitHash: parsed.data.commitHash }
                : {}),
            }));
            break;

          case "round_start":
            setState((prev) => ({
              ...prev,
              phase: "active",
              startTime: parsed.data.startTime,
              multiplier: 100,
            }));
            break;

          case "multiplier_tick": {
            // Throttle React state updates to ~2fps — CrashDisplay computes
            // its own 60fps multiplier client-side via startTime interpolation.
            // This prevents the entire component tree from re-rendering 20x/sec.
            const now = Date.now();
            if (now - lastTickUpdateRef.current > 500) {
              lastTickUpdateRef.current = now;
              setState((prev) => ({
                ...prev,
                multiplier: parsed.data.multiplier,
              }));
            }
            break;
          }

          case "player_bet":
            setState((prev) => ({
              ...prev,
              bets: [
                ...prev.bets,
                {
                  address: parsed.data.address,
                  amount: parsed.data.amount,
                  cashOutMultiplier: null,
                  profit: null,
                  isAgent: parsed.data.isAgent || false,
                  isGhost: parsed.data.isGhost || false,
                },
              ],
            }));
            break;

          case "player_cashout":
            setState((prev) => ({
              ...prev,
              bets: prev.bets.map((b) =>
                b.address === parsed.data.address
                  ? {
                      ...b,
                      cashOutMultiplier: parsed.data.multiplier,
                      profit: parsed.data.profit,
                    }
                  : b
              ),
            }));
            break;

          case "crashed":
            setState((prev) => ({
              ...prev,
              phase: "crashed",
              crashPoint: parsed.data.crashPoint,
              serverSeed: parsed.data.serverSeed,
              multiplier: parsed.data.crashPoint || prev.multiplier,
              bets: parsed.data.bets || prev.bets,
            }));
            // Add to history
            if (parsed.data.roundId && parsed.data.crashPoint) {
              setHistory((prev) => [
                {
                  roundId: parsed.data.roundId,
                  crashPoint: parsed.data.crashPoint,
                  serverSeed: parsed.data.serverSeed || "",
                },
                ...prev.slice(0, 49),
              ]);
            }
            break;

          case "agent_thinking":
            if (parsed.data.agentThinking !== undefined) {
              setAgentThinking(parsed.data.agentThinking);
            }
            break;
        }
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  const placeBet = useCallback(
    async (address: string, amount: number) => {
      const res = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bet", address, amount }),
      });
      return res.json();
    },
    []
  );

  const cashOut = useCallback(async (address: string) => {
    const res = await fetch("/api/game/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cashout", address }),
    });
    return res.json();
  }, []);

  return {
    state,
    history,
    connected,
    agentThinking,
    placeBet,
    cashOut,
  };
}
