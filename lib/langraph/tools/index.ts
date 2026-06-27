import { DynamicStructuredTool } from "@langchain/core/tools";
import { buildAllLangGraphTools, buildLangGraphToolWrapper, type LangGraphToolContext } from "./wrapper";

export type { LangGraphToolContext } from "./wrapper";

export function buildLangGraphTools(ctx: LangGraphToolContext): DynamicStructuredTool[] {
  return buildAllLangGraphTools(ctx);
}

export function buildToolByName(ctx: LangGraphToolContext, toolName: string): DynamicStructuredTool {
  return buildLangGraphToolWrapper(ctx, toolName);
}

export function getAvailableToolNames(): string[] {
  const { ALL_TOOL_NAMES } = require("@/lib/ai-tools/registry");
  return ALL_TOOL_NAMES;
}

export { buildAllLangGraphTools, buildLangGraphToolWrapper };
