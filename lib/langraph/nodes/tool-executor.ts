import { resolveToolByName, type LangGraphToolContext } from "../tools";
import { logger } from "@/lib/logger";

export interface ToolExecutionResult { toolName: string; success: boolean; result?: unknown; error?: string; durationMs: number }

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// Per-run invocation counters so repeated writes of the same tool within one
// agent turn are treated as a bulk action (ask before continuing).
const runToolCounts = new Map<string, Map<string, number>>();
const BULK_THRESHOLD = 2;
const WRITE_TOOL_RE = /^(create_|update_|delete_|move_|assign_|rename_|archive_|unarchive_|set_|add_)/i;

function isRetryable(error: any): boolean {
  const msg = (error?.message || "").toLowerCase();
  return msg.includes("timeout") || msg.includes("deadlock") || msg.includes("rate limit") || msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("too many");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Risk gate for tool execution (Phase 1).
 *
 * HIGH risk (deletes, billing, permissions): hard block — the tool is never
 * executed; the agent receives an error and explains the refusal.
 *
 * MEDIUM risk (create/update/assign/bulk): the tool is NOT executed unless the
 * user has confirmed. A pending confirmation is stored in Redis keyed by
 * conversationId; on a later user approval message the stored confirmation is
 * resolved and the tool runs. Without a conversationId (no session), MEDIUM
 * tools return a `confirmation_required` result so the agent asks the user.
 *
 * Returns `null` when the tool may proceed.
 */
async function riskGate(
  ctx: LangGraphToolContext,
  toolName: string,
  args: Record<string, unknown>,
  userPrompt: string
): Promise<{ status: "blocked"; error: string } | { status: "confirmation_required"; result: Record<string, unknown> } | null> {
  const { DecisionFramework } = await import("@/lib/nova/decision-framework");
  const syntheticPrompt = `${toolName} ${Object.values(args).filter(Boolean).join(" ")}`;
  const decision = DecisionFramework.evaluate(syntheticPrompt);

  if (decision.requiresApproval) {
    logger.warn(`[ToolExecutor] Blocked HIGH risk tool "${toolName}"`);
    return {
      status: "blocked",
      error: `**ACTION BLOCKED**\n\nThe "${toolName}" tool is HIGH RISK (${decision.intent} action). This action cannot be delegated to the AI.`,
    };
  }

  if (!decision.requiresConfirmation) {
    return null;
  }

  const { getPendingConfirmation, isApprovalMessage, isDenialMessage, requestConfirmation, resolveConfirmation } =
    await import("@/lib/nova/confirmation");

  if (ctx.conversationId) {
    const pending = await getPendingConfirmation(ctx.conversationId);

    if (pending && pending.toolName === toolName && userPrompt && isApprovalMessage(userPrompt)) {
      const resolved = await resolveConfirmation({
        conversationId: ctx.conversationId,
        token: pending.token,
        userId: ctx.userId,
        approved: true,
      });
      if (resolved) {
        logger.info(`[ToolExecutor] Confirmation resolved — executing ${toolName}`);
        return null;
      }
      return {
        status: "confirmation_required",
        result: { status: "confirmation_required", reason: `Confirmation for "${toolName}" could not be validated. Please try again.`, args, intent: decision.intent, riskLevel: decision.riskLevel },
      };
    }

    if (pending && pending.toolName === toolName && userPrompt && isDenialMessage(userPrompt)) {
      logger.info(`[ToolExecutor] Confirmation denied — not executing ${toolName}`);
      return {
        status: "confirmation_required",
        result: { status: "cancelled", reason: `The "${toolName}" action was cancelled.`, args, intent: decision.intent, riskLevel: decision.riskLevel },
      };
    }

    if (pending && pending.toolName !== toolName) {
      return {
        status: "confirmation_required",
        result: { status: "confirmation_required", reason: `Another action ("${pending.toolName}") is already awaiting confirmation.`, args, intent: decision.intent, riskLevel: decision.riskLevel },
      };
    }

    if (!pending) {
      await requestConfirmation({
        conversationId: ctx.conversationId,
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        toolName,
        args,
        reason: `The "${toolName}" action (${decision.intent}) requires your confirmation.`,
        intent: decision.intent,
        riskLevel: decision.riskLevel,
      });
    }
  }

  return {
    status: "confirmation_required",
    result: { status: "confirmation_required", reason: `The "${toolName}" action (${decision.intent}) requires your confirmation.`, args, intent: decision.intent, riskLevel: decision.riskLevel },
  };
}

export async function executeTool(
  ctx: LangGraphToolContext,
  toolName: string,
  args: Record<string, unknown>,
  userPrompt = ""
): Promise<ToolExecutionResult> {
  const start = Date.now();

  // Bulk detection: a write tool invoked multiple times within the same agent
  // run is a bulk operation — require confirmation regardless of per-item risk.
  // Runs synchronously (before any await) so per-call counts stay sequential.
  if (ctx.runId && WRITE_TOOL_RE.test(toolName)) {
    const key = `${ctx.workspaceId}:${toolName}`;
    let counts = runToolCounts.get(ctx.runId);
    if (!counts) {
      counts = new Map();
      runToolCounts.set(ctx.runId, counts);
    }
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    if (n >= BULK_THRESHOLD) {
      logger.info(`[ToolExecutor] Bulk ${toolName} (${n} invocations) — confirmation required`);
      return {
        toolName,
        success: true,
        result: {
          status: "confirmation_required",
          reason: `This is a bulk operation (${n} items so far). Ask the user ONE confirmation question before creating or updating more.`,
          args,
          intent: "CREATE",
          riskLevel: "MEDIUM",
        },
        durationMs: Date.now() - start,
      };
    }
  }

  const gate = await riskGate(ctx, toolName, args, userPrompt);
  if (gate?.status === "blocked") {
    return { toolName, success: false, error: gate.error, durationMs: Date.now() - start };
  }
  if (gate?.status === "confirmation_required") {
    return { toolName, success: true, result: gate.result, durationMs: Date.now() - start };
  }

  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tool = resolveToolByName(ctx, toolName);
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