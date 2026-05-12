import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max allowed for Pro, ignored for Hobby but good for documentation

import { getCurrentUser } from "@/lib/auth";
import { generateWithOpenAI, generateWithVision } from "@/lib/openai";
import { streamText, tool, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const NOVA_SYSTEM_PROMPT = `You are Nova, a helpful and efficient AI assistant for project management on thetapm.site. 
Your name symbolizes new beginnings and brilliant intelligence. Keep responses concise, actionable, and professional. 
Focus on helping users get work done faster. Be friendly but direct.`;

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { prompt, imageUrl, workspaceId, conversationId, projectId } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Nova needs a prompt to help you" }, { status: 400 });
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
            const { getPrismaClient } = await import("@/lib/prisma");
            const db = getPrismaClient(workspaceId);
            
            // Only fetch essentials to reduce latency
            const [projects, tasks, memories] = await Promise.all([
                db.project.findMany({ where: { workspaceId }, take: 5, select: { name: true, id: true } }),
                db.task.findMany({ 
                    where: { workspaceId, projectId: projectId || undefined },
                    take: 5, 
                    orderBy: { updatedAt: 'desc' },
                    select: { title: true, status: true } 
                }),
                db.aiMemory.findMany({ where: { userId: user.id }, take: 5, select: { key: true, content: true } })
            ]);

            const focusedProject = projectId ? projects.find((p: any) => p.id === projectId) : null;
            workspaceContext = `
CONTEXT: ${focusedProject ? `[Project: ${focusedProject.name}]` : "[Global]"}
Recent Tasks: ${tasks.map((t: any) => `${t.title} (${t.status})`).join(", ") || "None"}
---`;

            if (conversationId) {
                // Save User Message
                await db.aiMessage.create({
                    data: { conversationId, role: "user", content: prompt }
                });
            }
        }

        const systemPrompt = `${NOVA_SYSTEM_PROMPT}\n${workspaceContext}\nYou are Nova, an AI Operator. Execute tools when asked. Summarize actions in bold.`;
        const shouldStream = !imageUrl;

        // 1. Increment usage
        try {
            const { incrementNovaUsage } = await import("@/lib/usage-tracking");
            await incrementNovaUsage(workspaceId, user.id);
        } catch (e) {}

        const shouldStream = !imageUrl;

        // 1. Increment usage
        try {
            const { incrementNovaUsage } = await import("@/lib/usage-tracking");
            await incrementNovaUsage(workspaceId, user.id);
        } catch (e) {}

        const systemPrompt = `${NOVA_SYSTEM_PROMPT}\n${workspaceContext}\nYou are Nova. Be professional and helpful.`;

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
                onFinish: async ({ text }: any) => {
                    if (text && conversationId) {
                        const { getPrismaClient } = await import("@/lib/prisma");
                        const db = getPrismaClient(workspaceId);
                        await db.aiMessage.create({ data: { conversationId, role: "assistant", content: text } });
                    }
                },
            });
            return result.toTextStreamResponse();
        } else {
            const { generateWithOpenRouter } = await import("@/lib/openrouter");
            const text = await generateWithOpenRouter(prompt, systemPrompt, imageUrl);
            return new Response(text);
        }
    } catch (error: any) {
        console.error("Nova AI error:", error);
        return new Response(`Nova Error: ${error.message}`, { status: 200 });
    }
}
