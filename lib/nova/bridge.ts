/**
 * Flow³ bridge — the OpenAI-compatible adapter between LibreChat and the
 * LangGraph/Nova agent inside Theta.
 *
 * LibreChat (chat shell) ──► /api/flow/chat ──► bridge helpers ──► runNovaAgent
 *
 * Security contract:
 *  - The bridge is server-to-server only. Requests must carry FLOW_BRIDGE_SECRET.
 *  - Identity comes from LibreChat (X-Flow-User header or `user` body field) and
 *    is mapped to a Theta Prisma user. It is RE-VALIDATED by SecurityGuard inside
 *    every tool — the bridge never authorizes, it only identifies.
 *  - A workspaceId supplied by LibreChat is a REQUESTED CONTEXT, not an
 *    authorization. It is checked with verifyWorkspaceAccess() and rejected if
 *    the user is not a member.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type { NovaAgentResult, LangGraphToolContext } from "@/lib/langraph";
import { runNovaAgent } from "@/lib/langraph";
import { DecisionFramework, type DecisionResult } from "@/lib/nova/decision-framework";
import { routeRequest, type RouteDecision } from "@/lib/nova/intent-router";
import { logger } from "@/lib/logger";
import {
  getPendingConfirmation,
  resolveConfirmation,
  type PendingConfirmation,
} from "@/lib/nova/confirmation";

export const FLOW_MODELS = [
  { id: "flow-3", name: "Flow³", description: "Default Flow³ agent (model routed per intent)." },
  { id: "flow-3-fast", name: "Flow³ Fast", description: "Same agent, retrieval-leaning routing (v1: identical to flow-3)." },
] as const;

export class BridgeError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isBridgeEnabled(): boolean {
  return process.env.FLOW_BRIDGE_ENABLED === "true";
}

/** Constant-time comparison of the bearer secret against FLOW_BRIDGE_SECRET. */
export function validateBridgeSecret(req: Request): boolean {
  const expected = process.env.FLOW_BRIDGE_SECRET;
  if (!expected) return false;
  const auth = req.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!provided) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(provided).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface BridgeMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type?: string; text?: string }> | null;
}

function textOf(content: BridgeMessage["content"]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part && typeof part.text === "string" ? part.text.trim() : ""))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

/**
 * Identity + requested-workspace extraction.
 * LibreChat sends the user via the `user` body field (addUser: true) and we also
 * accept an explicit X-Flow-User header as an override for the endpoint config.
 */
export function extractBridgeIdentity(req: Request, body: { user?: unknown }): { email: string } | null {
  const headerEmail = req.headers.get("x-flow-user")?.trim();
  const bodyUser = typeof body.user === "string" ? body.user.trim() : "";
  const email = (headerEmail || bodyUser || "").toLowerCase();
  if (!email || !email.includes("@")) return null;
  return { email };
}

export function extractRequestedWorkspace(req: Request, body: Record<string, unknown>): string | null {
  const header = req.headers.get("x-flow-workspace")?.trim();
  const bodyWs = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
  return header || bodyWs || null;
}

/**
 * Resolve a LibreChat identity to a Theta user + an accessible workspace.
 * The requested workspace is treated as CONTEXT ONLY — it is verified against
 * the user's membership and rejected otherwise.
 */
export async function resolveBridgeContext(input: {
  email: string;
  requestedWorkspaceId?: string | null;
}): Promise<{ user: { id: string; email: string | null }; workspaceId: string }> {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new BridgeError(401, "unknown_user", "No Theta account matches this identity.");
  }

  const { verifyWorkspaceAccess, getCurrentWorkspace } = await import("@/lib/workspace");

  if (input.requestedWorkspaceId) {
    const allowed = await verifyWorkspaceAccess(user.id, input.requestedWorkspaceId);
    if (!allowed) {
      throw new BridgeError(403, "workspace_denied", "Requested workspace is not accessible to this user.");
    }
    return { user, workspaceId: input.requestedWorkspaceId };
  }

  const workspace = await getCurrentWorkspace(user.id);
  if (!workspace) {
    throw new BridgeError(403, "no_workspace", "This user has no workspace.");
  }
  return { user, workspaceId: workspace.id };
}

/**
 * Convert OpenAI-style messages into the agent's prompt + a plain-text history.
 * v1: the LAST USER turn is the prompt; everything before it is context.
 * (A later step can extend NovaAgentOptions with a structured history instead.)
 */
export function convertMessagesToPrompt(messages: BridgeMessage[]): { prompt: string; history: string } {
  const turns = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, text: textOf(m.content).trim() }))
    .filter((t) => t.text.length > 0);

  if (turns.length === 0) return { prompt: "", history: "" };

  const lastUserIndex = [...turns].reverse().findIndex((t) => t.role === "user");
  if (lastUserIndex === -1) {
    return { prompt: "", history: turns.map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text}`).join("\n") };
  }

  const promptIndex = turns.length - 1 - lastUserIndex;
  const history = turns
    .slice(0, promptIndex)
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text}`)
    .join("\n");

  return { prompt: turns[promptIndex].text, history };
}

/** Intent + route classification, mirroring the /api/ai pipeline. */
export async function classifyBridgeRequest(prompt: string, hasWorkspace: boolean): Promise<{
  intent: DecisionResult["intent"];
  routeDecision: RouteDecision;
}> {
  const decision = await DecisionFramework.evaluateAsync(prompt, { hasWorkspace, hasProject: false });
  const routeDecision = routeRequest(prompt, decision.intent);
  return { intent: decision.intent, routeDecision };
}

// ---------------------------------------------------------------------------
// Confirmation handling
// ---------------------------------------------------------------------------

export interface ConfirmationExtract {
  toolName: string;
  reason: string;
  args: Record<string, unknown>;
}

/** Detect a `confirmation_required` result among the agent's tool results. */
export function extractConfirmationFromResult(toolResults: NovaAgentResult["toolResults"]): ConfirmationExtract | null {
  for (const tr of toolResults) {
    const result = tr.result;
    if (result && typeof result === "object" && (result as { status?: string }).status === "confirmation_required") {
      const r = result as { reason?: string; args?: Record<string, unknown> };
      return {
        toolName: tr.toolName,
        reason: String(r.reason ?? "This action requires your confirmation."),
        args: r.args ?? {},
      };
    }
  }
  return null;
}

const APPROVAL_RE = /^(yes|yep|yeah|approve|approved|confirm|confirmed|go ahead|proceed|do it|ok|okay|sure)\b/i;
const DENIAL_RE = /^(no|nope|cancel|cancelled|deny|denied|don't|do not|stop|never mind)\b/i;

export function isApprovalMessage(text: string): boolean {
  return APPROVAL_RE.test(text.trim());
}

export function isDenialMessage(text: string): boolean {
  return DENIAL_RE.test(text.trim());
}

/**
 * Execute an approved action: resolve the pending confirmation, invoke the
 * stored tool directly, then let the agent summarize the outcome.
 */
export async function runApprovedAction(input: {
  conversationId: string;
  token: string;
  userId: string;
  workspaceId: string;
}): Promise<NovaAgentResult> {
  const pending = await getPendingConfirmation(input.conversationId);
  if (!pending) {
    throw new BridgeError(409, "no_pending_confirmation", "No action is awaiting confirmation for this conversation.");
  }

  const resolved = await resolveConfirmation({
    conversationId: input.conversationId,
    token: input.token,
    userId: input.userId,
    approved: true,
  });
  if (!resolved) {
    throw new BridgeError(409, "confirmation_invalid", "Confirmation token is invalid or expired.");
  }

  logger.info("[Bridge] Executing approved action", {
    conversationId: input.conversationId,
    toolName: resolved.toolName,
  });

  const { buildToolByName } = await import("@/lib/langraph");
  const ctx: LangGraphToolContext = { userId: input.userId, workspaceId: input.workspaceId };
  const tool = buildToolByName(ctx, resolved.toolName);
  const toolResult = await tool.invoke(resolved.args);

  const summary = typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);
  const prompt =
    `${resolved.reason}\n\n[ACTION APPROVED AND EXECUTED]\nTool: ${resolved.toolName}\nResult: ${summary}\n\n` +
    `Confirm to the user, concisely, what was done and its outcome.`;

  const { routeDecision } = await classifyBridgeRequest(prompt, true);
  return runNovaAgent(prompt, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    conversationId: input.conversationId,
    intent: "READ",
    routeDecision,
  });
}

// ---------------------------------------------------------------------------
// OpenAI chat.completions wire format
// ---------------------------------------------------------------------------

export interface OpenAIConfirmationPayload {
  token: string;
  reason: string;
  toolName: string;
  args: Record<string, unknown>;
}

const FLOW_TOOL_NAME = "flow_confirm";

function openAIChunk(id: string, model: string, created: number, delta: Record<string, unknown>, finishReason: string | null): string {
  return JSON.stringify({
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  });
}

/**
 * Convert a NovaAgentResult into an OpenAI SSE stream.
 * v1: pseudo-streaming — the agent result is chunked word-wise so LibreChat
 * renders progressively. When a confirmation is pending, a `flow_confirm`
 * tool_call delta is emitted instead of finishing with `stop`.
 */
export function toOpenAIStream(opts: {
  result: NovaAgentResult;
  model: string;
  conversationId: string;
  confirmation?: OpenAIConfirmationPayload | null;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const id = `chatcmpl-flow-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);
  const model = opts.model;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: string) => controller.enqueue(encoder.encode(`data: ${payload}\n\n`));

      try {
        send(openAIChunk(id, model, created, { role: "assistant", content: "" }, null));

        if (opts.confirmation) {
          const argsJson = JSON.stringify({
            token: opts.confirmation.token,
            reason: opts.confirmation.reason,
            tool: opts.confirmation.toolName,
            args: opts.confirmation.args,
          });
          send(
            openAIChunk(
              id,
              model,
              created,
              {
                tool_calls: [
                  {
                    index: 0,
                    id: `call_${opts.confirmation.token.slice(0, 8)}`,
                    type: "function",
                    function: { name: FLOW_TOOL_NAME, arguments: argsJson },
                  },
                ],
              },
              "tool_calls"
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        const words = opts.result.response.split(/\s+/).filter(Boolean);
        let i = 0;
        while (i < words.length) {
          const batch = words.slice(i, i + 4).join(" ");
          send(openAIChunk(id, model, created, { content: i === 0 ? batch : ` ${batch}` }, null));
          i += 4;
          await new Promise((r) => setTimeout(r, 10));
        }

        send(openAIChunk(id, model, created, {}, "stop"));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        logger.error("[Bridge] Stream error:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message: "Stream error", type: "server_error" } })}\n\n`));
        controller.close();
      }
    },
  });
}

export interface OpenAICompletionMessage {
  role: string;
  content: string | null;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
}

export interface OpenAICompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAICompletionMessage;
    finish_reason: string | null;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/** Non-streaming completion shape (curl / tests / non-chat clients). */
export function createOpenAICompletion(opts: {
  result: NovaAgentResult;
  model: string;
  confirmation?: OpenAIConfirmationPayload | null;
}): OpenAICompletionResponse {
  const id = `chatcmpl-flow-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);
  const message: OpenAICompletionMessage = { role: "assistant", content: opts.result.response };
  let finishReason: string | null = "stop";

  if (opts.confirmation) {
    message.tool_calls = [
      {
        id: `call_${opts.confirmation.token.slice(0, 8)}`,
        type: "function",
        function: {
          name: FLOW_TOOL_NAME,
          arguments: JSON.stringify({
            token: opts.confirmation.token,
            reason: opts.confirmation.reason,
            tool: opts.confirmation.toolName,
            args: opts.confirmation.args,
          }),
        },
      },
    ];
    finishReason = "tool_calls";
  }

  return {
    id,
    object: "chat.completion",
    created,
    model: opts.model,
    choices: [{ index: 0, message, finish_reason: finishReason }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export function getBridgeModels(): ReadonlyArray<{ id: string; name: string; description: string }> {
  return FLOW_MODELS;
}