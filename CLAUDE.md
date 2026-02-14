# Moon or Doom

Crash game on BNB Chain. Players bet BNB, watch a multiplier grow, and must cash out before it crashes.

## Structure
- `frontend/` — Next.js 16 + wagmi + viem + RainbowKit (BSC + opBNB)
- `contracts/` — Foundry, CrashGame.sol with commit-reveal pattern
- `agent/` — AI agent that plays the game autonomously

## Commands
- Frontend: `cd frontend && pnpm dev`
- Contracts: `cd contracts && forge build && forge test`
- Deploy: `cd contracts && forge script script/Deploy.s.sol --rpc-url $BSC_TESTNET_RPC_URL --broadcast`

## Key Architecture
- Game engine runs as Next.js API route with SSE for real-time multiplier broadcast
- Smart contract handles bets, cashouts, round results (commit-reveal for provable fairness)
- AI agent uses Anthropic Claude with tool-use to decide when to bet/cash out
- Operator wallet starts/ends rounds, agent wallet plays autonomously

## Chains
- BSC Mainnet (id: 56)
- BSC Testnet (id: 97)
- opBNB (id: 204)
