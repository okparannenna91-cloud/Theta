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

        const { prompt, imageUrl, workspaceId, conversationId, projectId, context } = await req.json();

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

        const decision = DecisionFramework.evaluate(prompt);
        if (decision.requiresApproval) {
            return NextResponse.json({
                error: `**ACTION BLOCKED — CONFIRMATION REQUIRED**\n\nYour request has been classified as **HIGH RISK** (${decision.intent} action).\nPlease confirm explicitly if you want to proceed.`,
                requiresApproval: true,
                riskLevel: decision.riskLevel,
                intent: decision.intent,
            }, { status: 403 });
        }

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

        let workspaceContext = "";
        if (workspaceId) {
            const { ContextSystem } = await import("@/lib/nova/context-system");
            const { MemorySystem } = await import("@/lib/nova/memory-system");

            const [activeContext, longTermMemories, shortTermHistories] = await Promise.all([
                ContextSystem.getActiveContext({
                    workspaceId,
                    userId: user.id,
                    projectId: projectId || undefined,
                }),
                MemorySystem.getLongTerm(user.id, workspaceId).catch(() => ({})),
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
${formattedMemories || "No stored long-term memories."}

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

        const systemPrompt = `${NOVA_SYSTEM_PROMPT}\n${workspaceContext}\n\nYou are Nova, an AI Operator. Execute tools when asked. Summarize actions in bold. Use markdown tables for data when appropriate.\n\n[DECISION FRAMEWORK EVALUATION]\n- Intent: ${decision.intent}\n- Risk Level: ${decision.riskLevel}\n- Strategy: ${decision.strategy}\n- Priority: Action/Outcome first, then Explanation last. Use concise bold lists.`;
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

        const tools = buildTools({ user, workspaceId, projectId });

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
                logger.warn("[Nova] Stream timeout reached (50s) - aborting stream");
                abortController.abort("Stream timeout after 50s");
            }, 50000);

            try {
                const result = await streamText({
                    model: openrouterProvider("openai/gpt-4o-mini"),
                    system: systemPrompt,
                    prompt: prompt,
                    tools,
                    maxRetries: 2,
                    abortSignal: abortController.signal,
                    onError: ({ error }: { error: unknown }) => {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        logger.error("[Nova] Stream error:", errorMessage, {
                            errorName: error instanceof Error ? error.name : typeof error,
                            timestamp: new Date().toISOString()
                        });
                        if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('abort'))) {
                            logger.warn("[Nova] Stream aborted:", errorMessage);
                        }
                    },
                    onFinish: async ({ text, finishReason }: { text: string; finishReason?: string }) => {
                        clearTimeout(timeoutId);
                        logger.info("[Nova] Stream finished", {
                            finishReason,
                            textLength: text?.length || 0,
                            timestamp: new Date().toISOString()
                        });
                        if (text && conversationId) {
                            try {
                                const db = getPrismaClient(workspaceId);
                                await db.aiMessage.create({ data: { conversationId, role: "assistant", content: text } });
                            } catch (e) {
                                logger.error("[Nova] Failed to save assistant message:", e);
                            }
                        }
                    },
                });
                const response = result.toTextStreamResponse();
                clearTimeout(timeoutId);
                return response;
            } catch (streamError: any) {
                clearTimeout(timeoutId);
                const isAbort = streamError?.name === 'AbortError' || streamError?.message?.includes('abort') || streamError?.message?.includes('AbortError');
                logger.error("[Nova] Stream execution failed:", {
                    message: streamError?.message,
                    name: streamError?.name,
                    isAbort,
                    timestamp: new Date().toISOString()
                });
                if (isAbort) {
                    return new Response("The request took too long. Please try a simpler query or try again.", { status: 200 });
                }
                return new Response(`I encountered an issue while processing your request. Please try again.`, { status: 200 });
            }
        } else {
            const text = await NovaOrchestrator.execute(prompt, { systemPrompt, imageUrl });
            const optimized = PhilosophyEngine.optimizeResponse(text, decision.intent);
            return new Response(optimized);
        }
    } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('abort') || error.message?.includes('AbortError')) {
            logger.warn("[Nova] Request was aborted:", error.message);
            return new Response("The request was interrupted. Please try again.", { status: 200 });
        }
        logger.error("Nova AI error:", error);
        return new Response(`I encountered an issue while processing your request. Please try again.`, { status: 200 });
    }
}
