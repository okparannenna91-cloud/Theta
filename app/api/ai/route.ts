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

        const tools: any = {
            create_task: {
                description: 'Create a new task.',
                parameters: z.object({
                    title: z.string().describe('Task title'),
                    description: z.string().optional().describe('Task description'),
                    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
                    projectId: z.string().optional().describe('Project ID if known')
                }),
                execute: async ({ title, description, priority, projectId: targetProjectId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    let pId = targetProjectId || projectId;
                    if (!pId) {
                        const firstProject = await db.project.findFirst({ where: { workspaceId } });
                        if (!firstProject) return { error: "No projects found. Please create a project first." };
                        pId = firstProject.id;
                    }
                    const task = await db.task.create({
                        data: { 
                            title, description, 
                            priority: priority || 'medium', 
                            status: 'todo', 
                            workspaceId, 
                            projectId: pId, 
                            userId: user.id 
                        }
                    });
                    await db.activity.create({
                        data: { 
                            action: "CREATED", entityType: "TASK", entityId: task.id, 
                            workspaceId, userId: user.id, projectId: pId,
                            metadata: { source: "NOVA_AI", title } 
                        }
                    });
                    return { success: true, message: `Created task **${title}**` };
                }
            },
            update_task: {
                description: 'Update an existing task status, priority or title.',
                parameters: z.object({
                    taskId: z.string().describe('The ID of the task to update'),
                    status: z.string().optional(),
                    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
                    title: z.string().optional()
                }),
                execute: async ({ taskId, status, priority, title }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const task = await db.task.update({
                        where: { id: taskId },
                        data: { ...(status && { status }), ...(priority && { priority }), ...(title && { title }) }
                    });
                    await db.activity.create({
                        data: { 
                            action: "UPDATED", entityType: "TASK", entityId: task.id, 
                            workspaceId, userId: user.id, projectId: task.projectId,
                            metadata: { source: "NOVA_AI", updates: { status, priority, title } } 
                        }
                    });
                    return { success: true, message: `Updated task **${task.title}**` };
                }
            },
            delete_task: {
                description: 'Delete a task.',
                parameters: z.object({ taskId: z.string() }),
                execute: async ({ taskId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const task = await db.task.delete({ where: { id: taskId } });
                    await db.activity.create({
                        data: { 
                            action: "DELETED", entityType: "TASK", entityId: taskId, 
                            workspaceId, userId: user.id,
                            metadata: { source: "NOVA_AI", title: task.title } 
                        }
                    });
                    return { success: true, message: `Deleted task **${task.title}**` };
                }
            },
            create_project: {
                description: 'Create a new project.',
                parameters: z.object({
                    name: z.string(),
                    description: z.string().optional()
                }),
                execute: async ({ name, description }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const project = await db.project.create({
                        data: { name, description, workspaceId, userId: user.id }
                    });
                    await db.activity.create({
                        data: { 
                            action: "CREATED", entityType: "PROJECT", entityId: project.id, 
                            workspaceId, userId: user.id, projectId: project.id,
                            metadata: { source: "NOVA_AI", name } 
                        }
                    });
                    return { success: true, message: `Created project **${name}**` };
                }
            },
            list_members: {
                description: 'List team members in the workspace.',
                parameters: z.object({}),
                execute: async () => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const members = await db.workspaceMember.findMany({
                        where: { workspaceId },
                        include: { user: true }
                    });
                    return { members: members.map(m => ({ id: m.userId, name: m.user.name })) };
                }
            },
            breakdown_task: {
                description: 'Break down a complex task into multiple subtasks.',
                parameters: z.object({
                    taskId: z.string().describe('The ID of the parent task'),
                    subtasks: z.array(z.string()).describe('List of subtask titles')
                }),
                execute: async ({ taskId, subtasks: subtaskTitles }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const createdSubtasks = await Promise.all(
                        subtaskTitles.map((title: string, index: number) => 
                            db.subtask.create({
                                data: { title, taskId, order: index }
                            })
                        )
                    );

                    await db.activity.create({
                        data: { 
                            action: "UPDATED", entityType: "TASK", entityId: taskId, 
                            workspaceId, userId: user.id,
                            metadata: { source: "NOVA_AI", addedSubtasks: subtaskTitles.length } 
                        }
                    });

                    return { success: true, message: `Broke down task into **${createdSubtasks.length}** subtasks.` };
                }
            },
            create_automation: {
                description: 'Create a new automated workflow in the workspace.',
                parameters: z.object({
                    name: z.string().describe('Descriptive name for the automation'),
                    trigger: z.string().describe('The event that triggers this (e.g. TASK_COMPLETED, MEMBER_ADDED)'),
                    action: z.string().describe('The action to take (e.g. SEND_EMAIL, NOTIFY_CHANNEL, UPDATE_STATUS)'),
                    config: z.record(z.any()).describe('Configuration for the automation')
                }),
                execute: async ({ name, trigger, action, config }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const automation = await db.automation.create({
                        data: {
                            name, trigger, action, config, workspaceId, active: true
                        }
                    });

                    return { success: true, message: `Automation "**${name}**" has been created and activated.` };
                }
            },
            search_workspace: {
                description: 'Search for tasks, documents, and comments across the entire workspace.',
                parameters: z.object({
                    query: z.string().describe('The search query or keyword')
                }),
                execute: async ({ query }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const [tasks, docs] = await Promise.all([
                        db.task.findMany({
                            where: { workspaceId, OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] },
                            take: 5
                        }),
                        db.document.findMany({
                            where: { workspaceId, OR: [{ title: { contains: query, mode: 'insensitive' } }, { content: { contains: query, mode: 'insensitive' } }] },
                            take: 5
                        })
                    ]);

                    return { 
                        results: [
                            ...tasks.map(t => ({ type: 'TASK', title: t.title, id: t.id })),
                            ...docs.map(d => ({ type: 'DOCUMENT', title: d.title, id: d.id }))
                        ] 
                    };
                }
            },
            create_document: {
                description: 'Create a new document in the workspace knowledge base.',
                parameters: z.object({
                    title: z.string().describe('The title of the document'),
                    content: z.string().describe('The markdown content of the document')
                }),
                execute: async ({ title, content }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const doc = await db.document.create({
                        data: { title, content, workspaceId }
                    });

                    return { success: true, message: `Document "**${title}**" created.`, id: doc.id };
                }
            },
            read_document: {
                description: 'Read the content of a document to gain knowledge.',
                parameters: z.object({
                    id: z.string().describe('The ID of the document to read')
                }),
                execute: async ({ id }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const doc = await db.document.findUnique({
                        where: { id }
                    });

                    return { title: doc?.title, content: doc?.content };
                }
            },
            remember_preference: {
                description: 'Save a user preference or piece of information to memory.',
                parameters: z.object({
                    key: z.string().describe('Short key like "writing_style" or "preferred_priority"'),
                    content: z.string().describe('The information to remember')
                }),
                execute: async ({ key, content }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    await db.aiMemory.upsert({
                        where: { userId_key: { userId: user.id, key } },
                        update: { content },
                        create: { userId: user.id, key, content, workspaceId }
                    });
                    return { success: true, message: `I've memorized your preference for **${key}**.` };
                }
            }
        };

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
                maxSteps: 10,
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
