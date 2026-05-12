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

        let resultText = "";
        let finalProvider = "openai";

        // Define tools for Nova to execute actions as plain objects to fix TS overload issues
        const tools: any = {
            create_task: {
                description: 'Create a new task in the current workspace and project.',
                parameters: z.object({
                    title: z.string().describe('The title of the task'),
                    description: z.string().optional().describe('Detailed description of the task'),
                    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
                    status: z.string().optional(),
                    projectId: z.string().optional().describe('Specific project ID if mentioned, otherwise uses the active project context')
                }),
                execute: async ({ title, description, priority, status, projectId }: any) => {
                    if (!workspaceId) return { error: "No workspace context found." };
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
                            title,
                            description,
                            priority: priority || 'medium',
                            status: status || 'todo',
                            workspaceId,
                            projectId: targetProjectId,
                            userId: user.id,
                        }
                    });

                    await db.activity.create({
                        data: {
                            action: "CREATED",
                            entityType: "TASK",
                            entityId: task.id,
                            workspaceId,
                            userId: user.id,
                            projectId: targetProjectId,
                            metadata: { source: "NOVA_AI", taskTitle: title }
                        }
                    });

                    return { success: true, taskId: task.id, message: `Task "${title}" created successfully.` };
                },
            },
            update_task: {
                description: 'Update an existing task status, priority, or details.',
                parameters: z.object({
                    taskId: z.string().describe('The ID of the task to update'),
                    status: z.string().optional(),
                    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
                    title: z.string().optional()
                }),
                execute: async ({ taskId, status, priority, title }: any) => {
                    if (!workspaceId) return { error: "No workspace context" };
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);

                    const task = await db.task.update({
                        where: { id: taskId },
                        data: {
                            ...(status && { status }),
                            ...(priority && { priority }),
                            ...(title && { title })
                        }
                    });

                    await db.activity.create({
                        data: {
                            action: "UPDATED",
                            entityType: "TASK",
                            entityId: task.id,
                            workspaceId,
                            userId: user.id,
                            projectId: task.projectId,
                            metadata: { source: "NOVA_AI", changes: { status, priority, title } }
                        }
                    });

                    return { success: true, message: `Task "${task.title}" updated successfully.` };
                },
            },
            list_members: {
                description: 'List all team members in the workspace to help with assignment.',
                parameters: z.object({}),
                execute: async () => {
                    if (!workspaceId) return { error: "No workspace context" };
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);

                    const members = await db.workspaceMember.findMany({
                        where: { workspaceId },
                        include: { user: true }
                    });

                    return {
                        members: members.map(m => ({
                            id: m.userId,
                            name: m.user.name,
                            email: m.user.email
                        }))
                    };
                },
            },
            delete_task: {
                description: 'Delete a task from the workspace.',
                parameters: z.object({
                    taskId: z.string().describe('The ID of the task to delete'),
                }),
                execute: async ({ taskId }: any) => {
                    if (!workspaceId) return { error: "No workspace context" };
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);

                    const task = await db.task.findUnique({ where: { id: taskId } });
                    if (!task) return { error: "Task not found" };

                    await db.task.delete({ where: { id: taskId } });

                    await db.activity.create({
                        data: {
                            action: "DELETED",
                            entityType: "TASK",
                            entityId: taskId,
                            workspaceId,
                            userId: user.id,
                            projectId: task.projectId,
                            metadata: { source: "NOVA_AI", taskTitle: task.title }
                        }
                    });

                    return { success: true, message: `Task "${task.title}" deleted successfully.` };
                },
            },
        };

        try {
            // Prioritize OpenRouter for stability, but try streaming first
            finalProvider = "openrouter";
            const { openrouter } = await import("@/lib/openrouter");

            if (shouldStream) {
                try {
                    const result = await streamText({
                        model: openrouter("openai/gpt-4o-mini"),
                        system: systemPromptWithContext + `
You are Nova, an AI Operator for Theta. 
When you execute a tool, always summarize what you did in a professional, actionable way.
If you create a task, mention its title. If you update a task, mention the change.
Use bold text for task titles and statuses.`,
                        prompt: prompt,
                        tools,
                        maxSteps: 5,
                        onFinish: async ({ text }) => {
                            if (text) {
                                handleAiFinish(text, "openrouter").catch(e => 
                                    console.error("Background save failed:", e)
                                );
                            }
                        },
                    });
                    return result.toTextStreamResponse();
                } catch (streamError: any) {
                    console.warn("OpenRouter streaming failed, falling back to non-streaming...", streamError.message);
                    const { generateWithOpenRouter } = await import("@/lib/openrouter");
                    resultText = await generateWithOpenRouter(prompt, systemPromptWithContext, imageUrl);
                }
            } else {
                const { generateWithOpenRouter } = await import("@/lib/openrouter");
                resultText = await generateWithOpenRouter(prompt, systemPromptWithContext, imageUrl);
            }
        } catch (error: any) {
            console.error("OpenRouter failed, trying Cohere...", error);
            finalProvider = "cohere";
            try {
                const { generateWithCohere } = await import("@/lib/cohere");
                resultText = await generateWithCohere(prompt, systemPromptWithContext);
            } catch (cohereError: any) {
                console.error("Final fallback failed:", cohereError);
                resultText = "Nova Neural Link is temporarily congested. Please try again in 30 seconds.";
            }
        }

        // Final check to ensure we don't return an empty string
        if (!resultText) {
            resultText = "Nova is momentarily silent. Please try asking your question again.";
        }

        // FIRE-AND-FORGET background tasks
        handleAiFinish(resultText, finalProvider).catch(e => {
            console.error("Background handleAiFinish failed:", e);
        });

        async function handleAiFinish(aiText: string, aiProvider: string) {
            if (!user) return;
            if (workspaceId) {
                try {
                    const { incrementNovaUsage } = await import("@/lib/usage-tracking");
                    await incrementNovaUsage(workspaceId, user.id);

                    if (conversationId) {
                        const { getPrismaClient } = await import("@/lib/prisma");
                        const db = getPrismaClient(workspaceId);
                        await db.aiMessage.create({
                            data: {
                                conversationId,
                                role: "assistant",
                                content: aiText,
                                metadata: { provider: aiProvider }
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error in handleAiFinish background task:", e);
                }
            }
        }

        return new Response(resultText, {
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    } catch (error: any) {
        console.error("Nova AI error:", error);
        
        // Return the error message directly so the user can see it in the chat bubble
        const errorMessage = `Nova Error: ${error.message || "Unknown error"}. 
        Details: ${error.stack?.split('\n')[0] || "No stack trace"}.
        Please report this to the support team.`;
        
        return new Response(errorMessage, {
            status: 200, // Return 200 so the client shows it in the bubble
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    }
}
