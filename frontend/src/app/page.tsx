"use client";

import { Navbar } from "@/components/navbar";
import { CrashDisplay } from "@/components/crash-display";
import { BetPanel } from "@/components/bet-panel";
import { AgentPanel } from "@/components/agent-panel";
import { RoundHistoryBar } from "@/components/round-history";
import { Leaderboard } from "@/components/leaderboard";
import { VsBanner } from "@/components/vs-banner";
import { useGameStream } from "@/hooks/use-game-stream";
import { useBnbPrice } from "@/hooks/use-bnb-price";

export default function Home() {
  const { state, history, connected, agentThinking, placeBet, cashOut } =
    useGameStream();
  const { price: bnbPrice, toUsd } = useBnbPrice();

  return (
    <div
      className="flex flex-col min-h-screen text-zinc-100"
      style={{ background: "linear-gradient(180deg, #060608 0%, #0a0a0e 50%, #060608 100%)" }}
    >
      <Navbar />

      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 py-5 gap-5">
        {/* Hero + connection + BNB price */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">
              Can you beat the AI?
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Cash out before Claude does — or watch it all crash.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs pb-1">
            {bnbPrice && (
              <span className="font-mono text-amber-400/80">
                BNB ${bnbPrice.toFixed(2)}
              </span>
            )}
            <span className="relative flex h-2 w-2">
              {connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${connected ? "bg-emerald-400" : "bg-red-500"}`}
              />
            </span>
            <span className="text-zinc-400 font-mono">
              {connected ? "Live" : "Connecting..."}
              {state.roundId > 0 && ` · #${state.roundId}`}
            </span>
          </div>
        </div>

        {/* VS Banner */}
        <VsBanner
          bets={state.bets}
          history={history}
          agentThinking={agentThinking}
          toUsd={toUsd}
        />

        {/* Round history */}
        <RoundHistoryBar history={history} />

        {/* Main game grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CrashDisplay
              phase={state.phase}
              multiplier={state.multiplier}
              crashPoint={state.crashPoint}
              countdown={state.countdown}
              roundId={state.roundId}
              startTime={state.startTime}
            />
          </div>

          <div className="space-y-4">
            <BetPanel
              phase={state.phase}
              bets={state.bets}
              placeBet={placeBet}
              cashOut={cashOut}
              multiplier={state.multiplier}
              toUsd={toUsd}
            />
            <AgentPanel
              phase={state.phase}
              bets={state.bets}
              multiplier={state.multiplier}
              history={history}
              thinking={agentThinking}
              toUsd={toUsd}
            />
          </div>
        </div>

        {/* Bottom section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Leaderboard bets={state.bets} phase={state.phase} toUsd={toUsd} />

          {/* Provably fair */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.2em] mb-3">
              Provably Fair
            </h3>
            {state.phase === "crashed" && state.serverSeed ? (
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-zinc-400">Crash </span>
                  <span className="text-zinc-200 font-bold">
                    {state.crashPoint
                      ? (state.crashPoint / 100).toFixed(2)
                      : "—"}
                    x
                  </span>
                </div>
                <div className="break-all">
                  <span className="text-zinc-400">Seed </span>
                  <span className="text-zinc-400">{state.serverSeed}</span>
                </div>
                <div className="break-all">
                  <span className="text-zinc-400">Hash </span>
                  <span className="text-zinc-400">{state.commitHash}</span>
                </div>
                <p className="text-zinc-400 text-[10px] leading-relaxed mt-2 font-sans">
                  keccak256(multiplier, seed) = hash. Committed before round.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {state.commitHash ? (
                  <div className="font-mono break-all">
                    <span className="text-zinc-400">Commit </span>
                    <span className="text-zinc-400">{state.commitHash}</span>
                  </div>
                ) : (
                  <p className="text-zinc-400 leading-relaxed">
                    Each crash point is committed before betting, then revealed
                    after. Fully verifiable on BNB Chain.
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                  <span className="text-[10px]">Commit-reveal on opBNB + BSC</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <a
                    href="https://testnet.opbnbscan.com/address/0x37E04515eD142A824c853CC74a76Cb9E0119CfFe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-mono px-2 py-1 rounded-md bg-amber-500/10 text-amber-400/80 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                  >
                    opBNB Testnet
                  </a>
                  <a
                    href="https://testnet.bscscan.com/address/0x8721504d22ca89277D8Bd70B9260B55FCB7F2d1C"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-mono px-2 py-1 rounded-md bg-zinc-500/10 text-zinc-400/80 border border-zinc-500/20 hover:bg-zinc-500/20 transition-colors"
                  >
                    BSC Testnet
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
