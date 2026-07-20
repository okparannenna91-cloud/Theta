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
import { checkForHallucination } from "@/lib/nova/hallucination-checker";
import { shouldBlockWriteTool } from "@/lib/nova/execution-guard";
import { llmClassifyIntent } from "@/lib/nova/llm-intent-classifier";
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

        decision = DecisionFramework.evaluate(sanitizedPrompt);
        route = routeRequest(sanitizedPrompt, decision.intent);

        // Fallback: use LLM intent classifier if regex confidence is low
        try {
          const llmIntent = await llmClassifyIntent(sanitizedPrompt, decision.intent, {
            hasWorkspace: !!workspaceId,
            hasProject: !!projectId,
          });
          if (llmIntent && llmIntent !== decision.intent) {
            logger.info("[Nova] LLM overrode regex intent", { regex: decision.intent, llm: llmIntent });
            decision = { ...decision, intent: llmIntent };
            route = routeRequest(sanitizedPrompt, llmIntent);
          }
        } catch {
          // LLM classification is best-effort fallback
        }

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
              const tools = (await import("@/lib/langraph/tools")).buildLangGraphTools({
                userId: user!.id,
                workspaceId,
                projectId: projectId || undefined,
              });

              let modelWithTools = chatModel;
              if (tools.length > 0) {
                modelWithTools = (chatModel as any).bindTools(tools);
              }

              const messages: any[] = [
                new SystemMessage(systemPrompt),
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
              const MAX_ITERATIONS = 5;

              for (let i = 0; i < MAX_ITERATIONS; i++) {
                const response = await modelWithTools.invoke(messages, {});
                const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
                const toolCalls = response.tool_calls || [];

                if (content && content !== fullResponse) {
                  const newContent = content.slice(fullResponse.length);
                  if (newContent) {
                    fullResponse = content;
                    sendSSE(controller, encoder, "token", newContent);
                  }
                }

                if (toolCalls.length === 0) {
                  break;
                }

                sendSSE(controller, encoder, "tool_start", JSON.stringify({
                  tools: toolCalls.map((tc: any) => tc.name),
                  iteration: i + 1,
                }));

                messages.push(new (await import("@langchain/core/messages")).AIMessage({ content: content || "", tool_calls: toolCalls }));

                const { executeTool } = await import("@/lib/langraph/nodes/tool-executor");
                for (const tc of toolCalls) {
                  // Execution guard: block write tools on read-only intents
                  if (shouldBlockWriteTool(tc.name, decision!.intent)) {
                    logger.warn(`[Nova] Blocked write tool "${tc.name}" on read-only intent ${decision!.intent}`);
                    messages.push(new (await import("@langchain/core/messages")).ToolMessage(
                      `Tool "${tc.name}" cannot be used for this type of request. This is a read-only context.`,
                      tc.id!,
                    ));
                    sendSSE(controller, encoder, "tool_end", JSON.stringify({
                      tool: tc.name,
                      success: false,
                      blocked: true,
                    }));
                    continue;
                  }

                  sendSSE(controller, encoder, "tool_progress", JSON.stringify({
                    tool: tc.name,
                    status: "executing",
                  }));

                  const result = await executeTool({
                    userId: user!.id,
                    workspaceId,
                    projectId: projectId || undefined,
                  }, tc.name, tc.args as Record<string, unknown>);

                  const toolOutput = result.success
                    ? (typeof result.result === "object" && result.result
                        ? (result.result as any).message || JSON.stringify(result.result)
                        : String(result.result))
                    : `Error: ${result.error}`;

                  messages.push(new (await import("@langchain/core/messages")).ToolMessage(toolOutput, tc.id!));

                  sendSSE(controller, encoder, "tool_end", JSON.stringify({
                    tool: tc.name,
                    success: result.success,
                  }));
                }
              }

              // Post-execution: Hallucination check
              const toolResultsForCheck = messages
                .filter((m: any) => m._getType?.() === "tool" || m.constructor?.name === "ToolMessage")
                .map((m: any) => ({ toolName: "tool", result: m.content }));

              const hallucinationCheck = checkForHallucination(fullResponse, toolResultsForCheck);
              if (!hallucinationCheck.isConsistent) {
                logger.warn("[Nova] Hallucination detected", { issues: hallucinationCheck.issues });
              }

              // Quality gate + response optimization
              fullResponse = validateAndSanitize(fullResponse);
              fullResponse = optimizeResponse(fullResponse, decision!.intent);

              const qgResult = runQualityGate(fullResponse, {
                route: route!.path,
                workspaceContext: "",
                userPrompt: sanitizedPrompt,
              });
              if (qgResult.passed) {
                fullResponse = qgResult.response;
              }

              // Format response with proactive insights
              try {
                const formatType = decision!.intent === "CREATE" || decision!.intent === "UPDATE" || decision!.intent === "DELETE"
                  ? "action"
                  : decision!.intent === "ANALYZE" || decision!.intent === "REPORT"
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

              // Save conversation memory
              try {
                const { saveConversationMemory } = await import("@/lib/langraph/nodes/memory-saver");
                await saveConversationMemory({
                  userId: user!.id,
                  workspaceId,
                  conversationId,
                  prompt: sanitizedPrompt,
                  response: fullResponse,
                  toolResults: toolResultsForCheck,
                });
              } catch { /* memory saving is best-effort */ }

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
