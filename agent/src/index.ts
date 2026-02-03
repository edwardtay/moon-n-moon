import Anthropic from "@anthropic-ai/sdk";
import { tools, handleToolCall } from "./tools.js";

const client = new Anthropic();

async function chat(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    tools,
    messages,
  });

  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
      (block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: handleToolCall(
          block.name,
          block.input as Record<string, unknown>
        ),
      })
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools,
      messages,
    });
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  return textBlock?.text ?? "";
}

async function main() {
  const result = await chat("What's the weather like in San Francisco?");
  console.log(result);
}

main().catch(console.error);
