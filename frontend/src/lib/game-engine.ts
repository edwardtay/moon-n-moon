import {
  generateServerSeed,
  deriveCrashPoint,
  createCommitHash,
  serverSeedToBytes32,
} from "./fairness";
import {
  onChainStartRound,
  onChainLockRound,
  onChainEndRound,
  onChainRecordCashOut,
  isChainEnabled,
} from "./chain-client";

// --- Types ---

export type RoundPhase = "waiting" | "betting" | "active" | "crashed";

export interface PlayerBet {
  address: string;
  amount: number; // in BNB
  cashOutMultiplier: number | null; // null = still in / didn't cash out
  profit: number | null;
  isAgent: boolean;
}

export interface RoundState {
  roundId: number;
  phase: RoundPhase;
  multiplier: number; // current multiplier scaled x100 (e.g., 250 = 2.50x)
  crashPoint: number | null; // revealed after crash, scaled x100
  serverSeed: string | null; // revealed after crash
  commitHash: string | null;
  bets: PlayerBet[];
  startTime: number | null; // ms timestamp when multiplier starts growing
  bettingEndsAt: number | null;
  countdown: number; // seconds until next phase
}

export interface GameEvent {
  type:
    | "round_start"
    | "betting_open"
    | "multiplier_tick"
    | "player_bet"
    | "player_cashout"
    | "crashed"
    | "round_end"
    | "countdown"
    | "agent_thinking";
  data: Partial<RoundState> & Record<string, unknown>;
}

// --- Game Engine Singleton ---

type Listener = (event: GameEvent) => void;

const BETTING_DURATION = 10_000; // 10 seconds
const COUNTDOWN_DURATION = 5_000; // 5 seconds between rounds
const TICK_INTERVAL = 50; // 50ms ticks for smooth animation

export interface AgentStats {
  balance: number;
  totalProfit: number;
  roundsPlayed: number;
  wins: number;
  losses: number;
}

class GameEngine {
  private state: RoundState = {
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

  private listeners = new Set<Listener>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private _currentServerSeed: string | null = null;
  private _currentCrashPoint: number | null = null;
  private running = false;

  // Agent stats tracked directly in engine
  agentStats: AgentStats = {
    balance: 1.0,
    totalProfit: 0,
    roundsPlayed: 0,
    wins: 0,
    losses: 0,
  };

  // Agent thinking text — set by agent-player, broadcast to clients
  private _agentThinking = "";
  get agentThinking() {
    return this._agentThinking;
  }
  set agentThinking(val: string) {
    if (val !== this._agentThinking) {
      this._agentThinking = val;
      this.emit({
        type: "agent_thinking",
        data: { agentThinking: val },
      });
    }
  }

  // History of recent rounds
  private history: Array<{
    roundId: number;
    crashPoint: number;
    serverSeed: string;
  }> = [];

  getState(): RoundState {
    return { ...this.state };
  }

  getHistory() {
    return [...this.history];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: GameEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // don't let one bad listener break the game
      }
    }
  }

  /**
   * Start the game loop. Runs indefinitely.
   */
  async start() {
    if (this.running) {
      console.log("[engine] Already running, skipping start");
      return;
    }
    this.running = true;
    console.log("[engine] Game engine started!");

    while (this.running) {
      await this.runRound();
      // Brief pause between rounds
      await this.sleep(2000);
    }
  }

  stop() {
    this.running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /**
   * Run a single round: countdown → betting → active → crashed
   */
  private async runRound() {
    console.log(`[engine] Starting round ${this.state.roundId + 1}`);
    // Generate crash point
    this._currentServerSeed = generateServerSeed();
    const roundId = this.state.roundId + 1;
    this._currentCrashPoint = deriveCrashPoint(
      this._currentServerSeed,
      roundId
    );
    const commitHash = createCommitHash(
      this._currentCrashPoint,
      this._currentServerSeed
    );

    // --- Countdown phase ---
    this.state = {
      roundId,
      phase: "waiting",
      multiplier: 100,
      crashPoint: null,
      serverSeed: null,
      commitHash,
      bets: [],
      startTime: null,
      bettingEndsAt: null,
      countdown: COUNTDOWN_DURATION / 1000,
    };

    this.emit({
      type: "countdown",
      data: { roundId, countdown: this.state.countdown },
    });

    // Count down
    for (
      let i = COUNTDOWN_DURATION / 1000;
      i > 0 && this.running;
      i--
    ) {
      this.state.countdown = i;
      this.emit({ type: "countdown", data: { countdown: i } });
      await this.sleep(1000);
    }

    if (!this.running) return;

    // --- Betting phase ---
    const bettingEndsAt = Date.now() + BETTING_DURATION;
    this.state.phase = "betting";
    this.state.bettingEndsAt = bettingEndsAt;

    // Fire on-chain startRound (fire and forget)
    if (isChainEnabled()) {
      onChainStartRound(commitHash).catch(() => {});
    }

    this.emit({
      type: "betting_open",
      data: { roundId, bettingEndsAt, commitHash },
    });

    // Wait for betting to close
    await this.sleep(BETTING_DURATION);
    if (!this.running) return;

    // --- Active phase: multiplier grows ---
    this.state.phase = "active";
    this.state.startTime = Date.now();
    this.state.multiplier = 100;

    // Fire on-chain lockRound (fire and forget)
    if (isChainEnabled()) {
      onChainLockRound().catch(() => {});
    }

    this.emit({
      type: "round_start",
      data: { roundId, startTime: this.state.startTime },
    });

    // Tick loop
    await new Promise<void>((resolve) => {
      this.tickTimer = setInterval(() => {
        if (!this.running) {
          clearInterval(this.tickTimer!);
          resolve();
          return;
        }

        const elapsed = Date.now() - this.state.startTime!;
        // multiplier = 1.00 * e^(0.00006 * elapsed)
        // At 100ms: ~1.006x, at 1s: ~1.06x, at 5s: ~1.35x, at 10s: ~1.82x
        const rawMultiplier = Math.floor(
          100 * Math.exp(0.00006 * elapsed)
        );
        this.state.multiplier = rawMultiplier;

        this.emit({
          type: "multiplier_tick",
          data: {
            multiplier: rawMultiplier,
            elapsed,
          },
        });

        // Check if crashed
        if (rawMultiplier >= this._currentCrashPoint!) {
          clearInterval(this.tickTimer!);
          this.tickTimer = null;
          this.state.multiplier = this._currentCrashPoint!;
          resolve();
        }
      }, TICK_INTERVAL);
    });

    if (!this.running) return;

    // --- Crashed ---
    this.state.phase = "crashed";
    this.state.crashPoint = this._currentCrashPoint!;
    this.state.serverSeed = this._currentServerSeed!;

    // Mark non-cashed-out bets as lost
    for (const bet of this.state.bets) {
      if (bet.cashOutMultiplier === null) {
        bet.profit = -bet.amount;
      }
    }

    // Fire on-chain endRound with crash point + salt (fire and forget)
    if (isChainEnabled() && this._currentServerSeed) {
      const salt = serverSeedToBytes32(this._currentServerSeed);
      onChainEndRound(this._currentCrashPoint!, salt).catch(() => {});
    }

    this.emit({
      type: "crashed",
      data: {
        roundId,
        crashPoint: this._currentCrashPoint!,
        serverSeed: this._currentServerSeed!,
        multiplier: this._currentCrashPoint!,
        bets: this.state.bets,
      },
    });

    // Save to history (keep last 50)
    this.history.unshift({
      roundId,
      crashPoint: this._currentCrashPoint!,
      serverSeed: this._currentServerSeed!,
    });
    if (this.history.length > 50) this.history.pop();
  }

  /**
   * Player places a bet for the current round.
   */
  placeBet(address: string, amount: number, isAgent = false): boolean {
    if (this.state.phase !== "betting") return false;
    if (amount <= 0) return false;

    // Check if already bet
    if (this.state.bets.find((b) => b.address === address)) return false;

    const bet: PlayerBet = {
      address,
      amount,
      cashOutMultiplier: null,
      profit: null,
      isAgent,
    };

    this.state.bets.push(bet);
    this.emit({
      type: "player_bet",
      data: { address, amount, isAgent, roundId: this.state.roundId },
    });

    return true;
  }

  /**
   * Player cashes out at the current multiplier.
   */
  cashOut(address: string): { multiplier: number; profit: number } | null {
    if (this.state.phase !== "active") return null;

    const bet = this.state.bets.find((b) => b.address === address);
    if (!bet || bet.cashOutMultiplier !== null) return null;

    const multiplier = this.state.multiplier;

    // Can only cash out if multiplier hasn't crashed yet
    if (this._currentCrashPoint && multiplier >= this._currentCrashPoint)
      return null;

    bet.cashOutMultiplier = multiplier;
    bet.profit = (bet.amount * multiplier) / 100 - bet.amount;

    // Fire on-chain recordCashOut (fire and forget)
    if (isChainEnabled() && !bet.isAgent) {
      onChainRecordCashOut(address, multiplier).catch(() => {});
    }

    this.emit({
      type: "player_cashout",
      data: {
        address,
        multiplier,
        profit: bet.profit,
        isAgent: bet.isAgent,
        roundId: this.state.roundId,
      },
    });

    return { multiplier, profit: bet.profit };
  }

  /**
   * Get contract-ready data for on-chain operations.
   */
  getContractData() {
    return {
      roundId: this.state.roundId,
      commitHash: this.state.commitHash,
      crashMultiplier: this._currentCrashPoint,
      salt: this._currentServerSeed
        ? serverSeedToBytes32(this._currentServerSeed)
        : null,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton via globalThis to survive Next.js module reloads
const globalForGame = globalThis as unknown as { __gameEngine?: GameEngine };
export const gameEngine = globalForGame.__gameEngine ?? new GameEngine();
globalForGame.__gameEngine = gameEngine;
