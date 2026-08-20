import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";
import { sanitizeUserInput } from "@/lib/nova/output-validator";
import { detectPromptInjection } from "@/lib/nova/security-guard";
import {
  BridgeError,
  classifyBridgeRequest,
  convertMessagesToPrompt,
  createOpenAICompletion,
  extractBridgeIdentity,
  extractConfirmationFromResult,
  extractRequestedWorkspace,
  isApprovalMessage,
  isBridgeEnabled,
  isDenialMessage,
  resolveBridgeContext,
  runApprovedAction,
  toOpenAIStream,
  validateBridgeSecret,
  type BridgeMessage,
} from "@/lib/nova/bridge";
import {
  clearConfirmation,
  getPendingConfirmation,
  requestConfirmation,
} from "@/lib/nova/confirmation";
import { runNovaAgent } from "@/lib/langraph";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60;

async function isRateLimited(email: string): Promise<boolean> {
  try {
    const { redis } = await import("@/lib/redis/client");
    const key = `flow:bratelimit:${email}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }
    return count > RATE_LIMIT_MAX_REQUESTS;
  } catch {
    return false;
  }
}

/**
 * LibreChat does not always pass a conversationId to custom endpoints. v1
 * heuristic: if there is a pending confirmation under the stored mapping id
 * and the latest user turn is an approval/denial, reuse the mapping id;
 * otherwise mint a new one. (The spike in Phase 2 verifies what LibreChat
 * actually sends and may remove this fallback.)
 */
async function resolveConversationId(email: string, prompt: string): Promise<string> {
  const { redis } = await import("@/lib/redis/client");
  const mapKey = `flow:convmap:${email}`;
  try {
    const stored = (await redis.get(mapKey)) as string | null;
    if (stored) {
      const pending = await getPendingConfirmation(stored);
      if (pending && (isApprovalMessage(prompt) || isDenialMessage(prompt))) {
        return stored;
      }
    }
  } catch (error) {
    logger.error("[Bridge] Conversation map lookup failed:", error);
  }
  const id = `flow-${createHash("sha256").update(email + Date.now()).digest("hex").slice(0, 16)}`;
  try {
    await redis.set(mapKey, id, { ex: 60 * 60 * 24 * 7 });
  } catch (error) {
    logger.error("[Bridge] Conversation map store failed:", error);
  }
  return id;
}

function staticResult(text: string): {
  response: string;
  route: string;
  provider: string;
  model: string;
  toolResults: Array<{ toolName: string }>;
  durationMs: number;
} {
  return { response: text, route: "CHAT", provider: "bridge", model: "flow-3", toolResults: [], durationMs: 0 };
}

export async function POST(req: Request) {
  const requestStart = Date.now();

  if (!isBridgeEnabled()) {
    return NextResponse.json({ error: "Flow³ bridge is disabled (FLOW_BRIDGE_ENABLED)." }, { status: 503 });
  }

  let body: {
    model?: string;
    messages?: BridgeMessage[];
    stream?: boolean;
    user?: unknown;
    conversationId?: string;
    workspaceId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    if (!validateBridgeSecret(req)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const identity = extractBridgeIdentity(req, body);
    if (!identity) {
      return NextResponse.json({ error: "Missing user identity (X-Flow-User header or `user` field)." }, { status: 401 });
    }

    if (await isRateLimited(identity.email)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const requestedWorkspace = extractRequestedWorkspace(req, body);
    const context = await resolveBridgeContext({ email: identity.email, requestedWorkspaceId: requestedWorkspace });
    const { user, workspaceId } = context;

    const { prompt, history } = convertMessagesToPrompt(body.messages ?? []);
    if (!prompt) {
      return NextResponse.json({ error: "No user message provided." }, { status: 400 });
    }

    const sanitizedPrompt = sanitizeUserInput(prompt);
    if (detectPromptInjection(sanitizedPrompt)) {
      logger.warn(`[Bridge] Prompt injection blocked for ${identity.email}`);
      return NextResponse.json({ error: "Your request was blocked by security filters. Please rephrase." }, { status: 400 });
    }

    const headerConversationId = req.headers.get("x-flow-conversation-id")?.trim() ?? "";
    const bodyConversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const conversationId =
      headerConversationId || bodyConversationId || (await resolveConversationId(identity.email, sanitizedPrompt));

    // Pending confirmation handling — the approval/denial never reaches the agent.
    const pending = await getPendingConfirmation(conversationId);
    if (pending) {
      if (isApprovalMessage(sanitizedPrompt)) {
        const result = await runApprovedAction({ conversationId, token: pending.token, userId: user.id, workspaceId });
        const stream = toOpenAIStream({ result, model: body.model || "flow-3", conversationId });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }
      if (isDenialMessage(sanitizedPrompt)) {
        await clearConfirmation(conversationId);
        const result = staticResult("The action was cancelled. What would you like to do next?");
        const stream = toOpenAIStream({ result, model: body.model || "flow-3", conversationId });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }
      // Pending but no decision yet — remind the user how to respond.
      const result = staticResult(
        `There is an action awaiting your confirmation: ${pending.reason}. Reply "Approve" to proceed or "Cancel" to cancel.`
      );
      const stream = toOpenAIStream({ result, model: body.model || "flow-3", conversationId });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const { intent, routeDecision } = await classifyBridgeRequest(sanitizedPrompt, true);

    if (routeDecision.path === "ACTION" && intent === "DELETE") {
      // Deletes are always high-risk in v1 — never delegated to the agent tools.
      return NextResponse.json(
        { error: "Delete actions are not permitted through Flow³ in this release.", requiresApproval: true, intent },
        { status: 403 }
      );
    }

    const { getNovaRequestCount } = await import("@/lib/usage-tracking");
    const currentUsage = await getNovaRequestCount(workspaceId);
    try {
      const { enforcePlanLimit } = await import("@/lib/plan-limits");
      await enforcePlanLimit(workspaceId, "nova", currentUsage);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const result = await runNovaAgent(sanitizedPrompt, {
      userId: user.id,
      workspaceId,
      conversationId,
      intent,
      routeDecision,
    });

    // A tool asked for confirmation → surface it as an OpenAI tool_call.
    let confirmation: { token: string; reason: string; toolName: string; args: Record<string, unknown> } | null = null;
    const pendingExtract = extractConfirmationFromResult(result.toolResults);
    if (pendingExtract) {
      const pending = await requestConfirmation({
        conversationId,
        userId: user.id,
        workspaceId,
        toolName: pendingExtract.toolName,
        args: pendingExtract.args,
        reason: pendingExtract.reason,
        intent: String(intent),
        riskLevel: "MEDIUM",
      });
      confirmation = {
        token: pending.token,
        reason: pending.reason,
        toolName: pending.toolName,
        args: pending.args,
      };
    }

    const { incrementNovaUsage } = await import("@/lib/usage-tracking");
    await incrementNovaUsage(workspaceId, user.id).catch(() => {});

    // Audit trail (mirrors auditToolExecution on the native path).
    const { prisma } = await import("@/lib/prisma");
    await prisma.activity
      .create({
        data: {
          action: "FLOW3_REQUEST",
          entityType: "AI",
          entityId: conversationId,
          workspaceId,
          userId: user.id,
          metadata: {
            model: result.model,
            provider: result.provider,
            durationMs: Date.now() - requestStart,
            tools: result.toolResults.map((t) => t.toolName),
            confirmation: confirmation ? { tool: confirmation.toolName } : null,
          },
        },
      })
      .catch((e: unknown) => logger.error("[Bridge] Audit log failed:", e));

    const stream = toOpenAIStream({ result, model: body.model || "flow-3", conversationId, confirmation });

    if (body.stream === false) {
      return NextResponse.json(createOpenAICompletion({ result, model: body.model || "flow-3", confirmation }));
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    if (error instanceof BridgeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    logger.error("[Bridge] Request failed:", error);
    return NextResponse.json({ error: "Flow³ request failed. Please try again." }, { status: 500 });
  }
}