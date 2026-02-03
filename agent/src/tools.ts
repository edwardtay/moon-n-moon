import type Anthropic from "@anthropic-ai/sdk";

export const tools: Anthropic.Tool[] = [
  {
    name: "get_weather",
    description:
      "Get the current weather in a given location. Returns temperature and conditions.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. San Francisco, CA",
        },
      },
      required: ["location"],
    },
  },
];

export function handleToolCall(
  name: string,
  input: Record<string, unknown>
): string {
  switch (name) {
    case "get_weather":
      return JSON.stringify({
        temperature: 72,
        conditions: "sunny",
        location: input.location,
      });
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
