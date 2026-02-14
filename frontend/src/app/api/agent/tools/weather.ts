import type Anthropic from "@anthropic-ai/sdk";

// ============================================================
// PATTERN: One file per tool
// ============================================================
// Copy this file to create a new tool:
// 1. Copy weather.ts → my-tool.ts
// 2. Update definition (name, description, input_schema)
// 3. Update execute() with your logic
// 4. Add to tools/index.ts registry
//

export const definition: Anthropic.Tool = {
  name: "get_weather",
  description: "Get the current weather in a given location.",
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
};

export function execute(input: Record<string, unknown>): string {
  // Replace with real API call
  return JSON.stringify({
    temperature: 72,
    conditions: "sunny",
    location: input.location,
  });
}
