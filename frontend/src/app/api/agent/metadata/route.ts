import { NextResponse } from "next/server";

/**
 * ERC-8004 Agent Metadata Endpoint
 * Serves the AI agent's identity metadata for on-chain registration.
 */
export async function GET() {
  const metadata = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "Moon or Doom AI Agent",
    description:
      "Autonomous AI crash game player powered by Claude. Competes against human players by analyzing crash history patterns and making real-time bet/cash-out decisions. All reasoning is visible to players in real-time.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%2309090b' width='100' height='100' rx='20'/%3E%3Ctext x='50' y='60' font-size='50' text-anchor='middle'%3E%F0%9F%9A%80%3C/text%3E%3C/svg%3E",
    services: [
      {
        type: "game-agent",
        name: "Crash Game Player",
        description:
          "Plays crash game rounds autonomously — decides bet amount, target cash-out, and timing using Claude AI reasoning",
        endpoint: "/api/game/stream",
        protocol: "SSE",
      },
      {
        type: "chat",
        name: "Agent Chat",
        description:
          "Interactive agent with tool-use for weather and general queries",
        endpoint: "/api/agent",
        protocol: "HTTP-SSE",
      },
    ],
    properties: {
      chain: "BSC Testnet (97)",
      wallet: "0xBf55Ee20CE56edad88494acc55a0a0c5b952b48e",
      model: "anthropic/claude-sonnet-4",
      game_contract: process.env.NEXT_PUBLIC_CRASH_GAME_ADDRESS,
      strategy: "Pattern analysis with competitive personality",
    },
  };

  return NextResponse.json(metadata, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
