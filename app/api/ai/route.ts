import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateWithOpenAI, generateWithVision } from "@/lib/openai";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

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
                await enforcePlanLimit(workspaceId, "boots", currentUsage);
            } catch (error: any) {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }
        }

        let workspaceContext = "";
        if (workspaceId) {
            const { getPrismaClient } = await import("@/lib/prisma");
            const db = getPrismaClient(workspaceId);
            
            const [projects, tasks, teams, integrations, memories, recentComments] = await Promise.all([
                db.project.findMany({
                    where: { workspaceId },
                    take: 10,
                    select: { name: true, id: true }
                }),
                db.task.findMany({
                    where: { 
                        workspaceId,
                        projectId: projectId || undefined 
                    },
                    take: 10,
                    orderBy: { updatedAt: 'desc' },
                    select: { title: true, status: true, priority: true, description: true }
                }),
                db.team.findMany({
                    where: { workspaceId },
                    take: 3,
                    select: { name: true }
                }),
                db.integration.findMany({
                    where: { workspaceId },
                    take: 5,
                    select: { provider: true }
                }),
                db.aiMemory.findMany({
                    where: { userId: user.id },
                    select: { key: true, content: true }
                }),
                db.comment.findMany({
                    where: { 
                        task: { workspaceId }
                    },
                    take: 3,
                    orderBy: { createdAt: 'desc' },
                    select: { content: true, user: { select: { name: true } } }
                })
            ]);

            const focusedProject = projectId ? projects.find((p: any) => p.id === projectId) : null;

            workspaceContext = `
CURRENT WORKSPACE CONTEXT:
${focusedProject ? `[FOCUSED ON PROJECT: ${focusedProject.name}]` : "[GLOBAL WORKSPACE VIEW]"}
Projects: ${projects.length > 0 ? projects.map((p: any) => p.name).join(", ") : "None yet"}
Recent Tasks: ${tasks.length > 0 ? tasks.map((t: any) => `${t.title} [${t.status}, ${t.priority}]`).join(", ") : "None yet"}
Recent Team Activity: ${recentComments.length > 0 ? recentComments.map((c: any) => `${c.user?.name}: ${c.content.substring(0, 50)}...`).join(" | ") : "No recent activity"}
Teams: ${teams.length > 0 ? teams.map((t: any) => t.name).join(", ") : "None yet"}
Connected Integrations: ${integrations.length > 0 ? integrations.map((i: any) => i.provider).join(", ") : "None connected"}
---
`;

            if (memories.length > 0) {
                workspaceContext += "\nPERSONALIZED USER PREFERENCES:\n";
                memories.forEach((m: any) => {
                    workspaceContext += `- ${m.key}: ${m.content}\n`;
                });
                workspaceContext += "---\n";
            }

            // Fetch conversation history if ID is provided
            if (conversationId) {
                const history = await db.aiMessage.findMany({
                    where: { conversationId },
                    orderBy: { createdAt: "desc" },
                    take: 10
                });

                if (history.length > 0) {
                    workspaceContext += "\nCONVERSATION HISTORY:\n";
                    // Reverse because we took desc
                    history.reverse().forEach((m: any) => {
                        workspaceContext += `${m.role.toUpperCase()}: ${m.content}\n`;
                    });
                    workspaceContext += "---\n";
                }

                // Save User Message
                await db.aiMessage.create({
                    data: {
                        conversationId,
                        role: "user",
                        content: prompt,
                        metadata: imageUrl ? { imageUrl } : undefined
                    }
                });
            }
        }

        const systemPromptWithContext = `${NOVA_SYSTEM_PROMPT}${workspaceContext}`;

        // Check if we should stream
        const shouldStream = !imageUrl;

        if (shouldStream) {
            try {
                const result = await streamText({
                    model: openaiProvider("gpt-4o-mini"),
                    system: systemPromptWithContext,
                    prompt: prompt,
                    async onFinish({ text }) {
                        if (workspaceId) {
                            const { incrementNovaUsage } = await import("@/lib/usage-tracking");
                            await incrementNovaUsage(workspaceId, user.id);

                            if (conversationId) {
                                const { getPrismaClient } = await import("@/lib/prisma");
                                const db = getPrismaClient(workspaceId);
                                await db.aiMessage.create({
                                    data: {
                                        conversationId,
                                        role: "assistant",
                                        content: text
                                    }
                                });
                                await db.aiConversation.update({
                                    where: { id: conversationId },
                                    data: { lastMessageAt: new Date() }
                                });
                            }
                        }
                    },
                });

                return result.toTextStreamResponse();
            } catch (error: any) {
                console.warn("Streaming failed, falling back to non-streaming...", error);
            }
        }

        let text = "";
        try {
            // Priority 1: OpenAI (Non-streaming fallback or Vision)
            try {
                if (imageUrl) {
                    text = await generateWithVision(prompt, imageUrl, systemPromptWithContext) || "";
                } else {
                    text = await generateWithOpenAI(prompt, systemPromptWithContext) || "";
                }
            } catch (openaiError: any) {
                // Check if it's a rate limit error (status 429)
                if (openaiError.status === 429) {
                    console.warn("OpenAI Rate limited, attempting Cohere fallback...");
                    // Try Cohere as fallback for rate limits
                    if (imageUrl) throw openaiError; // Vision can't easily fallback to Cohere

                    const { generateWithCohere } = await import("@/lib/cohere");
                    text = await generateWithCohere(prompt, systemPromptWithContext);
                } else {
                    throw openaiError; // Re-throw other errors to hit standard catch
                }
            }
        } catch (error: any) {
            console.warn("Primary AI providers failed, attempting general fallback...", error);

            if (imageUrl) {
                throw error; // Vision must stay OpenAI for now
            }

            try {
                // Last ditch attempt with Cohere if not already tried for 429 above
                if (!text) {
                    const { generateWithCohere } = await import("@/lib/cohere");
                    text = await generateWithCohere(prompt, systemPromptWithContext);
                }
            } catch (cohereError: any) {
                console.error("General fallback also failed:", cohereError);
                throw error; // Throw previous provider's error
            }
        }

        // Increment usage if workspaceId is provided
        if (workspaceId) {
            const { incrementNovaUsage } = await import("@/lib/usage-tracking");
            await incrementNovaUsage(workspaceId, user.id);

            // Save Assistant Message
            if (conversationId) {
                const { getPrismaClient } = await import("@/lib/prisma");
                const db = getPrismaClient(workspaceId);
                await db.aiMessage.create({
                    data: {
                        conversationId,
                        role: "assistant",
                        content: text
                    }
                });
                
                await db.aiConversation.update({
                    where: { id: conversationId },
                    data: { lastMessageAt: new Date() }
                });
            }
        }

        return NextResponse.json({ text });
    } catch (error: any) {
        if (error.status === 429) {
            return NextResponse.json(
                { error: "Nova is taking a short break (Rate Limit reached). Please wait about 30 seconds and try again." },
                { status: 429 }
            );
        }

        console.error("Nova AI error:", error);
        return NextResponse.json(
            { error: error.message || "Nova encountered an error. Please try again." },
            { status: 500 }
        );
    }
}
