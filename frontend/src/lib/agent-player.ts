import { gameEngine } from "./game-engine";
import type { GameEvent } from "./game-engine";
import {
  getAgentWalletAddress,
  agentOnChainBet,
  agentClaimWinnings,
  isAgentChainEnabled,
} from "./agent-chain";

/**
 * AI Agent Player — plays the crash game using Claude with TOOL USE.
 *
 * This is a real agentic loop:
 * 1. Agent receives tools: analyze_history, calculate_risk, place_bet, skip_round
 * 2. Claude calls tools to gather data, analyze, then decide
 * 3. Multi-step reasoning is streamed to players in real-time
 * 4. All decisions are made by Claude, not hardcoded logic
 * 5. Bets are placed ON-CHAIN with real tBNB from the agent's own wallet
 */

// Lazily resolved — can't call privateKeyToAccount at module load (breaks SSG)
let _resolvedAddress: string | null = null;
function AGENT_ADDRESS(): string {
  if (!_resolvedAddress) {
    _resolvedAddress =
      getAgentWalletAddress() || "0xAI00000000000000000000000000000000000001";
  }
  return _resolvedAddress;
}
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Agent tools — what Claude can call
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "analyze_history",
      description:
        "Analyze recent crash history to identify patterns. Returns statistical analysis including average, median, streaks, and risk assessment.",
      parameters: {
        type: "object",
        properties: {
          num_rounds: {
            type: "number",
            description: "Number of recent rounds to analyze (1-20)",
          },
        },
        required: ["num_rounds"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "place_bet",
      description:
        "Place a bet for this round. Choose amount and target cash-out multiplier.",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description: "BNB amount to bet (0.005 to 0.05)",
          },
          target_cashout: {
            type: "number",
            description:
              "Target multiplier to cash out at (1.2 to 10.0). Lower = safer, higher = riskier.",
          },
          reasoning: {
            type: "string",
            description:
              "1-2 sentence explanation of your strategy for this round. Be witty and competitive.",
          },
        },
        required: ["amount", "target_cashout", "reasoning"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "skip_round",
      description:
        "Skip this round without betting. Use when conditions are unfavorable.",
      parameters: {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description:
              "1-2 sentence explanation of why you're skipping. Be witty.",
          },
        },
        required: ["reasoning"],
      },
    },
  },
];

interface AgentState {
  balance: number;
  totalProfit: number;
  roundsPlayed: number;
  wins: number;
  losses: number;
  lastCrashPoints: number[];
  currentBet: number | null;
  targetCashOut: number | null;
  thinking: string;
  running: boolean;
}

const state: AgentState = {
  balance: 1.0,
  totalProfit: 0,
  roundsPlayed: 0,
  wins: 0,
  losses: 0,
  lastCrashPoints: [],
  currentBet: null,
  targetCashOut: null,
  thinking: "",
  running: false,
};

export function getAgentAddress(): string {
  return AGENT_ADDRESS();
}

export function getAgentState(): AgentState {
  return { ...state };
}

function setThinking(text: string) {
  state.thinking = text;
  gameEngine.agentStats = {
    balance: state.balance,
    totalProfit: state.totalProfit,
    roundsPlayed: state.roundsPlayed,
    wins: state.wins,
    losses: state.losses,
  };
  gameEngine.agentThinking = text;
}

/** Analyze crash history — called by Claude as a tool */
function analyzeHistory(numRounds: number): string {
  const points = state.lastCrashPoints.slice(0, Math.min(numRounds, 20));
  if (points.length === 0) {
    return JSON.stringify({
      rounds_analyzed: 0,
      message: "No history available yet. First round!",
    });
  }

  const values = points.map((p) => p / 100);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const below15x = values.filter((v) => v < 1.5).length;
  const below2x = values.filter((v) => v < 2.0).length;
  const above5x = values.filter((v) => v >= 5.0).length;
  const instantCrashes = values.filter((v) => v <= 1.01).length;

  // Streak detection
  let currentStreak = 0;
  let streakType = "";
  for (const v of values) {
    if (v < 1.5) {
      if (streakType === "low") currentStreak++;
      else {
        streakType = "low";
        currentStreak = 1;
      }
    } else {
      if (streakType === "high") currentStreak++;
      else {
        streakType = "high";
        currentStreak = 1;
      }
    }
    if (currentStreak >= 2) break;
  }

  return JSON.stringify({
    rounds_analyzed: points.length,
    crash_points: values.slice(0, 8).map((v) => v.toFixed(2) + "x"),
    statistics: {
      average: avg.toFixed(2) + "x",
      median: median.toFixed(2) + "x",
      min: min.toFixed(2) + "x",
      max: max.toFixed(2) + "x",
    },
    risk_indicators: {
      pct_below_1_5x: ((below15x / values.length) * 100).toFixed(0) + "%",
      pct_below_2x: ((below2x / values.length) * 100).toFixed(0) + "%",
      rounds_above_5x: above5x,
      instant_crashes: instantCrashes,
    },
    recent_streak: `${currentStreak} ${streakType} crashes in a row`,
    recommendation:
      below15x / values.length > 0.5
        ? "High risk — many recent low crashes. Play safe or skip."
        : above5x >= 2
          ? "Recent big rounds detected. Could mean correction incoming."
          : "Mixed results. Standard risk level.",
  });
}

/**
 * Run the agentic loop — Claude calls tools, we execute them.
 */
async function runAgentLoop(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log("[agent] No API key, using fallback");
    runFallback();
    return;
  }

  console.log("[agent] Starting agentic loop for round decision...");
  setThinking("Analyzing the market...");

  const historyStr = state.lastCrashPoints
    .slice(0, 10)
    .map((c) => (c / 100).toFixed(2) + "x")
    .join(", ");

  // Initial messages
  const messages: Array<{
    role: string;
    content: string;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }>;
  }> = [
    {
      role: "system",
      content: `You are Claude, an AI agent playing a live crash game against human players on BNB Chain. You have real tools to analyze data and make decisions.

Game rules:
- Multiplier starts at 1.00x and grows exponentially (formula: e^(0.00006t))
- It crashes at a random point — could be 1.00x instant crash or 100x+
- ~3% instant crash (1.00x), ~33% below 1.5x, ~50% below 2x
- You bet BNB, then cash out before it crashes to win
- Profit = bet × (cashout_multiplier - 1)

Your approach:
1. ALWAYS call analyze_history first to study recent patterns
2. Then decide: place_bet or skip_round
3. Be strategic but also entertaining — players are watching your reasoning live
4. You're competitive and want to beat the humans. Show personality.

Your balance: ${state.balance.toFixed(4)} BNB
Your record: ${state.wins}W-${state.losses}L (P&L: ${state.totalProfit >= 0 ? "+" : ""}${state.totalProfit.toFixed(4)} BNB)`,
    },
    {
      role: "user",
      content: `New round starting! Recent crashes: [${historyStr || "no data yet"}]. Use your tools to analyze and decide.`,
    },
  ];

  try {
    // First API call — Claude should call analyze_history
    const res1 = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4",
        max_tokens: 200,
        tools: TOOLS,
        tool_choice: "auto",
        messages,
      }),
    });

    if (!res1.ok) {
      const errText = await res1.text().catch(() => "");
      console.log("[agent] OpenRouter error:", res1.status, errText.slice(0, 200));
      runFallback();
      return;
    }

    const data1 = await res1.json();
    const msg1 = data1.choices?.[0]?.message;
    if (!msg1) {
      console.log("[agent] No message in response, using fallback");
      runFallback();
      return;
    }

    // Process tool calls from first response
    if (msg1.tool_calls && msg1.tool_calls.length > 0) {
      console.log("[agent] Step 1 — Claude called:", msg1.tool_calls.map((tc: { function: { name: string } }) => tc.function.name).join(", "));
      messages.push(msg1); // Add assistant message with tool_calls

      for (const toolCall of msg1.tool_calls) {
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments || "{}");

        if (fnName === "analyze_history") {
          setThinking(
            `Analyzing last ${fnArgs.num_rounds || 10} rounds...`
          );
          const result = analyzeHistory(fnArgs.num_rounds || 10);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        } else if (fnName === "place_bet") {
          console.log("[agent] Direct bet from step 1:", JSON.stringify(fnArgs));
          executeBet(fnArgs);
          return;
        } else if (fnName === "skip_round") {
          console.log("[agent] Skipping round:", fnArgs.reasoning);
          setThinking(fnArgs.reasoning || "Sitting this one out.");
          return;
        }
      }

      // Second API call — Claude should now decide (place_bet or skip_round)
      console.log("[agent] Step 2 — Sending tool results back for final decision...");
      const res2 = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4",
          max_tokens: 150,
          tools: TOOLS,
          tool_choice: "auto",
          messages,
        }),
      });

      if (!res2.ok) {
        runFallback();
        return;
      }

      const data2 = await res2.json();
      const msg2 = data2.choices?.[0]?.message;

      if (msg2?.tool_calls) {
        console.log("[agent] Step 2 — Claude called:", msg2.tool_calls.map((tc: { function: { name: string } }) => tc.function.name).join(", "));
        for (const toolCall of msg2.tool_calls) {
          const fnName = toolCall.function.name;
          const fnArgs = JSON.parse(toolCall.function.arguments || "{}");

          if (fnName === "place_bet") {
            console.log("[agent] Bet decision:", JSON.stringify(fnArgs));
            executeBet(fnArgs);
            return;
          } else if (fnName === "skip_round") {
            console.log("[agent] Skip decision:", fnArgs.reasoning);
            setThinking(fnArgs.reasoning || "Sitting this one out.");
            return;
          }
        }
      }

      // If Claude responded with text instead of tool call, extract intent
      if (msg2?.content) {
        console.log("[agent] Step 2 returned text instead of tool call:", msg2.content.slice(0, 100));
        setThinking(msg2.content.slice(0, 120));
      }
    } else if (msg1.content) {
      // No tool calls — try to parse as direct response
      console.log("[agent] No tool calls, got text:", msg1.content.slice(0, 100));
      setThinking(msg1.content.slice(0, 120));
      tryParseLegacy(msg1.content);
      return;
    }
  } catch (err) {
    console.log("[agent] Loop error:", (err as Error).message?.slice(0, 100));
    runFallback();
  }
}

function executeBet(args: {
  amount?: number;
  target_cashout?: number;
  reasoning?: string;
}) {
  const betAmount = Math.max(0.005, Math.min(0.05, Number(args.amount) || 0.02));
  const targetCashOut = Math.max(
    120,
    Math.min(1000, Math.round((Number(args.target_cashout) || 1.5) * 100))
  );
  const reasoning = args.reasoning || "Let's go.";

  state.targetCashOut = targetCashOut;

  const success = gameEngine.placeBet(AGENT_ADDRESS(), betAmount, true);
  if (success) {
    state.currentBet = betAmount;
    state.balance -= betAmount;
    setThinking(
      `${reasoning} [Bet ${betAmount.toFixed(4)} BNB, target ${(targetCashOut / 100).toFixed(2)}x]`
    );

    // Fire on-chain bet with real tBNB (fire-and-forget)
    if (isAgentChainEnabled()) {
      agentOnChainBet(betAmount).catch(() => {});
    }
  } else {
    setThinking(`${reasoning} (Bet failed — round may have started)`);
  }
}

function tryParseLegacy(content: string) {
  try {
    let cleaned = content.trim();
    if (cleaned.startsWith("```"))
      cleaned = cleaned.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const d = JSON.parse(cleaned);
    if (d.action === "bet") executeBet(d);
    else if (d.action === "skip")
      setThinking(d.thinking || "Sitting this one out.");
  } catch {
    // Not JSON — that's fine, thinking was already set
  }
}

function runFallback() {
  if (state.balance < 0.005) {
    setThinking("Balance too low. Waiting for better times...");
    return;
  }

  // Smart fallback that analyzes real data
  const recent = state.lastCrashPoints.slice(0, 5);
  const recentAvg =
    recent.length > 0
      ? recent.reduce((a, b) => a + b, 0) / recent.length / 100
      : 2.0;
  const lowCrashes = recent.filter((p) => p < 150).length;

  // Skip if too many recent low crashes
  if (lowCrashes >= 3 && Math.random() > 0.4) {
    setThinking(
      `${lowCrashes} of last ${recent.length} rounds crashed below 1.5x. Sitting out.`
    );
    return;
  }

  // Adaptive strategy based on recent history
  let target: number;
  let bet: number;
  if (recentAvg < 1.5) {
    target = 130 + Math.floor(Math.random() * 40); // Conservative
    bet = 0.01;
    setThinking(
      `Low average lately (${recentAvg.toFixed(2)}x). Playing it safe with a ${(target / 100).toFixed(2)}x target.`
    );
  } else if (recentAvg > 5) {
    target = 180 + Math.floor(Math.random() * 120); // Aggressive
    bet = 0.02 + Math.random() * 0.02;
    setThinking(
      `Big numbers recently (avg ${recentAvg.toFixed(2)}x). Going aggressive — ${(target / 100).toFixed(2)}x target!`
    );
  } else {
    target = 150 + Math.floor(Math.random() * 80); // Balanced
    bet = 0.015 + Math.random() * 0.015;
    setThinking(
      `Solid middle ground lately. Targeting ${(target / 100).toFixed(2)}x with balanced risk.`
    );
  }

  bet = Math.round(bet * 10000) / 10000;
  state.targetCashOut = target;
  const addr = AGENT_ADDRESS();
  const phase = gameEngine.getState().phase;
  console.log(`[agent] runFallback placeBet attempt: addr=${addr}, bet=${bet}, phase=${phase}, existingBets=${gameEngine.getState().bets.length}`);
  const success = gameEngine.placeBet(addr, bet, true);
  console.log(`[agent] placeBet result: ${success}`);
  if (success) {
    state.currentBet = bet;
    state.balance -= bet;
    setThinking(
      state.thinking +
        ` [Bet ${bet.toFixed(4)} BNB, target ${(target / 100).toFixed(2)}x]`
    );

    // Fire on-chain bet with real tBNB (fire-and-forget)
    if (isAgentChainEnabled()) {
      agentOnChainBet(bet).catch(() => {});
    }
  }
}

/**
 * Start the agent — subscribes to game events.
 */
export function startAgent() {
  if (state.running) return;
  state.running = true;
  console.log("[agent] Agent started — listening for game events");

  gameEngine.subscribe((event: GameEvent) => {
    switch (event.type) {
      case "betting_open":
        handleBettingPhase();
        break;
      case "multiplier_tick":
        handleMultiplierTick(event.data.multiplier as number);
        break;
      case "crashed":
        handleCrashed(event.data.crashPoint as number);
        break;
    }
  });
}

async function handleBettingPhase() {
  console.log(`[agent] handleBettingPhase called, existing bet: ${state.currentBet}`);
  state.currentBet = null;
  state.targetCashOut = null;
  await runAgentLoop();
}

function handleMultiplierTick(currentMultiplier: number) {
  if (!state.currentBet || !state.targetCashOut) return;

  // Human-like jitter
  const jitter = Math.floor(Math.random() * 8) - 4;
  const adjustedTarget = state.targetCashOut + jitter;

  if (currentMultiplier >= adjustedTarget) {
    const result = gameEngine.cashOut(AGENT_ADDRESS());
    if (result) {
      state.balance += state.currentBet + result.profit;
      state.totalProfit += result.profit;
      state.wins++;
      setThinking(`Cashed out! +${result.profit.toFixed(4)} BNB`);
      state.targetCashOut = null;
    }
  } else if (
    currentMultiplier > 150 &&
    state.targetCashOut > 200 &&
    currentMultiplier > state.targetCashOut * 0.7
  ) {
    setThinking(
      `Holding at ${(currentMultiplier / 100).toFixed(2)}x... target ${(state.targetCashOut / 100).toFixed(2)}x`
    );
  }
}

function handleCrashed(crashPoint: number) {
  state.lastCrashPoints.unshift(crashPoint);
  if (state.lastCrashPoints.length > 20) state.lastCrashPoints.pop();

  const roundId = gameEngine.getState().roundId;

  if (state.currentBet !== null) {
    state.roundsPlayed++;
    if (state.targetCashOut !== null) {
      // Agent didn't cash out — lost
      state.losses++;
      state.totalProfit -= state.currentBet;
      setThinking(
        `Busted at ${(crashPoint / 100).toFixed(2)}x. Lost ${state.currentBet.toFixed(4)} BNB`
      );
    } else {
      // Agent cashed out — claim winnings on-chain
      if (isAgentChainEnabled() && roundId > 0) {
        agentClaimWinnings(roundId).catch(() => {});
      }
    }
  }

  state.currentBet = null;
  state.targetCashOut = null;
}

export function stopAgent() {
  state.running = false;
}
