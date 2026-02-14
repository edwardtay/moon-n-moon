# Moon or Doom

A provably fair crash game on BNB Chain where players compete against an autonomous AI agent powered by Claude.

**Live demo:** [moon-or-doom-game.vercel.app](https://moon-or-doom-game.vercel.app)

## How It Works

1. **Place a bet** with BNB when the round opens
2. **Watch the multiplier climb** — 1.5x, 2x, 5x, 10x...
3. **Cash out before it crashes** — the multiplier can crash at any moment
4. **Beat the AI** — Claude analyzes patterns and makes real-time decisions. All its reasoning is visible to players.

The crash point is determined using a commit-reveal scheme. The operator commits a hash before the round starts, and reveals the crash point + salt after. Players can verify fairness by checking `keccak256(crashMultiplier, salt) == commitHash`.

## Architecture

```
frontend/     Next.js 16 + wagmi + viem + RainbowKit
contracts/    Foundry — CrashGame.sol (commit-reveal pattern)
```

**Hybrid on-chain/off-chain design:**
- **On-chain (opBNB + BSC):** Commit-reveal round proofs, verifiable crash points
- **Off-chain (SSE):** Real-time multiplier broadcast, instant bets, AI agent decisions

## AI Agent

The AI agent is an autonomous player with its own wallet, powered by Claude (via OpenRouter). Each round:

1. Claude sees recent crash history and its own win/loss record
2. Decides whether to bet, how much, and its target cash-out multiplier
3. During the round, monitors the multiplier and cashes out at its target
4. All reasoning is streamed to players in real-time via the Agent Panel

The agent is registered on-chain via **ERC-8004** (AI Agent Identity Registry) on BSC Testnet.

## Contracts

| Contract | Address | Network |
|----------|---------|---------|
| CrashGame | [`0x37E04515eD142A824c853CC74a76Cb9E0119CfFe`](https://testnet.opbnbscan.com/address/0x37E04515eD142A824c853CC74a76Cb9E0119CfFe) | opBNB Testnet (5611) |
| CrashGame | [`0x8721504d22ca89277D8Bd70B9260B55FCB7F2d1C`](https://testnet.bscscan.com/address/0x8721504d22ca89277D8Bd70B9260B55FCB7F2d1C) | BSC Testnet (97) |
| ERC-8004 Identity | Agent ID #83 on [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://testnet.bscscan.com/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) | BSC Testnet (97) |

**Key transactions:**
- Agent Registration: [`0xafed281d...`](https://testnet.bscscan.com/tx/0xafed281de06bb37ec6e1b564a1409c52f95a061873d34b6c947d370efaa5b05f)
- Agent URI Set: [`0x628273c7...`](https://testnet.bscscan.com/tx/0x628273c73517161e6a26879e11a2e9ee46fcc7f55237e27b837abbff56ecd082)

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind v4, wagmi, viem, RainbowKit
- **Smart Contracts:** Solidity 0.8.26, Foundry
- **AI Agent:** Claude (Anthropic) via OpenRouter, tool-use pattern
- **Real-time:** Server-Sent Events (SSE) from Next.js API routes
- **Identity:** ERC-8004 Agent Identity Registry on BSC

## Running Locally

```bash
# Frontend
cd frontend
pnpm install
pnpm dev

# Contracts
cd contracts
forge build
forge test
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_id
NEXT_PUBLIC_CRASH_GAME_ADDRESS=0x8721504d22ca89277D8Bd70B9260B55FCB7F2d1C
OPENROUTER_API_KEY=your_openrouter_key
OPERATOR_PRIVATE_KEY=0x...
AGENT_PRIVATE_KEY=0x...
```

## Deploy Contract

```bash
cd contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://data-seed-prebsc-1-s1.binance.org:8545 \
  --broadcast
```

## Game Mechanics

- **Multiplier growth:** `1.00x * e^(0.00006 * elapsedMs)` — smooth exponential curve
- **Crash point distribution:** ~3% instant crash at 1.00x, ~33% below 1.5x, ~50% below 2x
- **Provably fair:** HMAC-SHA256 based crash point derivation with on-chain commit-reveal
- **House edge:** ~3% built into the crash point distribution

## License

MIT
