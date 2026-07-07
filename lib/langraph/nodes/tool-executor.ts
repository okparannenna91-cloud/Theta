import { buildLangGraphToolWrapper, type LangGraphToolContext } from "../tools/wrapper";
import { logger } from "@/lib/logger";

export interface ToolExecutionResult { toolName: string; success: boolean; result?: unknown; error?: string; durationMs: number }

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

function isRetryable(error: any): boolean {
  const msg = (error?.message || "").toLowerCase();
  return msg.includes("timeout") || msg.includes("deadlock") || msg.includes("rate limit") || msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("too many");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeTool(ctx: LangGraphToolContext, toolName: string, args: Record<string, unknown>): Promise<ToolExecutionResult> {
  const start = Date.now();
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tool = buildLangGraphToolWrapper(ctx, toolName);
      const result = await tool.invoke(args);
      if (attempt > 0) {
        logger.info(`[ToolExecutor] Retry succeeded for ${toolName} after ${attempt} attempt(s)`);
      }
      return { toolName, success: true, result, durationMs: Date.now() - start };
    } catch (error: any) {
      lastError = error;
      if (attempt < MAX_RETRIES && isRetryable(error)) {
        logger.warn(`[ToolExecutor] Retrying ${toolName} (attempt ${attempt + 1}/${MAX_RETRIES}): ${error.message}`);
        await delay(RETRY_DELAY_MS * (attempt + 1));
      } else {
        break;
      }
    }
  }

  return { toolName, success: false, error: lastError?.message || "Unknown error", durationMs: Date.now() - start };
}
