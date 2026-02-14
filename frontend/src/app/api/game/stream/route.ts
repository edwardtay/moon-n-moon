import { gameEngine } from "@/lib/game-engine";
import { startAgent } from "@/lib/agent-player";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send current state immediately
      const state = gameEngine.getState();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "state", data: state })}\n\n`
        )
      );

      // Send history
      const history = gameEngine.getHistory();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "history", data: history })}\n\n`
        )
      );

      // Subscribe to game events
      const unsubscribe = gameEngine.subscribe((event) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          unsubscribe();
        }
      });

      // Start game engine + agent if not running
      if (gameEngine.getState().phase === "waiting" && gameEngine.getState().roundId === 0) {
        startAgent();
        gameEngine.start();
      }

      // Heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      // Cleanup on close — note: we can't detect close in all runtimes,
      // but the try/catch in enqueue handles it
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
