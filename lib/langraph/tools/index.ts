import { DynamicStructuredTool } from "@langchain/core/tools";
import { buildLangGraphToolWrapper, type LangGraphToolContext } from "./wrapper";
import { buildTools } from "@/lib/ai-tools";
import type { ToolCategory } from "@/lib/ai-tools/registry";

export type { LangGraphToolContext } from "./wrapper";

export function buildLangGraphTools(ctx: LangGraphToolContext, categories?: ToolCategory[]): DynamicStructuredTool[] {
  const aiCtx = { user: { id: ctx.userId }, workspaceId: ctx.workspaceId, projectId: ctx.projectId };
  const tools = buildTools(aiCtx, categories);
  const aiTools = Object.keys(tools).map((name) => buildLangGraphToolWrapper(ctx, name));
  const { buildServiceTools } = require("./services");
  const serviceTools = buildServiceTools(ctx);
  return [...aiTools, ...serviceTools];
}

export function buildToolByName(ctx: LangGraphToolContext, toolName: string): DynamicStructuredTool {
  return buildLangGraphToolWrapper(ctx, toolName);
}

export function getAvailableToolNames(): string[] {
  const { ALL_TOOL_NAMES } = require("@/lib/ai-tools/registry");
  return ALL_TOOL_NAMES;
}

export { buildLangGraphToolWrapper };
