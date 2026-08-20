import { DynamicStructuredTool } from "@langchain/core/tools";
import { buildLangGraphToolWrapper, buildAllLangGraphTools, type LangGraphToolContext } from "./wrapper";
import { buildTools } from "@/lib/ai-tools";
import type { ToolCategory } from "@/lib/ai-tools/registry";

export type { LangGraphToolContext } from "./wrapper";

export function buildLangGraphTools(ctx: LangGraphToolContext, categories?: ToolCategory[]): DynamicStructuredTool[] {
  const aiCtx = { user: { id: ctx.userId }, workspaceId: ctx.workspaceId, projectId: ctx.projectId };
  const tools = buildTools(aiCtx, categories);
  const aiTools = Object.keys(tools).map((name) => buildLangGraphToolWrapper(ctx, name));
  // Service (integration) tools are read-only noise for non-IMPORT/EXPORT
  // intents; they are only included when no category filter is applied.
  const serviceTools: DynamicStructuredTool[] = categories && categories.length > 0
    ? []
    : require("./services").buildServiceTools(ctx);
  const ragTools = require("./rag").buildRAGTools(ctx);
  return [...aiTools, ...serviceTools, ...ragTools];
}

export function buildToolByName(ctx: LangGraphToolContext, toolName: string): DynamicStructuredTool {
  return resolveToolByName(ctx, toolName);
}

export function resolveToolByName(ctx: LangGraphToolContext, toolName: string): DynamicStructuredTool {
  const all = buildAllLangGraphTools(ctx);
  const tool = all.find((t) => t.name === toolName);
  if (!tool) throw new Error(`Tool "${toolName}" not found (ai-tools, services, or rag).`);
  return tool;
}

export function getAvailableToolNames(): string[] {
  const { ALL_TOOL_NAMES } = require("@/lib/ai-tools/registry");
  return ALL_TOOL_NAMES;
}

export { buildLangGraphToolWrapper, buildAllLangGraphTools } from "./wrapper";
