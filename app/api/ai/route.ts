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

        // 1. ALWAYS increment usage at the start of a valid request
        try {
            const { incrementNovaUsage } = await import("@/lib/usage-tracking");
            await incrementNovaUsage(workspaceId, user.id);
        } catch (e) {
            console.error("Failed to increment usage:", e);
        }

        // Define tools for Nova to execute actions
        const tools: any = {
            create_task: {
                description: 'Create a new task in the current workspace and project.',
                parameters: z.object({
                    title: z.string().describe('The title of the task'),
                    description: z.string().optional().describe('Detailed description of the task'),
                    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
                    status: z.string().optional(),
                    projectId: z.string().optional()
                }),
                execute: async ({ title, description, priority, status, projectId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    let targetProjectId = projectId;
                    if (!targetProjectId) {
                        const firstProject = await db.project.findFirst({ where: { workspaceId } });
                        if (!firstProject) return { error: "No projects found" };
                        targetProjectId = firstProject.id;
                    }
                    const task = await db.task.create({
                        data: {
                            title, description, 
                            priority: priority || 'medium',
                            status: status || 'todo',
                            workspaceId, projectId: targetProjectId, userId: user.id,
                        }
                    });
                    await db.activity.create({
                        data: {
                            action: "CREATED", entityType: "TASK", entityId: task.id,
                            workspaceId, userId: user.id, projectId: targetProjectId,
                            metadata: { source: "NOVA_AI", taskTitle: title }
                        }
                    });
                    return { success: true, message: `Task "${title}" created.` };
                },
            },
            update_task: {
                description: 'Update an existing task.',
                parameters: z.object({
                    taskId: z.string(),
                    status: z.string().optional(),
                    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
                }),
                execute: async ({ taskId, status, priority }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const task = await db.task.update({
                        where: { id: taskId },
                        data: { ...(status && { status }), ...(priority && { priority }) }
                    });
                    return { success: true, message: `Task "${task.title}" updated.` };
                },
            },
            list_members: {
                description: 'List team members.',
                parameters: z.object({}),
                execute: async () => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const members = await db.workspaceMember.findMany({
                        where: { workspaceId },
                        include: { user: true }
                    });
                    return { members: members.map(m => ({ id: m.userId, name: m.user.name })) };
                },
            }
        };

        const systemPrompt = systemPromptWithContext + `
You are Nova, an AI Operator for Theta. 
When you execute a tool, summarize it professionally. Use bold for task titles.`;

        if (shouldStream) {
            const { openrouter } = await import("@/lib/openrouter");
            const result = await streamText({
                model: openrouter("openai/gpt-4o-mini"),
                system: systemPrompt,
                prompt: prompt,
                tools,
                maxSteps: 5,
                onFinish: async ({ text }: any) => {
                    if (text && conversationId) {
                        const { getPrismaClient } = await import("@/lib/prisma");
                        const db = getPrismaClient(workspaceId);
                        await db.aiMessage.create({
                            data: { conversationId, role: "assistant", content: text }
                        });
                    }
                },
            } as any);
            return result.toTextStreamResponse();
        } else {
            const { generateWithOpenRouter } = await import("@/lib/openrouter");
            const text = await generateWithOpenRouter(prompt, systemPrompt, imageUrl);
            if (conversationId) {
                const { getPrismaClient } = await import("@/lib/prisma");
                const db = getPrismaClient(workspaceId);
                await db.aiMessage.create({
                    data: { conversationId, role: "assistant", content: text }
                });
            }
            return new Response(text);
        }
    } catch (error: any) {
        console.error("Nova AI error:", error);
        return new Response(`Nova Error: ${error.message}`, { status: 200 });
    }
}
