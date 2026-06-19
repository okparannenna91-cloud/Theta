import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { getCurrentUser } from "@/lib/auth";
import { canAccessProjectResource } from "@/lib/project-permissions";

import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DecisionFramework } from "@/lib/nova/decision-framework";
import { NovaOrchestrator } from "@/lib/nova/nova-orchestrator";
import { PhilosophyEngine } from "@/lib/nova/philosophy-engine";
import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { buildTools } from "@/lib/ai-tools";
import { recordStreamEvent } from "@/lib/ai-monitoring";
import { ALL_TOOL_NAMES } from "@/lib/ai-tools/registry";
import { routeRequest } from "@/lib/nova/intent-router";
import { executeDirectAction } from "@/lib/nova/direct-actions";
import { telemetry } from "@/lib/nova/telemetry";

const MAX_MEMORY_LENGTH = 1000;
const MAX_HISTORY_ENTRIES = 20;
const JAILBREAK_PATTERNS = [
  /ignore\s+all\s+(previous|prior)\s+instructions/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /you\s+are\s+now\s+(free|unconstrained|unbounded)/i,
  /override\s+(mode|system|prompt)/i,
  /new\s+era\s+(mode|instruction)/i,
  /DAN|do\s+anything\s+now/i,
  /roleplay\s+as/i,
  /pretend\s+(you\s+are|to\s+be)/i,
];

function sanitizeUserContent(text: string): string {
  let cleaned = text;
  for (const pattern of JAILBREAK_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[REDACTED]");
  }
  return cleaned.slice(0, MAX_MEMORY_LENGTH);
}

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

import { NOVA_SYSTEM_PROMPT as CORE_NOVA_SYSTEM_PROMPT } from "@/lib/nova/config";
import { AGENT_REGISTRY } from "@/lib/nova/config";
import { SERVICE_REGISTRY } from "@/lib/nova/config";

const NOVA_SYSTEM_PROMPT = `${CORE_NOVA_SYSTEM_PROMPT}

[OPERATING GUIDELINES]
1. PRIORITIZE ACTION: Use tools immediately when a user request can be fulfilled by them. ALWAYS call the appropriate tool for "list tasks", "list projects", "list workspaces", "show workspaces", "list members", etc.
2. EXPLAINABILITY: Always explain *why* you are taking an action. Cite where you found information.
3. TRANSPARENCY: If a tool execution fails or needs more info, be clear about it.
4. PROACTIVITY: If a project seems stalled or tasks are overdue, suggest 'get_suggestions'.
5. FORMATTING: Use bold for entity names. Use Mermaid.js syntax for diagrams (e.g. flowcharts, gantt charts) when explaining complex dependencies or workflows. When listing data, format it as a markdown table.
6. REAL-TIME: You can broadcast updates via Ably for immediate UI feedback.
7. ALWAYS use list_tasks when asked about tasks, list_projects when asked about projects, list_workspaces when asked about workspaces, list_members when asked about members. Do NOT just acknowledge the request — actually call the tool and return the results.

Available Specialized Agents: ${AGENT_REGISTRY.map(a => `${a.name} (${a.purpose})`).join(", ")}.

Available Infrastructure Services: ${SERVICE_REGISTRY.map(s => `${s.provider} (${s.category})`).join(", ")}.

You are professional, data-driven, and proactive. ALWAYS execute the tool — never just say you cannot do something without trying first.`;

export async function POST(req: Request) {
    const requestStart = Date.now();
    let user: Awaited<ReturnType<typeof getCurrentUser>> = null as any;
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

        const { prompt, imageUrl, workspaceId: wsId, conversationId, projectId, context } = await req.json();
        workspaceId = wsId || "";

        if (!prompt) {
            return NextResponse.json({ error: "Nova needs a prompt to help you" }, { status: 400 });
        }

        // Verify project access if projectId is provided
        if (workspaceId && projectId) {
            const hasAccess = await canAccessProjectResource(user.id, workspaceId, projectId);
            if (!hasAccess) {
                return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
            }
        }

        decision = DecisionFramework.evaluate(prompt);
        if (decision.requiresApproval) {
            return NextResponse.json({
                error: `**ACTION BLOCKED — CONFIRMATION REQUIRED**\n\nYour request has been classified as **HIGH RISK** (${decision.intent} action).\nPlease confirm explicitly if you want to proceed.`,
                requiresApproval: true,
                riskLevel: decision.riskLevel,
                intent: decision.intent,
            }, { status: 403 });
        }

        route = routeRequest(prompt, decision.intent, decision.strategy);

        recordStreamEvent(user.id, workspaceId || "none", "routing_decision", {
            conversationId,
            promptLength: prompt?.length || 0,
            path: route.path,
            intent: decision.intent,
            strategy: decision.strategy,
            contextDepth: route.contextDepth,
            toolCategories: route.toolCategories,
        }).catch(() => {});

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

        // Direct Action Engine — bypass AI for common productivity commands
        const directResult = await executeDirectAction({ prompt, user, workspaceId, projectId });
        if (directResult.handled) {
            logger.info("[DirectAction] Handled request", {
                action: directResult.action,
                durationMs: Date.now() - requestStart,
                success: directResult.success,
            });
            return new Response(directResult.message || directResult.error || "Action processed.", {
                status: 200,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        }

        let workspaceContext = "";
        if (workspaceId && route.contextDepth !== "minimal") {
            const { ContextSystem } = await import("@/lib/nova/context-system");
            const { MemorySystem } = await import("@/lib/nova/memory-system");

            const memoryDepth = route.contextDepth === "full" ? "full" : "lightweight";
            logger.info("[Nova] Loading context", {
                path: route.path,
                contextDepth: route.contextDepth,
                memoryDepth,
            });

            const loadMemory = memoryDepth === "full"
                ? MemorySystem.getLongTerm(user.id, workspaceId).catch(() => ({}))
                : Promise.resolve({});

            const [activeContext, longTermMemories, shortTermHistories] = await Promise.all([
                ContextSystem.getActiveContext({
                    workspaceId,
                    userId: user.id,
                    projectId: projectId || undefined,
                }),
                loadMemory,
                MemorySystem.getShortTerm(conversationId || "global").catch(() => []),
            ]);

            const formattedMemories = Object.entries(longTermMemories)
                .map(([key, val]) => `- ${key}: ${sanitizeUserContent(val as string)}`)
                .join("\n");

            const historySlice = shortTermHistories.slice(-MAX_HISTORY_ENTRIES);
            const formattedHistory = historySlice
                .map((h: { role: string; content: string }) => `- [${h.role.toUpperCase()}]: ${sanitizeUserContent(h.content).substring(0, 200)}`)
                .join("\n");

            workspaceContext = `${sanitizeUserContent(activeContext.promptString)}

[NOVA HISTORICAL SYSTEM MEMORY]
User Preferences / Conventions:
${memoryDepth === "full" ? (formattedMemories || "No stored long-term memories.") : "[Memory skipped — lightweight mode]"}

Recent Chat Session Context:
${formattedHistory || "No recent conversation history."}
---`;

            if (conversationId) {
                const db = getPrismaClient(workspaceId);
                db.aiMessage.create({
                    data: { conversationId, role: "user", content: prompt }
                }).catch(() => {});
                MemorySystem.saveShortTerm(conversationId, { role: "user", content: prompt }).catch(() => {});
            }
        }

        const systemPrompt = `${NOVA_SYSTEM_PROMPT}\n${workspaceContext}\n\nYou are Nova, an AI Operator. Execute tools when asked. Summarize actions in bold. Use markdown tables for data when appropriate.\n\n[DECISION FRAMEWORK EVALUATION]\n- Intent: ${decision.intent}\n- Risk Level: ${decision.riskLevel}\n- Strategy: ${decision.strategy}\n- Priority: Action/Outcome first, then Explanation last. Use concise bold lists.${route.promptSuffix}`;
        const shouldStream = !imageUrl;

        try {
            const { checkLimitExceeded, incrementNovaUsage } = await import("@/lib/usage-tracking");

            const isExceeded = await checkLimitExceeded(workspaceId, "nova");
            if (isExceeded) {
                return new Response(JSON.stringify({ error: "Nova limit exceeded for this plan. Please upgrade to continue." }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" }
                });
            }

            await incrementNovaUsage(workspaceId, user.id);
        } catch (e) {
            logger.error("Usage tracking error:", e);
        }

        const tools = buildTools({ user, workspaceId, projectId }, route.toolCategories);

        const loadedToolNames = Object.keys(tools);
        logger.info("[Nova] Tool load", {
            intent: decision.intent,
            path: route.path,
            totalAvailable: ALL_TOOL_NAMES.length,
            loaded: loadedToolNames.length,
            categories: route.toolCategories,
            toolList: loadedToolNames.join(","),
        });

        if (shouldStream) {
            const openrouterProvider = createOpenAI({
                apiKey: process.env.OPENROUTER,
                baseURL: "https://openrouter.ai/api/v1",
                headers: {
                    "HTTP-Referer": "https://thetapm.site",
                    "X-Title": "Nova AI",
                }
            });

            const abortController = new AbortController();
            const timeoutId = setTimeout(() => {
                logger.warn("[Nova] Stream timeout reached", {
                    timeoutMs: route!.timeoutMs,
                    path: route!.path,
                });
                recordStreamEvent(user!.id, workspaceId, "timeout", {
                    conversationId,
                    promptLength: prompt?.length || 0,
                });
                abortController.abort(`Stream timeout after ${route!.timeoutMs}ms`);
            }, route!.timeoutMs);

            const toolNames = Object.keys(tools);
            logger.info("[Nova] Starting stream", {
                promptLength: prompt?.length || 0,
                toolsCount: toolNames.length,
                toolList: toolNames.join(","),
                systemPromptLength: systemPrompt?.length || 0,
                workspaceId,
                conversationId,
                timestamp: new Date().toISOString()
            });

            try {
                const result = await streamText({
                    model: openrouterProvider("openai/gpt-4o-mini"),
                    system: systemPrompt,
                    prompt: prompt,
                    tools: tools as any,
                    maxRetries: 2,
                    abortSignal: abortController.signal,
                    onError: ({ error }: { error: unknown }) => {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        const isOpenRouterError = errorMessage.includes("OpenRouter") || errorMessage.includes("401") || errorMessage.includes("402") || errorMessage.includes("429");
                        recordStreamEvent(user!.id, workspaceId, isOpenRouterError ? "openrouter_error" : "aborted_stream", {
                            conversationId,
                            promptLength: prompt?.length || 0,
                            errorMessage,
                        });
                        logger.error("[Nova] Stream error:", errorMessage, {
                            errorName: error instanceof Error ? error.name : typeof error,
                            isOpenRouterError,
                            timestamp: new Date().toISOString()
                        });
                    },
                    onFinish: async ({ text, finishReason }: { text: string; finishReason?: string }) => {
                        clearTimeout(timeoutId);
                        const isToolOnly = finishReason === "tool_calls" && !text?.length;
                        if (isToolOnly) {
                            recordStreamEvent(user!.id, workspaceId, "tool_only_completion", {
                                conversationId,
                                finishReason,
                                promptLength: prompt?.length || 0,
                            });
                        }
                        logger.info("[Nova] Stream finished", {
                            finishReason,
                            textLength: text?.length || 0,
                            hasText: !!text?.length,
                            isToolOnly,
                            timestamp: new Date().toISOString()
                        });
                        if (conversationId) {
                            const content = text?.trim() || "[Action completed by Nova]";
                            try {
                                const db = getPrismaClient(workspaceId);
                                await db.aiMessage.create({ data: { conversationId, role: "assistant", content } });
                            } catch (e) {
                                logger.error("[Nova] Failed to save assistant message:", e);
                            }
                        }
                    },
                });

                const FALLBACK_TEXT = "I've completed your request.";
                let hasContent = false;
                const safeStream = (result.textStream as any).pipeThrough(new TransformStream<string, string>({
                    transform(chunk, controller) {
                        hasContent = true;
                        controller.enqueue(chunk);
                    },
                    flush(controller) {
                        if (!hasContent) {
                            logger.info("[Nova] Stream empty — injecting fallback text", {
                                timestamp: new Date().toISOString()
                            });
                            recordStreamEvent(user!.id, workspaceId, "empty_stream", {
                                conversationId,
                                promptLength: prompt?.length || 0,
                            });
                            controller.enqueue(FALLBACK_TEXT);
                        }
                    },
                }));

                const response = new Response(
                    safeStream.pipeThrough(new TextEncoderStream()),
                    {
                        headers: { "Content-Type": "text/plain; charset=utf-8" },
                        status: 200,
                    }
                );
                clearTimeout(timeoutId);
                telemetry.trackRequest({
                    userId: user.id,
                    workspaceId,
                    path: route.path,
                    intent: decision.intent,
                    strategy: decision.strategy,
                    totalDurationMs: Date.now() - requestStart,
                    success: true,
                });
                return response;
            } catch (streamError: any) {
                clearTimeout(timeoutId);
                const isAbort = streamError?.name === 'AbortError' || streamError?.message?.includes('abort') || streamError?.message?.includes('AbortError');
                const isTimeout = streamError?.message?.includes("timed out") || streamError?.message?.includes("timeout") || streamError?.message?.includes("50s");
                const isOpenRouterError = streamError?.message?.includes("OpenRouter") || streamError?.message?.includes("401") || streamError?.message?.includes("402") || streamError?.message?.includes("429");
                const eventType: "timeout" | "openrouter_error" | "aborted_stream" = isTimeout ? "timeout" : isOpenRouterError ? "openrouter_error" : "aborted_stream";
                recordStreamEvent(user.id, workspaceId, eventType, {
                    conversationId,
                    promptLength: prompt?.length || 0,
                    errorMessage: streamError?.message,
                });
                logger.error("[Nova] Stream execution failed:", {
                    message: streamError?.message,
                    name: streamError?.name,
                    isAbort,
                    isTimeout,
                    isOpenRouterError,
                    eventType,
                    timestamp: new Date().toISOString()
                });
                if (isAbort || isTimeout) {
                    telemetry.trackRequest({
                        userId: user.id,
                        workspaceId,
                        path: route.path,
                        intent: decision.intent,
                        strategy: decision.strategy,
                        totalDurationMs: Date.now() - requestStart,
                        success: false,
                        errorType: eventType,
                        errorMessage: streamError?.message,
                    });
                    return new Response("The request took too long. Please try a simpler query or try again.", { status: 200 });
                }
                telemetry.trackRequest({
                    userId: user.id,
                    workspaceId,
                    path: route.path,
                    intent: decision.intent,
                    strategy: decision.strategy,
                    totalDurationMs: Date.now() - requestStart,
                    success: false,
                    errorType: eventType,
                    errorMessage: streamError?.message,
                });
                return new Response(`I encountered an issue while processing your request. Please try again.`, { status: 200 });
            }
        } else {
            const text = await NovaOrchestrator.execute(prompt, { systemPrompt, imageUrl });
            const optimized = PhilosophyEngine.optimizeResponse(text, decision.intent);
            telemetry.trackRequest({
                userId: user.id,
                workspaceId,
                path: route.path,
                intent: decision.intent,
                strategy: decision.strategy,
                totalDurationMs: Date.now() - requestStart,
                success: true,
            });
            return new Response(optimized);
        }
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
        return new Response(`I encountered an issue while processing your request. Please try again.`, { status: 200 });
    }
}
