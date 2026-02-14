"use client";

import { useEffect, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { CrashDisplay } from "@/components/crash-display";
import { BetPanel } from "@/components/bet-panel";
import { AgentStrip } from "@/components/agent-panel";
import { RoundHistoryBar } from "@/components/round-history";
import { Leaderboard } from "@/components/leaderboard";
import { useGameStream } from "@/hooks/use-game-stream";
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useGameSounds } from "@/hooks/use-game-sounds";

export default function Home() {
  const { state, history, connected, agentThinking, placeBet, cashOut } =
    useGameStream();
  const { price: bnbPrice, toUsd } = useBnbPrice();
  const sounds = useGameSounds();

  // Sound: phase changes
  useEffect(() => {
    sounds.onPhaseChange(state.phase);
  }, [state.phase, sounds]);

  // Wrap placeBet/cashOut with sound
  const placeBetWithSound = useCallback(
    async (address: string, amount: number) => {
      sounds.onBet();
      return placeBet(address, amount);
    },
    [placeBet, sounds]
  );

  const cashOutWithSound = useCallback(
    async (address: string) => {
      sounds.onCashout();
      return cashOut(address);
    },
    [cashOut, sounds]
  );

  return (
    <div
      className="flex flex-col min-h-screen text-zinc-100"
      style={{ background: "linear-gradient(180deg, #060608 0%, #0a0a0e 50%, #060608 100%)" }}
    >
      <Navbar
        connected={connected}
        roundId={state.roundId}
        bnbPrice={bnbPrice}
        onToggleSound={sounds.toggleSound}
      />

      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-3 py-2 gap-2 min-h-0">
        {/* Round history */}
        <RoundHistoryBar history={history} />

        {/* Main game grid — fills remaining viewport */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
          <div className="lg:col-span-8 min-h-[340px]">
            <CrashDisplay
              phase={state.phase}
              multiplier={state.multiplier}
              crashPoint={state.crashPoint}
              countdown={state.countdown}
              roundId={state.roundId}
              startTime={state.startTime}
              onTick={sounds.onTick}
            />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-2">
            <BetPanel
              phase={state.phase}
              bets={state.bets}
              placeBet={placeBetWithSound}
              cashOut={cashOutWithSound}
              multiplier={state.multiplier}
              toUsd={toUsd}
            />

            <AgentStrip
              phase={state.phase}
              bets={state.bets}
              multiplier={state.multiplier}
              history={history}
              thinking={agentThinking}
              toUsd={toUsd}
            />

            <Leaderboard bets={state.bets} phase={state.phase} toUsd={toUsd} />
          </div>
        </div>

        {/* Provably fair footer */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex items-center gap-2 text-zinc-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span>Provably fair — commit-reveal on-chain</span>
            {state.commitHash && (
              <span className="font-mono text-zinc-500 hidden sm:inline">
                {state.commitHash.slice(0, 10)}...
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <a
              href="https://testnet.opbnbscan.com/address/0x37E04515eD142A824c853CC74a76Cb9E0119CfFe"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/15 hover:bg-amber-500/20 transition-colors"
            >
              opBNB
            </a>
            <a
              href="https://testnet.bscscan.com/address/0x8721504d22ca89277D8Bd70B9260B55FCB7F2d1C"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-300/80 border border-zinc-500/15 hover:bg-zinc-500/20 transition-colors"
            >
              BSC
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
