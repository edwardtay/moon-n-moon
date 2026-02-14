# MnM (Moon n Moon)

A provably fair crash game on BNB Chain where you compete against an autonomous AI agent powered by Claude. Watch it think. Beat it to the cash out.

**Live:** [moon-n-moon.vercel.app](https://moon-n-moon.vercel.app)

## What is this?

A multiplier starts at 1.00x and climbs exponentially. It can crash at any moment — could be 1.01x, could be 50x. You bet BNB, watch the number climb, and cash out before the crash. Simple rules, infinite tension.

The twist: **Claude plays every round alongside you.** It analyzes crash history, calculates risk, and makes real-time bet/cash-out decisions using tool-use reasoning. All of its thinking is streamed live to every player. You're not just playing a game — you're competing against an AI that's learning the same patterns you are.

## How it works

1. **Bet** — Place BNB during the betting window
2. **Watch** — The multiplier climbs: 1.5x, 2x, 5x, 10x...
3. **Cash out** — Hit the button before it crashes. Your payout = bet × multiplier
4. **Crash** — If you don't cash out in time, you lose your bet

The crash point is locked before the round starts using a commit-reveal scheme. After the crash, the server seed is revealed so anyone can verify: `keccak256(crashMultiplier, salt) == commitHash`.

## AI Agent

Claude is a real autonomous player with its own wallet on BNB Chain. Every round:

1. Calls `analyze_history` to study recent crash patterns (streaks, averages, risk indicators)
2. Decides: `place_bet` with amount + target cash-out, or `skip_round` if conditions are bad
3. During the round, monitors the multiplier and cashes out at its target
4. All reasoning is visible to players in real-time via the Agent strip

The agent is registered on-chain via **ERC-8004** (AI Agent Identity Registry) as Agent #83 on BSC Testnet. Its metadata endpoint serves structured identity data at `/api/agent/metadata`.

## Architecture

```
frontend/     Next.js 16 + wagmi + viem + RainbowKit
contracts/    Foundry — CrashGame.sol (commit-reveal pattern)
```

**Hybrid on-chain/off-chain:**
- **On-chain (opBNB + BSC):** Commit-reveal round proofs, verifiable crash points, bet settlement
- **Off-chain (SSE):** Real-time multiplier at 60fps (client-side interpolation from `e^(0.00006t)`), instant bets, AI agent reasoning stream

**Why hybrid?** Crash games need sub-50ms latency for the multiplier feed. On-chain ticks are impossible. Instead, the crash point is committed on-chain before the round, and revealed after — giving players the speed of off-chain with the trust of on-chain verification.

## Contracts

| Contract | Address | Network |
|----------|---------|---------|
| CrashGame | [`0x12B64dF15e6277e5dD091899F1f00969890E6a3C`](https://testnet.opbnbscan.com/address/0x12B64dF15e6277e5dD091899F1f00969890E6a3C) | opBNB Testnet |
| CrashGame | [`0x872BAA82E95Fa13488B64577d402D91396de89c8`](https://testnet.bscscan.com/address/0x872BAA82E95Fa13488B64577d402D91396de89c8) | BSC Testnet |
| ERC-8004 Registry | Agent #83 on [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://testnet.bscscan.com/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) | BSC Testnet |

## Game Mechanics

- **Multiplier growth:** `1.00x × e^(0.00006 × elapsed_ms)` — smooth exponential curve
- **Crash distribution:** ~3% instant crash at 1.00x, ~33% below 1.5x, ~50% below 2x
- **Provably fair:** HMAC-SHA256 crash point derivation with on-chain commit-reveal
- **Client-side interpolation:** 60fps multiplier via `requestAnimationFrame`, server ticks throttled to 20fps for data points
- **Web Audio API sounds:** All game sounds synthesized in-browser (no external files)
- **localStorage persistence:** Win/loss records and crash history survive page refresh

## Running Locally

```bash
cd frontend
pnpm install
pnpm dev
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_id
NEXT_PUBLIC_CRASH_GAME_ADDRESS=0x37E04515eD142A824c853CC74a76Cb9E0119CfFe
OPENROUTER_API_KEY=your_openrouter_key
OPERATOR_PRIVATE_KEY=0x...
AGENT_PRIVATE_KEY=0x...
```

```bash
# Contracts
cd contracts
forge build
forge test
```

## License

MIT
