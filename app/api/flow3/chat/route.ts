import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentWorkspace, verifyWorkspaceAccess } from "@/lib/workspace";
import { logger } from "@/lib/logger";
import { sanitizeUserInput } from "@/lib/nova/output-validator";
import { detectPromptInjection } from "@/lib/nova/security-guard";
import {
  classifyBridgeRequest,
  extractConfirmationFromResult,
  runApprovedAction,
} from "@/lib/nova/bridge";
import { runNovaAgent } from "@/lib/langraph";
import {
  clearConfirmation,
  getPendingConfirmation,
  isApprovalMessage,
  isDenialMessage,
  requestConfirmation,
} from "@/lib/nova/confirmation";
import { buildSystemPromptForIntent } from "@/lib/nova/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60;

async function isRateLimited(userId: string): Promise<boolean> {
  try {
    const { redis } = await import("@/lib/redis/client");
    const key = `flow:nativeratelimit:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }
    return count > RATE_LIMIT_MAX_REQUESTS;
  } catch {
    return false;
  }
}

interface Flow3RequestBody {
  prompt?: string;
  conversationId?: string;
  workspaceId?: string;
}

export async function POST(req: Request) {
  const requestStart = Date.now();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (await isRateLimited(user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    let body: Flow3RequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const rawPrompt = (body.prompt || "").trim();
    if (!rawPrompt) {
      return NextResponse.json({ error: "Flow³ needs a prompt to help you" }, { status: 400 });
    }

    let workspaceId = body.workspaceId || "";
    if (workspaceId) {
      const allowed = await verifyWorkspaceAccess(user.id, workspaceId);
      if (!allowed) {
        return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
      }
    } else {
      const currentWorkspace = await getCurrentWorkspace(user.id);
      if (!currentWorkspace) {
        return NextResponse.json({ error: "No workspace available" }, { status: 403 });
      }
      workspaceId = currentWorkspace.id;
    }

    const sanitizedPrompt = sanitizeUserInput(rawPrompt);
    if (detectPromptInjection(rawPrompt)) {
      logger.warn(`[Flow3] Prompt injection blocked for user ${user.id}`);
      return NextResponse.json(
        { error: "Your request was blocked by security filters. Please rephrase." },
        { status: 400 }
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

    // Resolve or create the persisted conversation.
    const { prisma } = await import("@/lib/prisma");
    let conversationId = body.conversationId || "";
    let isNewConversation = false;
    if (conversationId) {
      const owned = await prisma.aiConversation.findFirst({
        where: { id: conversationId, userId: user.id },
        select: { id: true, title: true },
      });
      if (!owned) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    } else {
      const created = await prisma.aiConversation.create({
        data: { title: "New Conversation", workspaceId, userId: user.id },
        select: { id: true },
      });
      conversationId = created.id;
      isNewConversation = true;
    }

    // Persist the user turn.
    await prisma.aiMessage
      .create({
        data: { conversationId, role: "user", content: sanitizedPrompt },
        select: { id: true },
      })
      .catch((e: unknown) => logger.error("[Flow3] Failed to persist user message:", e));

    let titlePromise: Promise<string> | null = null;
    if (isNewConversation) {
      titlePromise = import("@/lib/nova/conversation-title")
        .then(({ generateConversationTitle }) => generateConversationTitle(sanitizedPrompt))
        .catch(() => "");
      void titlePromise;
    }

    const encoder = new TextEncoder();

    const persistAssistantMessage = async (content: string) => {
      await prisma.aiMessage
        .create({
          data: { conversationId, role: "assistant", content },
          select: { id: true },
        })
        .catch((e: unknown) => logger.error("[Flow3] Failed to persist assistant message:", e));
      await prisma.aiConversation
        .update({ where: { id: conversationId }, data: { lastMessageAt: new Date() }, select: { id: true } })
        .catch(() => {});
    };

    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          sendSSE("meta", { conversationId });

          // Pending confirmation handling — approvals/cancellations never reach the agent.
          const pending = await getPendingConfirmation(conversationId);
          if (pending) {
            if (isApprovalMessage(sanitizedPrompt)) {
              sendSSE("status", { message: "Executing approved action...", route: "ACTION" });
              const result = await runApprovedAction({
                conversationId,
                token: pending.token,
                userId: user.id,
                workspaceId,
              });
              await persistAssistantMessage(result.response);
              sendSSE("token", { text: result.response });
              sendSSE("done", {
                response: result.response,
                durationMs: Date.now() - requestStart,
                route: result.route,
              });
              controller.close();
              return;
            }
            if (isDenialMessage(sanitizedPrompt)) {
              await clearConfirmation(conversationId);
              const text = "The action was cancelled. What would you like to do next?";
              await persistAssistantMessage(text);
              sendSSE("token", { text });
              sendSSE("done", { response: text, durationMs: Date.now() - requestStart, route: "CHAT" });
              controller.close();
              return;
            }
            const text = `There is an action awaiting your confirmation: ${pending.reason}. Reply "Approve" to proceed or "Cancel" to cancel.`;
            sendSSE("token", { text });
            sendSSE("done", { response: text, durationMs: Date.now() - requestStart, route: "CHAT" });
            controller.close();
            return;
          }

          const { intent, routeDecision } = await classifyBridgeRequest(sanitizedPrompt, true);

          sendSSE("status", {
            message: `Analyzing your request (${intent})...`,
            route: routeDecision.path,
          });
          sendSSE("start", { intent, route: routeDecision.path });

          if (routeDecision.path === "ACTION" && intent === "DELETE") {
            const text =
              "**Delete actions are not permitted through Flow³ in this release.** You can delete items directly in the Theta PM interface.";
            await persistAssistantMessage(text);
            sendSSE("token", { text });
            sendSSE("done", { response: text, durationMs: Date.now() - requestStart, route: routeDecision.path });
            controller.close();
            return;
          }

          const result = await runNovaAgent(sanitizedPrompt, {
            userId: user.id,
            workspaceId,
            conversationId,
            intent,
            routeDecision,
            persistPrismaMessages: false,
          });

          // A tool asked for confirmation → surface the card.
          const pendingExtract = extractConfirmationFromResult(result.toolResults);
          if (pendingExtract) {
            const issued = await requestConfirmation({
              conversationId,
              userId: user.id,
              workspaceId,
              toolName: pendingExtract.toolName,
              args: pendingExtract.args,
              reason: pendingExtract.reason,
              intent: String(intent),
              riskLevel: "MEDIUM",
            });
            sendSSE("confirmation", {
              token: issued.token,
              reason: issued.reason,
              toolName: issued.toolName,
              args: issued.args,
            });
            sendSSE("done", {
              response: "",
              durationMs: Date.now() - requestStart,
              route: routeDecision.path,
              requiresConfirmation: true,
            });
            controller.close();
            return;
          }

          const { incrementNovaUsage } = await import("@/lib/usage-tracking");
          await incrementNovaUsage(workspaceId, user.id).catch(() => {});

          await persistAssistantMessage(result.response);

          // Audit trail (mirrors the bridge path).
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
                  source: "native",
                },
              },
            })
            .catch((e: unknown) => logger.error("[Flow3] Audit log failed:", e));

          sendSSE("token", { text: result.response });
          sendSSE("done", {
            response: result.response,
            durationMs: Date.now() - requestStart,
            route: result.route,
          });

          if (titlePromise) {
            const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 18000));
            const generated = await Promise.race([titlePromise, timeout]);
            const finalTitle =
              generated && generated.trim()
                ? generated.trim().slice(0, 60)
                : sanitizedPrompt.split(/\s+/).slice(0, 7).join(" ").replace(/[^\w\s'-]/g, "").trim().slice(0, 60);
            await prisma.aiConversation
              .update({ where: { id: conversationId }, data: { title: finalTitle || "New Conversation" }, select: { id: true } })
              .catch((e: unknown) => logger.error("[Flow3] Title persist failed:", e));
            sendSSE("title", { conversationId, title: finalTitle || "New Conversation" });
          }

          controller.close();
        } catch (streamError: any) {
          logger.error("[Flow3 SSE] Stream error:", streamError);
          sendSSE("error", {
            message:
              streamError?.message?.includes("timeout")
                ? "This took longer than expected. Try a simpler request."
                : "Something went wrong on my end. Give it another shot.",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    const isAbort =
      error.name === "AbortError" || error.message?.includes("abort") || error.message?.includes("AbortError");
    if (isAbort) {
      logger.warn("[Flow3] Request was aborted:", error.message);
      return new Response("The request was interrupted. Please try again.", { status: 200 });
    }
    logger.error("Flow3 AI error:", error);
    return new Response("Something went wrong on my end. Give it another shot.", { status: 500 });
  }
}