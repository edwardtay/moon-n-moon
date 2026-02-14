import type Anthropic from "@anthropic-ai/sdk";
import * as weather from "./weather";

// ============================================================
// Tool Registry
// ============================================================
// Add new tools here:
// 1. import * as myTool from "./my-tool"
// 2. Add to `registry` below
//

const registry: Record<string, { definition: Anthropic.Tool; execute: (input: Record<string, unknown>) => string }> = {
  get_weather: weather,
};

export const tools: Anthropic.Tool[] = Object.values(registry).map((t) => t.definition);

export function handleToolCall(name: string, input: Record<string, unknown>): string {
  const tool = registry[name];
  if (!tool) return JSON.stringify({ error: `Unknown tool: ${name}` });
  return tool.execute(input);
}
