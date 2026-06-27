import { buildLangGraphToolWrapper, type LangGraphToolContext } from "../tools/wrapper";
import { logger } from "@/lib/logger";

export interface ToolExecutionResult { toolName: string; success: boolean; result?: unknown; error?: string; durationMs: number }

export async function executeTool(ctx: LangGraphToolContext, toolName: string, args: Record<string, unknown>): Promise<ToolExecutionResult> {
  const start = Date.now();
  try {
    const tool = buildLangGraphToolWrapper(ctx, toolName);
    const result = await tool.invoke(args);
    return { toolName, success: true, result, durationMs: Date.now() - start };
  } catch (error: any) {
    return { toolName, success: false, error: error.message, durationMs: Date.now() - start };
  }
}
