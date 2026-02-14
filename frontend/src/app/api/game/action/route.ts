import { NextRequest, NextResponse } from "next/server";
import { gameEngine } from "@/lib/game-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, address, amount } = body;

    switch (action) {
      case "bet": {
        if (!address || !amount) {
          return NextResponse.json(
            { error: "Missing address or amount" },
            { status: 400 }
          );
        }
        const success = gameEngine.placeBet(address, Number(amount));
        if (!success) {
          return NextResponse.json(
            { error: "Cannot place bet right now" },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "cashout": {
        if (!address) {
          return NextResponse.json(
            { error: "Missing address" },
            { status: 400 }
          );
        }
        const result = gameEngine.cashOut(address);
        if (!result) {
          return NextResponse.json(
            { error: "Cannot cash out right now" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          multiplier: result.multiplier,
          profit: result.profit,
        });
      }

      case "state": {
        return NextResponse.json(gameEngine.getState());
      }

      case "history": {
        return NextResponse.json(gameEngine.getHistory());
      }

      case "agent": {
        return NextResponse.json(gameEngine.agentStats);
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
