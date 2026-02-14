import Anthropic from "@anthropic-ai/sdk";
import { tools, handleToolCall } from "./tools";

const client = new Anthropic();

export async function POST(req: Request) {
  const { message } = await req.json();

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let continueLoop = true;

        while (continueLoop) {
          const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            tools,
            messages,
            stream: true,
          });

          let currentText = "";
          const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
          let stopReason = "";

          for await (const event of response) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              currentText += event.delta.text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`)
              );
            }

            if (event.type === "message_delta") {
              stopReason = event.delta.stop_reason ?? "";
            }

            if (
              event.type === "content_block_start" &&
              event.content_block.type === "tool_use"
            ) {
              toolUseBlocks.push({
                ...event.content_block,
                input: {},
              } as Anthropic.ToolUseBlock);
            }

            if (
              event.type === "content_block_delta" &&
              event.delta.type === "input_json_delta"
            ) {
              const block = toolUseBlocks[toolUseBlocks.length - 1];
              if (block) {
                (block as { _rawInput?: string })._rawInput =
                  ((block as { _rawInput?: string })._rawInput ?? "") + event.delta.partial_json;
              }
            }
          }

          if (stopReason === "tool_use" && toolUseBlocks.length > 0) {
            const assistantContent: Anthropic.ContentBlockParam[] = [];
            if (currentText) {
              assistantContent.push({ type: "text", text: currentText });
            }

            for (const block of toolUseBlocks) {
              const rawInput = (block as { _rawInput?: string })._rawInput ?? "{}";
              block.input = JSON.parse(rawInput);
              assistantContent.push(block);
            }

            const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => ({
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: handleToolCall(block.name, block.input as Record<string, unknown>),
            }));

            messages.push({ role: "assistant", content: assistantContent as Anthropic.ContentBlock[] });
            messages.push({ role: "user", content: toolResults });
          } else {
            continueLoop = false;
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
