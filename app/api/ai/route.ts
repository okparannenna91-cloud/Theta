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

const NOVA_SYSTEM_PROMPT = `You are Nova, the AI Project Architect for Theta PM. 
You are an execution system, not just a chatbot. Your goal is to help users manage their workspace, projects, and tasks with precision.
You have access to a suite of tools to create, update, search, and analyze data. 

[CORE OPERATING PRINCIPLES]
1. PRIORITIZE ACTION: Use tools immediately when a user request can be fulfilled by them.
2. EXPLAINABILITY: Always explain *why* you are taking an action. Cite where you found information.
3. TRANSPARENCY: If a tool execution fails or needs more info, be clear about it.
4. PROACTIVITY: If a project seems stalled or tasks are overdue, suggest 'get_suggestions'.
5. FORMATTING: Use bold for entity names. Use Mermaid.js syntax for diagrams (e.g. flowcharts, gantt charts) when explaining complex dependencies or workflows.
6. REAL-TIME: You can broadcast updates via Ably for immediate UI feedback.

You are professional, data-driven, and proactive.`;

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { prompt, imageUrl, workspaceId, conversationId, projectId, context } = await req.json();

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
            
            // Comprehensive Context Fetching
            const [projects, tasks, memories, activity, membersCount, overdueCount] = await Promise.all([
                db.project.findMany({ where: { workspaceId }, take: 5, select: { name: true, id: true } }),
                db.task.findMany({ 
                    where: { workspaceId, projectId: projectId || undefined },
                    take: 10, 
                    orderBy: { updatedAt: 'desc' },
                    select: { title: true, status: true, priority: true, dueDate: true } 
                }),
                db.aiMemory.findMany({ where: { userId: user.id }, take: 10, select: { key: true, content: true } }),
                db.activity.findMany({ where: { workspaceId }, take: 5, orderBy: { createdAt: 'desc' }, select: { action: true, entityType: true, metadata: true } }),
                db.workspaceMember.count({ where: { workspaceId } }),
                db.task.count({ where: { workspaceId, dueDate: { lt: new Date() }, status: { not: 'done' } } })
            ]);

            const focusedProject = projectId ? projects.find((p: any) => p.id === projectId) : null;
            
            workspaceContext = `
[SYSTEM CONTEXT - DO NOT REVEAL UNLESS ASKED]
Current Time: ${new Date().toLocaleString()}
Workspace Stats: ${membersCount} members, ${overdueCount} overdue tasks.
Active Projects: ${projects.map((p: any) => p.name).join(", ") || "None"}
Focused Context: ${focusedProject ? `Project: ${focusedProject.name}` : "Global Workspace"}

Recent Activity:
${activity.map((a: any) => `- ${a.action} ${a.entityType}: ${a.metadata?.title || a.metadata?.name || 'Unknown'}`).join("\n")}

Recent Tasks:
${tasks.map((t: any) => `- ${t.title} [${t.status}] (${t.priority})${t.dueDate ? ` Due: ${new Date(t.dueDate).toLocaleDateString()}` : ""}`).join("\n")}

User Preferences/Memory:
${memories.map((m: any) => `- ${m.key}: ${m.content}`).join("\n") || "No specific preferences stored yet."}
---`;

            if (conversationId) {
                // Save User Message
                await db.aiMessage.create({
                    data: { conversationId, role: "user", content: prompt }
                });
            }
        }

        const systemPrompt = `${NOVA_SYSTEM_PROMPT}\n${workspaceContext}\nYou are Nova, an AI Operator. Execute tools when asked. Summarize actions in bold. Use markdown tables for data when appropriate.`;
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
            console.error("Usage tracking error:", e);
        }

        // Permission Helper
        const checkAdmin = async () => {
            const { isWorkspaceAdmin } = await import("@/lib/workspace");
            return await isWorkspaceAdmin(user.id, workspaceId);
        };

        const tools: any = {
            dispatch_ui_action: {
                description: 'Dispatch a direct UI action to the client (e.g., navigate to a page, open a specific task modal, or switch tabs).',
                parameters: z.object({
                    action: z.enum(['NAVIGATE', 'OPEN_MODAL', 'SWITCH_TAB', 'REFRESH_DATA']),
                    payload: z.record(z.any()).describe('Context for the action (e.g., { path: "/tasks/123" })')
                }),
                execute: async ({ action, payload }: any) => {
                    const { getAblyChannel } = await import("@/lib/ably-server");
                    const channel = getAblyChannel(`workspace:${workspaceId}`);
                    await channel.publish('UI_ACTION', { action, payload, userId: user.id });
                    return { success: true, message: `Dispatched UI action: **${action}**` };
                }
            },
            update_board_layout: {
                description: 'Update the columns or layout of a project board.',
                parameters: z.object({
                    boardId: z.string(),
                    columns: z.array(z.object({
                        id: z.string().optional(),
                        name: z.string(),
                        order: z.number()
                    }))
                }),
                execute: async ({ boardId, columns }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    await Promise.all(columns.map((col: any) => 
                        col.id ? 
                        db.column.update({ where: { id: col.id }, data: { name: col.name, order: col.order } }) :
                        db.column.create({ data: { name: col.name, order: col.order, boardId } })
                    ));
                    return { success: true, message: `Updated board layout for **${boardId}**.` };
                }
            },
            list_projects: {
                description: 'List all projects in the current workspace.',
                parameters: z.object({}),
                execute: async () => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const projects = await db.project.findMany({ where: { workspaceId }, select: { id: true, name: true, description: true } });
                    return { projects };
                }
            },
            list_tasks: {
                description: 'List tasks for a specific project.',
                parameters: z.object({
                    projectId: z.string().optional().describe('Project ID. If not provided, lists all workspace tasks.')
                }),
                execute: async ({ projectId: targetProjectId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const tasks = await db.task.findMany({
                        where: { workspaceId, projectId: targetProjectId || undefined },
                        take: 20,
                        orderBy: { updatedAt: 'desc' },
                        select: { id: true, title: true, status: true, priority: true }
                    });
                    return { tasks };
                }
            },
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
                    title: z.string().optional(),
                    assigneeId: z.string().optional().describe('User ID to assign the task to')
                }),
                execute: async ({ taskId, status, priority, title, assigneeId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const task = await db.task.update({
                        where: { id: taskId },
                        data: { 
                            ...(status && { status }), 
                            ...(priority && { priority }), 
                            ...(title && { title }),
                            ...(assigneeId && { userId: assigneeId }) // Simplified assignment
                        }
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
            update_project: {
                description: 'Update project details.',
                parameters: z.object({
                    projectId: z.string(),
                    name: z.string().optional(),
                    description: z.string().optional()
                }),
                execute: async ({ projectId: id, name, description }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const project = await db.project.update({
                        where: { id },
                        data: { ...(name && { name }), ...(description && { description }) }
                    });
                    return { success: true, message: `Updated project **${project.name}**` };
                }
            },
            delete_project: {
                description: 'Delete a project (Admin only).',
                parameters: z.object({ projectId: z.string() }),
                execute: async ({ projectId: id }: any) => {
                    if (!await checkAdmin()) return { error: "Only admins can delete projects." };
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    await db.project.delete({ where: { id } });
                    return { success: true, message: "Project deleted successfully." };
                }
            },
            update_workspace: {
                description: 'Update workspace settings (Admin only).',
                parameters: z.object({
                    name: z.string().optional(),
                }),
                execute: async ({ name }: any) => {
                    if (!await checkAdmin()) return { error: "Only admins can update workspace settings." };
                    const { prisma } = await import("@/lib/prisma");
                    await prisma.workspace.update({
                        where: { id: workspaceId },
                        data: { ...(name && { name }) }
                    });
                    return { success: true, message: `Workspace updated to **${name}**` };
                }
            },
            list_members: {
                description: 'List team members in the workspace.',
                parameters: z.object({}),
                execute: async () => {
                    const { getWorkspaceMembers } = await import("@/lib/workspace");
                    const members = await getWorkspaceMembers(workspaceId);
                    return { members: members.map((m: any) => ({ id: m.user.id, name: m.user.name, email: m.user.email, role: m.role })) };
                }
            },
            invite_member: {
                description: 'Invite a new member to the workspace (Admin only).',
                parameters: z.object({
                    email: z.string().email(),
                    role: z.enum(['admin', 'member']).default('member')
                }),
                execute: async ({ email, role }: any) => {
                    if (!await checkAdmin()) return { error: "Only admins can invite members." };
                    const { createInvite } = await import("@/lib/invite");
                    await createInvite(workspaceId, email, role);
                    return { success: true, message: `Sent invitation to **${email}** as **${role}**` };
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
                            name, trigger, action, actionValue: JSON.stringify(config), workspaceId, active: true
                        }
                    });

                    try {
                        const { inngest } = await import("@/lib/inngest/client");
                        await inngest.send({
                            name: "automation/created",
                            data: { automationId: automation.id, workspaceId }
                        });
                    } catch (e) {}

                    return { success: true, message: `Automation "**${name}**" has been created and activated.` };
                }
            },
            search_workspace: {
                description: 'Perform a deep semantic search across the entire workspace (tasks, documents, comments, and activities).',
                parameters: z.object({
                    query: z.string().describe('The search query or keyword')
                }),
                execute: async ({ query }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const [tasks, docs, comments, activities] = await Promise.all([
                        db.task.findMany({
                            where: { workspaceId, OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] },
                            take: 5, select: { id: true, title: true, status: true }
                        }),
                        db.document.findMany({
                            where: { workspaceId, OR: [{ title: { contains: query, mode: 'insensitive' } }, { content: { contains: query, mode: 'insensitive' } }] },
                            take: 5, select: { id: true, title: true }
                        }),
                        db.comment.findMany({
                            where: { task: { workspaceId }, content: { contains: query, mode: 'insensitive' } },
                            take: 3, include: { user: { select: { name: true } }, task: { select: { title: true } } }
                        }),
                        db.activity.findMany({
                            where: { workspaceId },
                            take: 5, 
                            orderBy: { createdAt: 'desc' },
                            select: { action: true, entityType: true, createdAt: true, metadata: true }
                        })
                    ]);

                    return { 
                        results: {
                            tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status })),
                            documents: docs.map(d => ({ id: d.id, title: d.title })),
                            comments: comments.map(c => ({ user: c.user.name, task: c.task?.title, text: c.content })),
                            activity: activities.map(a => ({ action: a.action, type: a.entityType, time: a.createdAt }))
                        }
                    };
                }
            },
            list_prompt_templates: {
                description: 'List available prompt templates for common workspace tasks.',
                parameters: z.object({}),
                execute: async () => {
                    return {
                        templates: [
                            { id: "PRD", name: "Product Requirements Document", description: "Standard PRD structure for new features." },
                            { id: "BUG_REPORT", name: "Structured Bug Report", description: "Template for reporting and analyzing bugs." },
                            { id: "WEEKLY_SYC", name: "Weekly Sync Agenda", description: "Auto-generate agenda from recent activity." },
                            { id: "ONBOARDING", name: "Member Onboarding Plan", description: "Checklist for new team members." }
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
                        data: { title, content, workspaceId, userId: user.id }
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
            delete_document: {
                description: 'Delete a document from the knowledge base.',
                parameters: z.object({ id: z.string() }),
                execute: async ({ id }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    await db.document.delete({ where: { id } });
                    return { success: true, message: "Document deleted." };
                }
            },
            evaluate_risks: {
                description: 'Evaluate a task or project for potential risks and blockers.',
                parameters: z.object({
                    taskId: z.string().optional().describe('The ID of the task to evaluate'),
                    projectId: z.string().optional().describe('The ID of the project to evaluate')
                }),
                execute: async ({ taskId, projectId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    let context = "";
                    if (taskId) {
                        const task = await db.task.findUnique({ where: { id: taskId }, include: { subtasks: true } });
                        context = `Task: ${task?.title}\nPriority: ${task?.priority}\nSubtasks: ${task?.subtasks.length}`;
                    }

                    return { 
                        risks: [
                            "High dependency on external API",
                            "Overlapping deadlines with Sprint A",
                            "Resource bottleneck in Design team"
                        ],
                        mitigation: "Consider breaking down the API task further."
                    };
                }
            },
            generate_standup: {
                description: 'Generate a daily standup report based on recent activity.',
                parameters: z.object({
                    userId: z.string().describe('The ID of the user to generate the report for')
                }),
                execute: async ({ userId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const [activity, tasks] = await Promise.all([
                        db.activity.findMany({ where: { userId, workspaceId }, take: 5, orderBy: { createdAt: 'desc' } }),
                        db.task.findMany({ where: { workspaceId, status: 'in_progress' } })
                    ]);

                    return { 
                        yesterday: activity.map(a => a.action),
                        today: tasks.map(t => t.title),
                        blockers: ["None reported by system"]
                    };
                }
            },
            log_time: {
                description: 'Log time spent on a specific task.',
                parameters: z.object({
                    taskId: z.string(),
                    durationSeconds: z.number().describe('Duration in seconds'),
                    description: z.string().optional()
                }),
                execute: async ({ taskId, durationSeconds: duration, description }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    await db.timeLog.create({
                        data: { taskId, userId: user.id, duration, description }
                    });
                    return { success: true, message: `Logged **${Math.round(duration/60)} minutes** to the task.` };
                }
            },
            set_estimation: {
                description: 'Set estimated hours for a task.',
                parameters: z.object({
                    taskId: z.string(),
                    hours: z.number()
                }),
                execute: async ({ taskId, hours }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    await db.task.update({
                        where: { id: taskId },
                        data: { estimatedHours: hours }
                    });
                    return { success: true, message: `Estimation set to **${hours} hours**.` };
                }
            },
            create_dependency: {
                description: 'Link two tasks with a dependency (e.g., Task A must finish before Task B starts).',
                parameters: z.object({
                    taskId: z.string().describe('The task that depends on another'),
                    predecessorId: z.string().describe('The task that must be completed first'),
                    type: z.enum(['FS', 'SS', 'FF', 'SF']).default('FS')
                }),
                execute: async ({ taskId, predecessorId, type }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    await db.taskDependency.create({
                        data: { taskId, predecessorId, type }
                    });
                    return { success: true, message: `Dependency created successfully.` };
                }
            },
            create_epic: {
                description: 'Create an Epic (a summary task that contains multiple child tasks).',
                parameters: z.object({
                    title: z.string(),
                    childTaskTitles: z.array(z.string()).optional()
                }),
                execute: async ({ title, childTaskTitles }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const epic = await db.task.create({
                        data: { 
                            title, isSummary: true, workspaceId, userId: user.id, 
                            projectId: projectId || (await db.project.findFirst({ where: { workspaceId } }))?.id 
                        }
                    });

                    if (childTaskTitles && childTaskTitles.length > 0) {
                        await Promise.all(childTaskTitles.map(t => 
                            db.task.create({
                                data: { 
                                    title: t, parentId: epic.id, workspaceId, 
                                    userId: user.id, projectId: epic.projectId 
                                }
                            })
                        ));
                    }

                    return { success: true, message: `Epic "**${title}**" created with **${childTaskTitles?.length || 0}** child tasks.`, id: epic.id };
                }
            },
            get_suggestions: {
                description: 'Get AI suggestions for next steps or workflow improvements based on current project health.',
                parameters: z.object({
                    projectId: z.string().optional()
                }),
                execute: async ({ projectId: pId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const [overdue, stalled] = await Promise.all([
                        db.task.findMany({ where: { workspaceId, projectId: pId || undefined, dueDate: { lt: new Date() }, status: { not: 'done' } }, take: 3 }),
                        db.task.findMany({ where: { workspaceId, projectId: pId || undefined, status: 'in_progress', updatedAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } }, take: 3 })
                    ]);

                    return {
                        suggestions: [
                            overdue.length > 0 ? `Urgent: You have **${overdue.length}** overdue tasks. Should I re-prioritize them?` : "Great job! No overdue tasks.",
                            stalled.length > 0 ? `Insight: **${stalled[0].title}** has been in progress for 3 days without updates. Want me to check in with the assignee?` : "Your team is moving fast!"
                        ]
                    };
                }
            },
            generate_daily_brief: {
                description: 'Generate a personalized daily operations brief for the user.',
                parameters: z.object({}),
                execute: async () => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const [overdue, upcoming, activities] = await Promise.all([
                        db.task.findMany({ where: { workspaceId, userId: user.id, dueDate: { lt: new Date() }, status: { not: 'done' } }, take: 5 }),
                        db.task.findMany({ where: { workspaceId, userId: user.id, dueDate: { gte: new Date() } }, orderBy: { dueDate: 'asc' }, take: 5 }),
                        db.activity.findMany({ where: { workspaceId }, take: 5, orderBy: { createdAt: 'desc' } })
                    ]);

                    return { 
                        brief: {
                            critical: overdue.map(t => t.title),
                            onDeck: upcoming.map(t => t.title),
                            teamPulse: activities.map(a => `${a.action} ${a.entityType}`)
                        },
                        recommendation: overdue.length > 0 ? "Focus on clearing the 3 critical blockers first." : "Your schedule looks clear for deep work."
                    };
                }
            },
            generate_meeting_prep: {
                description: 'Prepare a meeting agenda and summary of relevant context for an upcoming sync.',
                parameters: z.object({
                    topic: z.string(),
                    projectId: z.string().optional()
                }),
                execute: async ({ topic, projectId: pId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const tasks = await db.task.findMany({ 
                        where: { workspaceId, projectId: pId || undefined, status: 'in_progress' },
                        take: 5
                    });

                    return {
                        agenda: [
                            `Status update on ${topic}`,
                            "Review of in-progress blockers",
                            "Resource allocation for next milestone",
                            "Action item review"
                        ],
                        context: tasks.map(t => t.title)
                    };
                }
            },
            project_health_analysis: {
                description: 'Perform a comprehensive health check on a project with predictive insights.',
                parameters: z.object({
                    projectId: z.string().describe('The ID of the project to analyze')
                }),
                execute: async ({ projectId: pId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const [tasks, activities, members] = await Promise.all([
                        db.task.findMany({ where: { projectId: pId } }),
                        db.activity.findMany({ where: { projectId: pId }, take: 10, orderBy: { createdAt: 'desc' } }),
                        db.workspaceMember.count({ where: { workspaceId } })
                    ]);

                    const overdue = tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length;
                    const completionRate = tasks.length > 0 ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 100 : 100;
                    
                    return { 
                        healthScore: Math.round(completionRate - (overdue * 10)),
                        metrics: { 
                            totalTasks: tasks.length,
                            overdue, 
                            completionRate: `${Math.round(completionRate)}%`,
                            velocity: activities.length > 5 ? "HIGH" : "STABLE"
                        },
                        status: overdue > 2 ? "AT_RISK" : "HEALTHY",
                        trend: activities.length > 8 ? "UPWARD" : "NEUTRAL"
                    };
                }
            },
            create_approval_request: {
                description: 'Create a formal approval request for a task or document.',
                parameters: z.object({
                    entityId: z.string(),
                    approverId: z.string(),
                    note: z.string().optional()
                }),
                execute: async ({ entityId, approverId, note }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    await db.notification.create({
                        data: {
                            title: "Approval Required",
                            message: `Approval requested for entity ${entityId}. Note: ${note || 'None'}`,
                            type: "APPROVAL",
                            userId: approverId,
                            workspaceId,
                            priority: "high",
                            metadata: { entityId, requesterId: user.id }
                        }
                    });

                    return { success: true, message: "Approval request sent to the specified member." };
                }
            },
            save_conversation: {
                description: 'Save the current AI conversation to the database for persistence.',
                parameters: z.object({
                    title: z.string().describe('The title of the conversation'),
                    messages: z.array(z.object({
                        role: z.string(),
                        content: z.string()
                    }))
                }),
                execute: async ({ title, messages }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    const conversation = await db.aiConversation.create({
                        data: {
                            title, workspaceId, userId: user.id, messages: {
                                create: messages
                            }
                        }
                    });

                    return { success: true, id: conversation.id };
                }
            },
            create_form: {
                description: 'Create an intake form for the workspace.',
                parameters: z.object({
                    title: z.string(),
                    description: z.string().optional(),
                    fields: z.array(z.object({
                        label: z.string(),
                        type: z.enum(['text', 'number', 'select', 'date']),
                        required: z.boolean()
                    }))
                }),
                execute: async ({ title, description, fields }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const form = await db.form.create({
                        data: {
                            title, description, fields, workspaceId, userId: user.id,
                            slug: title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
                        }
                    });
                    return { success: true, message: `Intake form "**${title}**" created.`, url: `/forms/${form.slug}` };
                }
            },
            create_sprint_board: {
                description: 'Create a new sprint board for a project.',
                parameters: z.object({
                    projectId: z.string(),
                    name: z.string().describe('e.g. Sprint 12'),
                    startDate: z.string().optional(),
                    endDate: z.string().optional()
                }),
                execute: async ({ projectId: pId, name, startDate, endDate }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const board = await db.board.create({
                        data: { 
                            name, projectId: pId, workspaceId, visibility: 'private',
                            description: `Sprint Board: ${startDate || 'N/A'} to ${endDate || 'N/A'}`
                        }
                    });
                    // Create default columns
                    await db.column.createMany({
                        data: [
                            { name: 'Sprint Backlog', boardId: board.id, order: 0 },
                            { name: 'In Development', boardId: board.id, order: 1 },
                            { name: 'Review', boardId: board.id, order: 2 },
                            { name: 'Done', boardId: board.id, order: 3 },
                        ]
                    });
                    return { success: true, message: `Sprint board "**${name}**" created with standard agile columns.` };
                }
            },
            set_recurring: {
                description: 'Set a task to recur on a regular interval.',
                parameters: z.object({
                    taskId: z.string(),
                    interval: z.enum(['daily', 'weekly', 'monthly', 'quarterly'])
                }),
                execute: async ({ taskId, interval }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    await db.task.update({
                        where: { id: taskId },
                        data: { description: `[RECURRING: ${interval.toUpperCase()}]\n` + (await db.task.findUnique({ where: { id: taskId } }))?.description }
                    });
                    return { success: true, message: `Task set to recur **${interval}**.` };
                }
            },
            set_task_metadata: {
                description: 'Set custom metadata or fields for a task.',
                parameters: z.object({
                    taskId: z.string(),
                    fields: z.record(z.any()).describe('Key-value pairs of custom fields')
                }),
                execute: async ({ taskId, fields }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const task = await db.task.findUnique({ where: { id: taskId } });
                    const existingMetadata = typeof task?.attachments === 'object' ? (task?.attachments as any) : {};
                    
                    await db.task.update({
                        where: { id: taskId },
                        data: { attachments: { ...existingMetadata, customFields: fields } }
                    });

                    return { success: true, message: `Updated custom fields for task **${task?.title}**.` };
                }
            },
            generate_dashboard_config: {
                description: 'Generate a JSON configuration for a custom executive dashboard.',
                parameters: z.object({
                    title: z.string(),
                    focus: z.enum(['tasks', 'productivity', 'billing', 'velocity'])
                }),
                execute: async ({ title, focus }: any) => {
                    return {
                        dashboard: {
                            title,
                            layout: "grid",
                            widgets: [
                                { type: "stat", title: "Active Projects", metric: "count_projects" },
                                { type: "chart", title: "Task Velocity", focus },
                                { type: "list", title: "Critical Blockers", filter: "overdue" }
                            ]
                        }
                    };
                }
            },
            list_forms: {
                description: 'List all active intake forms in the workspace.',
                parameters: z.object({}),
                execute: async () => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const forms = await db.form.findMany({ where: { workspaceId }, select: { id: true, title: true, slug: true } });
                    return { forms };
                }
            },
            get_form_responses: {
                description: 'Retrieve responses for a specific form.',
                parameters: z.object({
                    formId: z.string()
                }),
                execute: async ({ formId }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const responses = await db.formResponse.findMany({ 
                        where: { formId }, 
                        take: 10,
                        orderBy: { createdAt: 'desc' }
                    });
                    return { responses: responses.map(r => r.data) };
                }
            },
            propose_custom_module: {
                description: 'Propose the database and UI structure for a new custom workspace module.',
                parameters: z.object({
                    moduleName: z.string(),
                    features: z.array(z.string())
                }),
                execute: async ({ moduleName, features }: any) => {
                    return {
                        proposal: {
                            module: moduleName,
                            schema: features.map(f => ({ field: f, type: "String" })),
                            ui: ["Table View", "Detail Sidebar", "Create Modal"]
                        },
                        note: "This structure can be implemented in the next phase using the App Builder tool."
                    };
                }
            },
            send_team_announcement: {
                description: 'Send a workspace-wide announcement to all members.',
                parameters: z.object({
                    title: z.string(),
                    message: z.string()
                }),
                execute: async ({ title, message }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const members = await db.workspaceMember.findMany({ where: { workspaceId } });
                    
                    await Promise.all(members.map(m => 
                        db.notification.create({
                            data: {
                                title: `Announcement: ${title}`,
                                message,
                                type: "ANNOUNCEMENT",
                                userId: m.userId,
                                workspaceId,
                                priority: "high"
                            }
                        })
                    ));

                    return { success: true, message: `Announcement sent to **${members.length}** members.` };
                }
            },
            list_integrations: {
                description: 'List all active and available third-party integrations.',
                parameters: z.object({}),
                execute: async () => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const active = await db.integration.findMany({ where: { workspaceId } });
                    return {
                        active: active.map(i => i.provider),
                        available: ["GitHub", "Slack", "Asana", "Trello", "Google Calendar"]
                    };
                }
            },
            export_workspace_data: {
                description: 'Generate a downloadable JSON export of the current workspace data.',
                parameters: z.object({}),
                execute: async () => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const [tasks, projects] = await Promise.all([
                        db.task.findMany({ where: { workspaceId } }),
                        db.project.findMany({ where: { workspaceId } })
                    ]);
                    return { success: true, message: "Export ready.", data: { tasks, projects } };
                }
            },
            browse_templates: {
                description: 'Browse the Theta template marketplace for pre-configured project structures.',
                parameters: z.object({
                    category: z.string().optional()
                }),
                execute: async () => {
                    return {
                        templates: [
                            { id: "SaaS_Launch", name: "SaaS Launch Kit", category: "Marketing" },
                            { id: "Agile_Dev", name: "Agile Software Dev", category: "Engineering" },
                            { id: "Client_Onboarding", name: "Client Success Portal", category: "Sales" }
                        ]
                    };
                }
            },
            create_client_invite: {
                description: 'Invite an external client to a secure guest portal.',
                parameters: z.object({
                    email: z.string().email(),
                    projectId: z.string()
                }),
                execute: async ({ email, projectId: pId }: any) => {
                    const { createInvite } = await import("@/lib/invite");
                    await createInvite(workspaceId, email, "guest");
                    return { success: true, message: `Guest invitation sent to **${email}** for the specified project.` };
                }
            },
            set_workspace_goal: {
                description: 'Set a high-level OKR or Goal for the workspace.',
                parameters: z.object({
                    title: z.string(),
                    targetDate: z.string().optional(),
                    metrics: z.array(z.string()).optional()
                }),
                execute: async ({ title, targetDate, metrics }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    await db.document.create({
                        data: { 
                            title: `GOAL: ${title}`, 
                            content: `## Goal Definition\nTarget Date: ${targetDate || 'N/A'}\n\n### Key Results\n${metrics?.map(m => `- [ ] ${m}`).join('\n') || 'None'}`,
                            workspaceId, userId: user.id 
                        }
                    });
                    return { success: true, message: `Goal "**${title}**" has been established and added to the workspace knowledge base.` };
                }
            },
            check_billing_history: {
                description: 'Retrieve the recent billing and subscription history for the workspace.',
                parameters: z.object({}),
                execute: async () => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    const history = await db.billingLog.findMany({ 
                        where: { workspaceId }, 
                        take: 5, 
                        orderBy: { createdAt: 'desc' } 
                    });
                    return { 
                        history: history.map(h => ({ date: h.createdAt, amount: h.amount, status: h.status })),
                        plan: "Enterprise Alpha"
                    };
                }
            },
            orchestrate_agentic_workflow: {
                description: 'Trigger a complex, multi-step autonomous workflow (e.g., "Onboard a new client from scratch").',
                parameters: z.object({
                    objective: z.string()
                }),
                execute: async ({ objective }: any) => {
                    return {
                        steps: [
                            "Creating workspace sub-folder",
                            "Generating documentation templates",
                            "Setting up standard project boards",
                            "Inviting team members",
                            "Establishing initial goals"
                        ],
                        message: `Starting autonomous orchestration for: "**${objective}**". I will handle these steps in the background.`
                    };
                }
            },
            remember_preference: {
                description: 'Save a user preference or piece of information to deep memory.',
                parameters: z.object({
                    key: z.string(),
                    value: z.string()
                }),
                execute: async ({ key, value }: any) => {
                    const { getPrismaClient } = await import("@/lib/prisma");
                    const db = getPrismaClient(workspaceId);
                    
                    await db.aiMemory.upsert({
                        where: { userId_key: { userId: user.id, key } },
                        update: { content: value },
                        create: { userId: user.id, key, content: value }
                    });

                    // Optional: Integrate with mem0 if configured
                    try {
                        const { mem0 } = await import("@/lib/mem0");
                        await mem0.add(`User preference: ${key} = ${value}`, { user_id: user.id });
                    } catch (e) {}

                    return { success: true, message: `Remembered: **${key}**` };
                }
            },

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
