import { buildTools } from "@/lib/ai-tools";
import type { ToolContext } from "@/lib/ai-tools";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export interface LangGraphToolContext {
  userId: string;
  workspaceId: string;
  projectId?: string;
}

function toToolContext(ctx: LangGraphToolContext): ToolContext {
  return {
    user: { id: ctx.userId },
    workspaceId: ctx.workspaceId,
    projectId: ctx.projectId,
  };
}

export function buildLangGraphToolWrapper(
  ctx: LangGraphToolContext,
  toolName: string
): DynamicStructuredTool {
  const aiCtx = toToolContext(ctx);
  const tools = buildTools(aiCtx);
  const raw = tools[toolName] as
    | {
        description?: string;
        execute: (args: Record<string, unknown>) => Promise<unknown>;
        parameters?: z.ZodType<unknown>;
        inputSchema?: z.ZodType<unknown>;
      }
    | undefined;

  if (!raw) {
    throw new Error(`Tool "${toolName}" not found in ai-tools registry.`);
  }

  const description = raw.description ?? "";
  const schema = (raw.parameters ?? raw.inputSchema ?? z.object({})) as z.ZodType<unknown>;

  return new DynamicStructuredTool({
    name: toolName,
    description,
    schema,
    func: async (args) => raw.execute(args),
  });
}

export function buildAllLangGraphTools(
  ctx: LangGraphToolContext
): DynamicStructuredTool[] {
  const aiCtx = toToolContext(ctx);
  const tools = buildTools(aiCtx);
  const aiTools = Object.keys(tools).map((name) => buildLangGraphToolWrapper(ctx, name));
  const { buildServiceTools } = require("./services");
  const serviceTools = buildServiceTools(ctx);
  return [...aiTools, ...serviceTools];
}

export function buildLangGraphToolsForCategories(
  ctx: LangGraphToolContext,
  categories: string[]
): DynamicStructuredTool[] {
  const { filterToolsByCategories } = require("@/lib/ai-tools/registry");
  const aiCtx = toToolContext(ctx);
  const tools = buildTools(aiCtx);
  const filtered = filterToolsByCategories(tools, categories);
  const aiTools = Object.keys(filtered).map((name) => buildLangGraphToolWrapper(ctx, name));
  if (categories.includes("INTEGRATION" as any)) {
    const { buildServiceTools } = require("./services");
    const serviceTools = buildServiceTools(ctx);
    return [...aiTools, ...serviceTools];
  }
  return aiTools;
}
