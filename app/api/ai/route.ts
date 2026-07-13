import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProjectResource } from "@/lib/project-permissions";

import { DecisionFramework } from "@/lib/nova/decision-framework";
import { detectPromptInjection } from "@/lib/nova/security-guard";
import { sanitizeUserInput } from "@/lib/nova/output-validator";
import { logger } from "@/lib/logger";
import { routeRequest } from "@/lib/nova/intent-router";
import { telemetry } from "@/lib/nova/telemetry";

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

import { NOVA_SYSTEM_PROMPT as CORE_NOVA_SYSTEM_PROMPT } from "@/lib/nova/config";

const NOVA_SYSTEM_PROMPT = `${CORE_NOVA_SYSTEM_PROMPT}

[OPERATING GUIDELINES]
1. RESPOND CONVERSATIONALLY: When a user asks a question or makes a statement (not a command), respond naturally without calling tools. Only use tools when the user explicitly requests an action (e.g., "create a task", "list my tasks", "delete project X").
2. EXPLAINABILITY: Always explain *why* you are taking an action. Cite where you found information.
3. TRANSPARENCY: If a tool execution fails or needs more info, be clear about it.
4. PROACTIVITY: If a project seems stalled or tasks are overdue, suggest next steps — but only when it meaningfully advances the user's goal.
5. FORMATTING: Use bold for entity names. Use Mermaid.js syntax for diagrams (e.g. flowcharts, gantt charts) when explaining complex dependencies or workflows. When listing data, format it as a markdown table.
6. REAL-TIME: You can broadcast updates via Ably for immediate UI feedback.
7. READ TOOLS: Use list_tasks, list_projects, list_workspaces, list_members when the user explicitly asks to see or list items. For questions about these things, answer conversationally instead of calling tools.

BEHAVIORAL RULES:
- Talk like a smart teammate, not a documentation page
- Before asking any question, check what you already know from context
- When suggesting actions, mention what you can do next — not what the user should do
- Never say "I am an AI", "As a language model", or reference any AI provider
- Never reference internal tool names, function names, agent names, or system components
- Format for scannability: bold key terms, use tables for structured data
- For long lists, show top 5 and offer to show more
- Reference the user's actual data by name, not generically
- If only one project exists and the user asks about "my project", use it automatically

IDENTITY:
- You are Nova, the AI operating system of Theta
- Never say "I'm an AI", "I'm a language model", "I'm ChatGPT", or reference any AI provider
- When asked "what are you?" respond: "I'm Nova — your workspace's AI project manager"
- Your knowledge comes from the user's workspace, not the internet
- You are not a general-purpose chatbot — you are deeply integrated into their project management workflow

You are professional, data-driven, and helpful. Respond naturally to questions and use tools only when explicitly requested.`;

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

        const { prompt, workspaceId: wsId, conversationId, projectId, context: pageContext } = await req.json();
        workspaceId = wsId || "";

        if (!prompt) {
            return NextResponse.json({ error: "Nova needs a prompt to help you" }, { status: 400 });
        }

        // TENANT ISOLATION: Verify user is an active member of the claimed workspace
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

        // Sanitize user prompt and detect prompt injection
        const sanitizedPrompt = sanitizeUserInput(prompt);
        if (detectPromptInjection(prompt)) {
            logger.warn(`[Nova] Prompt injection blocked for user ${user.id}`);
            return NextResponse.json({ error: "Your request was blocked by security filters. Please rephrase." }, { status: 400 });
        }

        // Verify project access if projectId is provided
        if (workspaceId && projectId) {
            const hasAccess = await canAccessProjectResource(user.id, workspaceId, projectId);
            if (!hasAccess) {
                return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
            }
        }

        decision = DecisionFramework.evaluate(sanitizedPrompt);
        if (decision.requiresApproval) {
            return NextResponse.json({
                error: `**ACTION BLOCKED — CONFIRMATION REQUIRED**\n\nYour request has been classified as **HIGH RISK** (${decision.intent} action).\nPlease confirm explicitly if you want to proceed.`,
                requiresApproval: true,
                riskLevel: decision.riskLevel,
                intent: decision.intent,
            }, { status: 403 });
        }

        route = routeRequest(sanitizedPrompt, decision.intent, decision.strategy);

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

        // LangGraph Agent — primary orchestration for all routes
        const { runNovaAgent } = await import("@/lib/langraph");
        const agentResult = await runNovaAgent(sanitizedPrompt, {
            userId: user.id,
            workspaceId,
            projectId: projectId || undefined,
            conversationId: conversationId || undefined,
            pageContext: pageContext || undefined,
            systemPrompt: NOVA_SYSTEM_PROMPT,
            intent: decision.intent,
            routeDecision: route,
        });
        logger.info("[LangGraph] Agent handled request", {
            provider: agentResult.provider,
            model: agentResult.model,
            durationMs: agentResult.durationMs,
            route: agentResult.route,
        });

        // Track Nova usage for billing/limits
        if (workspaceId && user) {
            const { incrementNovaUsage } = await import("@/lib/usage-tracking");
            incrementNovaUsage(workspaceId, user.id).catch((err: any) =>
                logger.warn("[Nova] Failed to track usage", err)
            );
        }

        return new Response(agentResult.response, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    } catch (error: any) {
        const isAbort = error.name === 'AbortError' || error.message?.includes('abort') || error.message?.includes('AbortError');
        if (isAbort) {
            logger.warn("[Nova] Request was aborted:", error.message);
            telemetry.trackRequest({
                userId: user?.id || "unknown",
                workspaceId: workspaceId || "unknown",
                path: (route?.path === "CONVERSATION" ? "CHAT" : route?.path) || "ACTION",
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
            path: (route?.path === "CONVERSATION" ? "CHAT" : route?.path) || "ACTION",
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
