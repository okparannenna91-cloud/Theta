import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max allowed for Pro, ignored for Hobby but good for documentation

import { getCurrentUser } from "@/lib/auth";

import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DecisionFramework } from "@/lib/nova/decision-framework";
import { NovaOrchestrator } from "@/lib/nova/nova-orchestrator";
import { PhilosophyEngine } from "@/lib/nova/philosophy-engine";
import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { buildTools } from "@/lib/ai-tools";

// ─── Prompt Injection Sanitizer ───────────────────────────────────────────────
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

// ─── Redis-Backed Rate Limiter (per-user, sliding window) ────────────────────
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute

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
    // If Redis is unavailable, allow the request through
    return false;
  }
}

// ─── Audit Logger ────────────────────────────────────────────────────────────
async function auditToolExecution(
  workspaceId: string,
  userId: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<void> {
  try {
    const db = getPrismaClient(workspaceId);
    await db.activity.create({
      data: {
        action: "NOVA_TOOL_EXECUTION",
        entityType: "AI_TOOL",
        entityId: toolName,
        workspaceId,
        userId,
        metadata: {
          tool: toolName,
          params: JSON.parse(JSON.stringify(params)),
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (e) {
    logger.error("[AuditLog] Failed to log tool execution:", e);
  }
}

import { NOVA_SYSTEM_PROMPT as CORE_NOVA_SYSTEM_PROMPT } from "@/lib/nova/config";
import { AGENT_REGISTRY } from "@/lib/nova/config";
import { SERVICE_REGISTRY } from "@/lib/nova/config";

const NOVA_SYSTEM_PROMPT = `${CORE_NOVA_SYSTEM_PROMPT}

[OPERATING GUIDELINES]
1. PRIORITIZE ACTION: Use tools immediately when a user request can be fulfilled by them.
2. EXPLAINABILITY: Always explain *why* you are taking an action. Cite where you found information.
3. TRANSPARENCY: If a tool execution fails or needs more info, be clear about it.
4. PROACTIVITY: If a project seems stalled or tasks are overdue, suggest 'get_suggestions'.
5. FORMATTING: Use bold for entity names. Use Mermaid.js syntax for diagrams (e.g. flowcharts, gantt charts) when explaining complex dependencies or workflows.
6. REAL-TIME: You can broadcast updates via Ably for immediate UI feedback.

Available Specialized Agents: ${AGENT_REGISTRY.map(a => `${a.name} (${a.purpose})`).join(", ")}.

Available Infrastructure Services: ${SERVICE_REGISTRY.map(s => `${s.provider} (${s.category})`).join(", ")}.

You are professional, data-driven, and proactive.`;

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // ─── Rate Limit Check ────────────────────────────────────────────
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

        // ─── Decision Framework: Evaluate Risk & Intent ─────────────────
        const decision = DecisionFramework.evaluate(prompt);
        if (decision.requiresApproval) {
            return NextResponse.json({
                error: `**ACTION BLOCKED — CONFIRMATION REQUIRED**\n\nYour request has been classified as **HIGH RISK** (${decision.intent} action).\nPlease confirm explicitly if you want to proceed.`,
                requiresApproval: true,
                riskLevel: decision.riskLevel,
                intent: decision.intent,
            }, { status: 403 });
        }

        // Check limits if workspaceId is provided
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

            // Integrate prioritized context aggregator
            const activeContext = await ContextSystem.getActiveContext({
                workspaceId,
                userId: user.id,
                projectId: projectId || undefined,
            });

            // Fetch memory layers (Mem0 + Upstash + Prisma)
            const longTermMemories = await MemorySystem.getLongTerm(user.id, workspaceId);
            const shortTermHistories = await MemorySystem.getShortTerm(conversationId || "global");

            const sanitizedMemories: Record<string, string> = {};
            for (const [key, val] of Object.entries(longTermMemories)) {
              sanitizedMemories[key] = sanitizeUserContent(val);
            }

            const formattedMemories = Object.entries(sanitizedMemories)
                .map(([key, val]) => `- ${key}: ${val}`)
                .join("\n");

            const historySlice = shortTermHistories.slice(-MAX_HISTORY_ENTRIES);
            const formattedHistory = historySlice
                .map((h: { role: string; content: string }) => `- [${h.role.toUpperCase()}]: ${sanitizeUserContent(h.content).substring(0, 100)}`)
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
                // Save User Message to local DB
                await db.aiMessage.create({
                    data: { conversationId, role: "user", content: prompt }
                });
                // Save to short-term cache
                await MemorySystem.saveShortTerm(conversationId, { role: "user", content: prompt });
            }
        }

        const systemPrompt = `${NOVA_SYSTEM_PROMPT}\n${workspaceContext}\nYou are Nova, an AI Operator. Execute tools when asked. Summarize actions in bold. Use markdown tables for data when appropriate.\n\n[DECISION FRAMEWORK EVALUATION]\n- Intent: ${decision.intent}\n- Risk Level: ${decision.riskLevel}\n- Strategy: ${decision.strategy}\n- Priority: Action/Outcome first, then Explanation last. Use concise bold lists.`;
        const shouldStream = !imageUrl;

        // 1. Check Limits & Increment Usage
        try {
            const { checkLimitExceeded, incrementNovaUsage } = await import("@/lib/usage-tracking");
            
            // Check if limit is exceeded
            const isExceeded = await checkLimitExceeded(workspaceId, "nova");
            if (isExceeded) {
                return new Response(JSON.stringify({ error: "Nova limit exceeded for this plan. Please upgrade to continue." }), { 
                    status: 403,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // Increment usage
            await incrementNovaUsage(workspaceId, user.id);
        } catch (e) {
            logger.error("Usage tracking error:", e);
        }

        const tools = buildTools({ user, workspaceId, projectId });

        if (shouldStream) {
            // Use direct OpenAI provider pointed at OpenRouter for maximum stability
            const openrouterProvider = createOpenAI({
                apiKey: process.env.OPENROUTER,
                baseURL: "https://openrouter.ai/api/v1",
                headers: {
                    "HTTP-Referer": "https://thetapm.site",
                    "X-Title": "Nova AI",
                }
            });

            const result = await streamText({
                model: openrouterProvider("openai/gpt-4o-mini"),
                system: systemPrompt,
                prompt: prompt,
                tools,
                onError: ({ error }: { error: unknown }) => {
                    logger.error("[Nova] Stream error:", error instanceof Error ? error.message : String(error));
                },
                onFinish: async ({ text }: { text: string }) => {
                    if (text && conversationId) {
                        const db = getPrismaClient(workspaceId);
                        await db.aiMessage.create({ data: { conversationId, role: "assistant", content: text } });
                    }
                },
            });
            return result.toTextStreamResponse();
        } else {
            const text = await NovaOrchestrator.execute(prompt, { systemPrompt, imageUrl });
            const optimized = PhilosophyEngine.optimizeResponse(text, decision.intent);
            return new Response(optimized);
        }
    } catch (error: any) {
        logger.error("Nova AI error:", error);
        return new Response(`Nova Error: ${error.message}`, { status: 200 });
    }
}
