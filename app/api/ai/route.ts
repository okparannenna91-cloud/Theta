import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProjectResource } from "@/lib/project-permissions";

import { DecisionFramework } from "@/lib/nova/decision-framework";
import { detectPromptInjection } from "@/lib/nova/security-guard";
import { sanitizeUserInput } from "@/lib/nova/output-validator";
import { logger } from "@/lib/logger";
import { routeRequest } from "@/lib/nova/intent-router";
import { telemetry } from "@/lib/nova/telemetry";
import { buildSystemPromptForIntent } from "@/lib/nova/config";
import { validateAndSanitize, optimizeResponse, runQualityGate } from "@/lib/langraph/nodes/output-validator";
import { ResponseFormatter } from "@/lib/nova/response-formatter";
import { ProactiveIntelligenceEngine } from "@/lib/nova/proactive-intelligence";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60;

async function isRateLimited(userId: string): Promise<boolean> {
  try {
    const { redis } = await import("@/lib/redis/client");
    const key = `nova:ratelimit:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }
    return count > RATE_LIMIT_MAX_REQUESTS;
  } catch {
    return false;
  }
}

function getSystemPromptForIntent(intent: string): string {
  const constitutionIntent = intent === "PLAN" || intent === "ORCHESTRATE" || intent === "CONSULT"
    ? "ANALYSIS"
    : intent === "CREATE" || intent === "UPDATE" || intent === "DELETE" || intent === "AUTOMATE"
      ? "ACTION"
      : "CHAT";
  return buildSystemPromptForIntent(constitutionIntent as 'CHAT' | 'ACTION' | 'ANALYSIS');
}

function sendSSE(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, event: string, data: string) {
  const payload = `event: ${event}\ndata: ${data}\n\n`;
  controller.enqueue(encoder.encode(payload));
}

export async function POST(req: Request) {
    const requestStart = Date.now();
    let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
    let workspaceId: string = "";
    let route: ReturnType<typeof routeRequest> | undefined;
    let decision: ReturnType<typeof DecisionFramework.evaluate> | undefined;

    try {
        user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (await isRateLimited(user.id)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please wait a moment before trying again." },
                { status: 429 }
            );
        }

        const { prompt, workspaceId: wsId, conversationId, projectId, context: pageContext, attachments } = await req.json();
        workspaceId = wsId || "";

        if (!prompt) {
            return NextResponse.json({ error: "Nova needs a prompt to help you" }, { status: 400 });
        }

        if (workspaceId) {
            const { prisma } = await import("@/lib/prisma");
            const membership = await prisma.workspaceMember.findFirst({
                where: { workspaceId, userId: user.id, status: "active" },
                select: { id: true },
            });
            if (!membership) {
                return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
            }
        }

        const sanitizedPrompt = sanitizeUserInput(prompt);
        if (detectPromptInjection(prompt)) {
            logger.warn(`[Nova] Prompt injection blocked for user ${user.id}`);
            return NextResponse.json({ error: "Your request was blocked by security filters. Please rephrase." }, { status: 400 });
        }

        if (workspaceId && projectId) {
            const hasAccess = await canAccessProjectResource(user.id, workspaceId, projectId);
            if (!hasAccess) {
                return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
            }
        }

        decision = await DecisionFramework.evaluateAsync(sanitizedPrompt, {
          hasWorkspace: !!workspaceId,
          hasProject: !!projectId,
        });
        route = routeRequest(sanitizedPrompt, decision.intent);

        logger.info("[Nova] Intent classified", {
          intent: decision.intent,
          strategy: decision.strategy,
          path: route.path,
          riskLevel: decision.riskLevel,
        });

        if (workspaceId) {
            const { getNovaRequestCount } = await import("@/lib/usage-tracking");
            const currentUsage = await getNovaRequestCount(workspaceId);

            try {
                const { enforcePlanLimit } = await import("@/lib/plan-limits");
                await enforcePlanLimit(workspaceId, "nova", currentUsage);
            } catch (error: any) {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }
        }

        if (decision.requiresApproval) {
            return NextResponse.json({
                error: `**ACTION BLOCKED — CONFIRMATION REQUIRED**\n\nYour request has been classified as **HIGH RISK** (${decision.intent} action).\nPlease confirm explicitly if you want to proceed.`,
                requiresApproval: true,
                riskLevel: decision.riskLevel,
                intent: decision.intent,
            }, { status: 403 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const { routeModel } = await import("@/lib/langraph/model-router");
              const { getLangChainModel } = await import("@/lib/langraph/models");
              const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");

              const routerConfig = await routeModel(sanitizedPrompt, workspaceId);
              const systemPrompt = getSystemPromptForIntent(decision!.intent);

              // Load workspace context for quality gate and response formatting
              let workspaceContextForQG = "";
              if (workspaceId) {
                try {
                  const { ContextSystem } = await import("@/lib/nova/context-system");
                  const { promptString } = await ContextSystem.getActiveContext({
                    workspaceId,
                    userId: user!.id,
                    projectId: projectId || undefined,
                    contextDepth: route?.contextDepth || "standard",
                  });
                  workspaceContextForQG = promptString;
                } catch { /* context loading is best-effort */ }
              }

              sendSSE(controller, encoder, "thinking", JSON.stringify({
                message: `Analyzing your request (${decision!.intent})...`,
                route: route!.path,
              }));

              sendSSE(controller, encoder, "start", JSON.stringify({
                provider: routerConfig.provider,
                model: routerConfig.model,
                route: route!.path,
                intent: decision!.intent,
              }));

              const chatModel = getLangChainModel(routerConfig.provider, routerConfig.model);

              const OBSERVATION_PROMPT_SUFFIX = "\n\nBEHAVIOR: In this environment you cannot create, edit, delete, assign, schedule, or execute workspace actions yourself — you reason, analyze, and advise. Keep this constraint internal: never announce it, never mention your mode, capabilities, or status, and never describe yourself in greetings. Respond naturally and conversationally. If the user asks you to perform an action, briefly explain how they can do it themselves in the Theta PM interface, without framing it as a limitation.";

              const messages: any[] = [
                new SystemMessage(systemPrompt + OBSERVATION_PROMPT_SUFFIX),
              ];

              let userContent = sanitizedPrompt;
              if (attachments && attachments.length > 0) {
                const { getFileContentPreview } = await import("@/lib/nova/file-upload");
                const attachmentParts = await Promise.all(attachments.map(async (att: any) => {
                  if (att.type.startsWith("image/")) {
                    return { type: "image_url", image_url: { url: `data:${att.type};base64,${att.data}` } };
                  }
                  const preview = await getFileContentPreview(att);
                  return { type: "text", text: `[Attached ${att.name}]:\n${preview}` };
                }));
                messages.push(new HumanMessage({ content: [
                  { type: "text", text: sanitizedPrompt },
                  ...attachmentParts,
                ] }));
              } else {
                messages.push(new HumanMessage(sanitizedPrompt));
              }

              let fullResponse = "";

              const response = await chatModel.invoke(messages, {});
              fullResponse = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
              sendSSE(controller, encoder, "token", fullResponse);

              // Quality gate + response optimization
              fullResponse = validateAndSanitize(fullResponse);
              fullResponse = optimizeResponse(fullResponse, decision!.intent);

              const qgResult = runQualityGate(fullResponse, {
                route: route!.path,
                workspaceContext: workspaceContextForQG,
                userPrompt: sanitizedPrompt,
              });
              if (qgResult.passed) {
                fullResponse = qgResult.response;
              }

              // Format response with proactive insights
              try {
                const formatType = decision!.intent === "ANALYZE" || decision!.intent === "REPORT"
                  ? "analysis"
                  : "conversation";

                let proactiveInsights = null;
                if (["ANALYSIS", "REPORT", "CHAT"].includes(route!.path) && workspaceId) {
                  try {
                    proactiveInsights = await ProactiveIntelligenceEngine.analyzeWorkspace(workspaceId);
                  } catch { /* best-effort */ }
                }

                const formatted = ResponseFormatter.format(fullResponse, formatType, {
                  includeConfidence: formatType === "analysis",
                  includeProactive: !!proactiveInsights?.topRecommendation,
                  proactiveInsights: proactiveInsights
                    ? ProactiveIntelligenceEngine.formatInsightsForDisplay(proactiveInsights)
                    : undefined,
                });
                fullResponse = formatted.content;
              } catch {
                // Formatting is best-effort
              }

              if (workspaceId && user) {
                const { incrementNovaUsage } = await import("@/lib/usage-tracking");
                incrementNovaUsage(workspaceId, user.id).catch(() => {});
              }

              const toolResultsForCheck: Array<{ toolName: string; result: string }> = [];

              const { saveConversationMemory } = await import("@/lib/langraph/nodes/memory-saver");
              await saveConversationMemory({
                userId: user!.id,
                workspaceId,
                conversationId,
                prompt: sanitizedPrompt,
                response: fullResponse,
                toolResults: toolResultsForCheck,
              });

              // Auto-extract memories
              try {
                const { AutoMemoryExtractor } = await import("@/lib/nova/auto-memory-extractor");
                await AutoMemoryExtractor.extractAndSave(
                  user!.id,
                  workspaceId,
                  messages,
                );
              } catch { /* auto-extraction is best-effort */ }

              sendSSE(controller, encoder, "done", JSON.stringify({
                response: fullResponse,
                durationMs: Date.now() - requestStart,
                route: route!.path,
              }));

              controller.close();
            } catch (streamError: any) {
              logger.error("[Nova SSE] Stream error:", streamError);
              sendSSE(controller, encoder, "error", JSON.stringify({
                message: streamError.message?.includes('timeout')
                  ? "This took longer than expected. Try a simpler request."
                  : "Something went wrong on my end. Give it another shot.",
              }));
              controller.close();
            }
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
    } catch (error: any) {
        const isAbort = error.name === 'AbortError' || error.message?.includes('abort') || error.message?.includes('AbortError');
        if (isAbort) {
            logger.warn("[Nova] Request was aborted:", error.message);
            telemetry.trackRequest({
                userId: user?.id || "unknown",
                workspaceId: workspaceId || "unknown",
                path: route?.path || "ACTION",
                intent: decision?.intent || "UNKNOWN",
                strategy: decision?.strategy || "PATH_A_IMMEDIATE",
                totalDurationMs: Date.now() - requestStart,
                success: false,
                errorType: "aborted_stream",
                errorMessage: error.message,
            });
            return new Response("The request was interrupted. Please try again.", { status: 200 });
        }
        logger.error("Nova AI error:", error);
        telemetry.trackRequest({
            userId: user?.id || "unknown",
            workspaceId: workspaceId || "unknown",
            path: route?.path || "ACTION",
            intent: decision?.intent || "UNKNOWN",
            strategy: decision?.strategy || "PATH_A_IMMEDIATE",
            totalDurationMs: Date.now() - requestStart,
            success: false,
            errorType: "unexpected_exception",
            errorMessage: error.message,
        });
        return new Response("Something went wrong on my end. Give it another shot — if it keeps happening, I'll look into it.", { status: 200 });
    }
}
