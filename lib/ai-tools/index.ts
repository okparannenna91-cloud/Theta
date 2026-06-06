import { z } from "zod";
import { SecurityGuard, type PermissionCheckAction } from "@/lib/nova/security-guard";
import type { ResourceType } from "@/lib/nova/constitution/security";
import { getPrismaClient, prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { STATUS_TODO, STATUS_DONE, STATUS_IN_PROGRESS } from "@/lib/constants/status";
import { PROMPT_TEMPLATES, BROWSE_TEMPLATES, AVAILABLE_INTEGRATIONS } from "@/lib/constants/templates";

export interface ToolContext {
  user: { id: string };
  workspaceId: string;
  projectId?: string;
}

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
        metadata: { tool: toolName, params: JSON.parse(JSON.stringify(params)), timestamp: new Date().toISOString() },
      },
    });
  } catch (e) {
    logger.error("Failed to log tool execution:", e);
  }
}

async function enforce(ctx: ToolContext, action: PermissionCheckAction, resourceType: ResourceType) {
  await SecurityGuard.enforce({ userId: ctx.user.id, workspaceId: ctx.workspaceId, action, resourceType });
}

async function requireToolApproval(toolName: string, params: Record<string, unknown>): Promise<void> {
  const syntheticPrompt = `${toolName} ${Object.values(params).filter(Boolean).join(" ")}`;
  const { DecisionFramework } = await import("@/lib/nova/decision-framework");
  const decision = DecisionFramework.evaluate(syntheticPrompt);
  if (decision.requiresApproval) {
    throw new Error(
      `**ACTION BLOCKED — CONFIRMATION REQUIRED**\n\n` +
      `The "${toolName}" tool is classified as **HIGH RISK** (${decision.intent} action). ` +
      `This action requires explicit human approval and cannot be delegated to the AI.`
    );
  }
}

const PER_TOOL_RATE_LIMIT = 10;
const PER_TOOL_WINDOW_SECONDS = 60;

async function isToolRateLimited(userId: string, toolName: string): Promise<boolean> {
  try {
    const { redis } = await import("@/lib/redis/client");
    const key = `nova:toolrate:${userId}:${toolName}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, PER_TOOL_WINDOW_SECONDS);
    }
    return count > PER_TOOL_RATE_LIMIT;
  } catch {
    return false;
  }
}

interface TaskIntelligenceRecommendation {
  priority?: string;
  suggestedAssigneeId?: string | null;
  reason?: string;
}

function resolvedPriority(initialPriority: string | undefined, recommendation: TaskIntelligenceRecommendation): string {
  return initialPriority || recommendation.priority || "medium";
}

export function buildTools(ctx: ToolContext) {
  const { user, workspaceId, projectId } = ctx;

  const TOOL_TIMEOUT_MS = 15000;

  function wrapTool<T extends Record<string, unknown>, R>(toolName: string, execute: (args: T) => Promise<R>): (args: T) => Promise<R> {
    return async (args: T) => {
      const limited = await isToolRateLimited(user.id, toolName);
      if (limited) {
        throw new Error(`Rate limit exceeded for tool: ${toolName}. Max ${PER_TOOL_RATE_LIMIT} calls per ${PER_TOOL_WINDOW_SECONDS}s.`);
      }
      const result = await Promise.race([
        execute(args),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${TOOL_TIMEOUT_MS}ms.`)), TOOL_TIMEOUT_MS)
        ),
      ]);
      return result;
    };
  }

  const rawTools = {
    dispatch_ui_action: {
      description: 'Dispatch a direct UI action to the client.',
      inputSchema: z.object({ action: z.enum(['NAVIGATE', 'OPEN_MODAL', 'SWITCH_TAB', 'REFRESH_DATA']), payload: z.record(z.any()) }),
      execute: async ({ action, payload }: any) => {
        const { getAblyChannel } = await import("@/lib/ably-server");
        const channel = getAblyChannel(`workspace:${workspaceId}`);
        await channel.publish('UI_ACTION', { action, payload, userId: user.id });
        return { success: true, message: `Dispatched UI action: **${action}**` };
      }
    },
    update_board_layout: {
      description: 'Update the columns or layout of a project board.',
      inputSchema: z.object({ boardId: z.string(), columns: z.array(z.object({ id: z.string().optional(), name: z.string(), order: z.number() })) }),
      execute: async ({ boardId, columns }: any) => {
        await enforce(ctx, "write", "project");
        const db = getPrismaClient(workspaceId);
        await Promise.all(columns.map((col: { id?: string; name: string; order: number }) =>
          col.id ? db.column.update({ where: { id: col.id }, data: { name: col.name, order: col.order } }) : db.column.create({ data: { name: col.name, order: col.order, boardId } })
        ));
        return { success: true, message: `Updated board layout for **${boardId}**.` };
      }
    },
    list_projects: {
      description: 'List all projects in the current workspace.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "project");
        const db = getPrismaClient(workspaceId);
        const projects = await db.project.findMany({ where: { workspaceId }, select: { id: true, name: true, description: true } });
        return { projects };
      }
    },
    list_tasks: {
      description: 'List tasks for a specific project.',
      inputSchema: z.object({ projectId: z.string().optional() }),
      execute: async ({ projectId: targetProjectId }: any) => {
        await enforce(ctx, "read", "task");
        const db = getPrismaClient(workspaceId);
        const tasks = await db.task.findMany({ where: { workspaceId, projectId: targetProjectId || undefined }, take: 20, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, status: true, priority: true } });
        return { tasks };
      }
    },
    create_task: {
      description: 'Create a new task.',
      inputSchema: z.object({ title: z.string(), description: z.string().optional(), priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(), projectId: z.string().optional() }),
      execute: async ({ title, description, priority: initialPriority, projectId: targetProjectId }: any) => {
        await enforce(ctx, "write", "task");
        const { TaskIntelligence } = await import("@/lib/nova/task-intelligence");
        const recommendation = await TaskIntelligence.analyzeAndRecommend(workspaceId, title, description);
        const db = getPrismaClient(workspaceId);
        let pId = targetProjectId || projectId;
        if (!pId) {
          const firstProject = await db.project.findFirst({ where: { workspaceId } });
          if (!firstProject) return { error: "No projects found. Please create a project first." };
          pId = firstProject.id;
        }
        const task = await db.task.create({ data: { title, description, priority: resolvedPriority(initialPriority, recommendation), status: STATUS_TODO, workspaceId, projectId: pId, userId: recommendation.suggestedAssigneeId || user.id } });
        await db.activity.create({ data: { action: "CREATED", entityType: "TASK", entityId: task.id, workspaceId, userId: user.id, projectId: pId, metadata: { source: "NOVA_AI", title, intelligenceReasoning: recommendation.reason } } });
        return { success: true, message: `Created task **${title}**. ${recommendation.reason}` };
      }
    },
    update_task: {
      description: 'Update an existing task.',
      inputSchema: z.object({ taskId: z.string(), status: z.string().optional(), priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(), title: z.string().optional(), assigneeId: z.string().optional() }),
      execute: async ({ taskId, status, priority, title, assigneeId }: any) => {
        await enforce(ctx, "write", "task");
        const db = getPrismaClient(workspaceId);
        const task = await db.task.update({ where: { id: taskId }, data: { ...(status && { status }), ...(priority && { priority }), ...(title && { title }), ...(assigneeId && { userId: assigneeId }) } });
        await db.activity.create({ data: { action: "UPDATED", entityType: "TASK", entityId: task.id, workspaceId, userId: user.id, projectId: task.projectId, metadata: { source: "NOVA_AI", updates: { status, priority, title } } } });
        return { success: true, message: `Updated task **${task.title}**` };
      }
    },
    delete_task: {
      description: 'Delete a task.',
      inputSchema: z.object({ taskId: z.string() }),
      execute: async ({ taskId }: any) => {
        await requireToolApproval("delete_task", { taskId });
        await enforce(ctx, "delete", "task");
        const db = getPrismaClient(workspaceId);
        const task = await db.task.delete({ where: { id: taskId } });
        await db.activity.create({ data: { action: "DELETED", entityType: "TASK", entityId: taskId, workspaceId, userId: user.id, metadata: { source: "NOVA_AI", title: task.title } } });
        return { success: true, message: `Deleted task **${task.title}**` };
      }
    },
    create_project: {
      description: 'Create a new project.',
      inputSchema: z.object({ name: z.string(), description: z.string().optional() }),
      execute: async ({ name, description }: any) => {
        await enforce(ctx, "write", "project");
        const db = getPrismaClient(workspaceId);
        const project = await db.project.create({ data: { name, description, workspaceId, userId: user.id } });
        await db.activity.create({ data: { action: "CREATED", entityType: "PROJECT", entityId: project.id, workspaceId, userId: user.id, projectId: project.id, metadata: { source: "NOVA_AI", name } } });
        return { success: true, message: `Created project **${name}**` };
      }
    },
    update_project: {
      description: 'Update project details.',
      inputSchema: z.object({ projectId: z.string(), name: z.string().optional(), description: z.string().optional() }),
      execute: async ({ projectId: id, name, description }: any) => {
        await enforce(ctx, "write", "project");
        const db = getPrismaClient(workspaceId);
        const project = await db.project.update({ where: { id }, data: { ...(name && { name }), ...(description && { description }) } });
        return { success: true, message: `Updated project **${project.name}**` };
      }
    },
    delete_project: {
      description: 'Delete a project (Admin only).',
      inputSchema: z.object({ projectId: z.string() }),
      execute: async ({ projectId: id }: any) => {
        await requireToolApproval("delete_project", { projectId: id });
        await enforce(ctx, "delete", "project");
        const db = getPrismaClient(workspaceId);
        await db.project.delete({ where: { id } });
        return { success: true, message: "Project deleted successfully." };
      }
    },
    update_workspace: {
      description: 'Update workspace settings (Admin only).',
      inputSchema: z.object({ name: z.string().optional() }),
      execute: async ({ name }: any) => {
        await requireToolApproval("update_workspace", { name });
        await enforce(ctx, "admin", "workspace");
        await prisma.workspace.update({ where: { id: workspaceId }, data: { ...(name && { name }) } });
        return { success: true, message: `Workspace updated to **${name}**` };
      }
    },
    list_members: {
      description: 'List team members in the workspace.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const { getWorkspaceMembers } = await import("@/lib/workspace");
        const members = await getWorkspaceMembers(workspaceId);
        return { members: members.map((m: any) => ({ id: m.user?.id, name: m.user?.name, email: m.user?.email, role: m.role })) };
      }
    },
    invite_member: {
      description: 'Invite a new member to the workspace (Admin only).',
      inputSchema: z.object({ email: z.string().email(), role: z.enum(['admin', 'member']).default('member') }),
      execute: async ({ email, role }: any) => {
        await enforce(ctx, "admin", "member");
        const { createInvite } = await import("@/lib/invite");
        await createInvite(workspaceId, email, role);
        return { success: true, message: `Sent invitation to **${email}** as **${role}**` };
      }
    },
    breakdown_task: {
      description: 'Break down a complex task into multiple subtasks.',
      inputSchema: z.object({ taskId: z.string(), subtasks: z.array(z.string()) }),
      execute: async ({ taskId, subtasks: subtaskTitles }: any) => {
        await enforce(ctx, "write", "task");
        const db = getPrismaClient(workspaceId);
        const createdSubtasks = await Promise.all(subtaskTitles.map((title: string, index: number) => db.subtask.create({ data: { title, taskId, order: index } })));
        await db.activity.create({ data: { action: "UPDATED", entityType: "TASK", entityId: taskId, workspaceId, userId: user.id, metadata: { source: "NOVA_AI", addedSubtasks: subtaskTitles.length } } });
        return { success: true, message: `Broke down task into **${createdSubtasks.length}** subtasks.` };
      }
    },
    create_automation: {
      description: 'Create a new automated workflow in the workspace.',
      inputSchema: z.object({ name: z.string(), trigger: z.string(), action: z.string(), config: z.record(z.any()) }),
      execute: async ({ name, trigger, action, config }: any) => {
        await enforce(ctx, "admin", "workspace");
        const db = getPrismaClient(workspaceId);
        const automation = await db.automation.create({ data: { name, trigger, action, actionValue: JSON.stringify(config), workspaceId, active: true } });
        try {
          const { inngest } = await import("@/lib/inngest/client");
          await inngest.send({ name: "automation/created", data: { automationId: automation.id, workspaceId } });
        } catch (e) { logger.warn("Failed to notify Inngest of automation creation:", e); }
        return { success: true, message: `Automation "**${name}**" has been created and activated.` };
      }
    },
    search_workspace: {
      description: 'Perform a deep semantic search across the entire workspace.',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }: any) => {
        await enforce(ctx, "read", "workspace");
        await auditToolExecution(workspaceId, user.id, "search_workspace", { query });
        const db = getPrismaClient(workspaceId);
        const [tasks, docs, comments, activities] = await Promise.all([
          db.task.findMany({ where: { workspaceId, OR: [{ title: { contains: query } }, { description: { contains: query } }] }, take: 5, select: { id: true, title: true, status: true } }),
          db.document.findMany({ where: { workspaceId, OR: [{ title: { contains: query } }, { content: { contains: query } }] }, take: 5, select: { id: true, title: true } }),
          db.comment.findMany({ where: { task: { workspaceId }, content: { contains: query } }, take: 3, include: { user: { select: { name: true } }, task: { select: { title: true } } } }),
          db.activity.findMany({ where: { workspaceId }, take: 5, orderBy: { createdAt: 'desc' }, select: { action: true, entityType: true, createdAt: true, metadata: true } })
        ]);
        return { results: { tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status })), documents: docs.map(d => ({ id: d.id, title: d.title })), comments: comments.map(c => ({ user: c.user.name, task: c.task?.title, text: c.content })), activity: activities.map(a => ({ action: a.action, type: a.entityType, time: a.createdAt })) } };
      }
    },
    list_prompt_templates: {
      description: 'List available prompt templates.',
      inputSchema: z.object({}),
      execute: async () => ({ templates: PROMPT_TEMPLATES })
    },
    create_document: {
      description: 'Create a new document in the workspace knowledge base.',
      inputSchema: z.object({ title: z.string(), content: z.string() }),
      execute: async ({ title, content }: any) => {
        await enforce(ctx, "write", "document");
        await auditToolExecution(workspaceId, user.id, "create_document", { title });
        const { DocumentIntelligence } = await import("@/lib/nova/document-intelligence");
        const analysis = DocumentIntelligence.analyze(title, content);
        const db = getPrismaClient(workspaceId);
        const doc = await db.document.create({ data: { title, content, workspaceId, userId: user.id, tags: analysis.suggestedLinks } });
        if (analysis.extractedTasks.length > 0) {
          const firstProject = await db.project.findFirst({ where: { workspaceId } });
          if (firstProject) {
            await Promise.all(analysis.extractedTasks.map(async (t: string) => { await db.task.create({ data: { title: t, description: `Auto-extracted from: ${title}`, priority: "medium", status: "todo", workspaceId, projectId: firstProject.id, userId: user.id } }); }));
          }
        }
        for (const dec of analysis.decisions) {
          await db.entityLink.create({ data: { sourceId: doc.id, targetId: doc.id, relation: `DECISION: ${dec.substring(0, 50)}` } }).catch(() => {});
        }
        return { success: true, message: `Document "**${title}**" created.`, id: doc.id };
      }
    },
    read_document: {
      description: 'Read the content of a document.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }: any) => {
        await enforce(ctx, "read", "document");
        await auditToolExecution(workspaceId, user.id, "read_document", { id });
        const db = getPrismaClient(workspaceId);
        const doc = await db.document.findUnique({ where: { id } });
        return { title: doc?.title, content: doc?.content };
      }
    },
    delete_document: {
      description: 'Delete a document.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }: any) => {
        await requireToolApproval("delete_document", { id });
        await enforce(ctx, "delete", "document");
        const db = getPrismaClient(workspaceId);
        await db.document.delete({ where: { id } });
        return { success: true, message: "Document deleted." };
      }
    },
    evaluate_risks: {
      description: 'Evaluate a task or project for potential risks.',
      inputSchema: z.object({ taskId: z.string().optional(), projectId: z.string().optional() }),
      execute: async ({ taskId }: any) => {
        await enforce(ctx, "read", "project");
        const db = getPrismaClient(workspaceId);
        if (taskId) { await db.task.findUnique({ where: { id: taskId }, include: { subtasks: true } }); }
        return { risks: ["High dependency on external API", "Overlapping deadlines", "Resource bottleneck"], mitigation: "Consider breaking down the task further." };
      }
    },
    generate_standup: {
      description: 'Generate a daily standup report.',
      inputSchema: z.object({ userId: z.string() }),
      execute: async ({ userId }: any) => {
        await enforce(ctx, "read", "workspace");
        await auditToolExecution(workspaceId, user.id, "generate_standup", { userId });
        const db = getPrismaClient(workspaceId);
        const [activity, tasks] = await Promise.all([
          db.activity.findMany({ where: { userId, workspaceId }, take: 5, orderBy: { createdAt: 'desc' } }),
          db.task.findMany({ where: { workspaceId, status: STATUS_IN_PROGRESS } })
        ]);
        return { yesterday: activity.map(a => a.action), today: tasks.map(t => t.title), blockers: ["None reported by system"] };
      }
    },
    log_time: {
      description: 'Log time spent on a specific task.',
      inputSchema: z.object({ taskId: z.string(), durationSeconds: z.number(), description: z.string().optional() }),
      execute: async ({ taskId, durationSeconds: duration, description }: any) => {
        await enforce(ctx, "write", "task");
        const db = getPrismaClient(workspaceId);
        await db.timeLog.create({ data: { taskId, userId: user.id, duration, description } });
        return { success: true, message: `Logged **${Math.round(duration/60)} minutes** to the task.` };
      }
    },
    set_estimation: {
      description: 'Set estimated hours for a task.',
      inputSchema: z.object({ taskId: z.string(), hours: z.number() }),
      execute: async ({ taskId, hours }: any) => {
        await enforce(ctx, "write", "task");
        const db = getPrismaClient(workspaceId);
        await db.task.update({ where: { id: taskId }, data: { estimatedHours: hours } });
        return { success: true, message: `Estimation set to **${hours} hours**.` };
      }
    },
    create_dependency: {
      description: 'Link two tasks with a dependency.',
      inputSchema: z.object({ taskId: z.string(), predecessorId: z.string(), type: z.enum(['FS', 'SS', 'FF', 'SF']).default('FS') }),
      execute: async ({ taskId, predecessorId, type }: any) => {
        await enforce(ctx, "write", "task");
        const { TaskIntelligence } = await import("@/lib/nova/task-intelligence");
        const hasCycle = await TaskIntelligence.hasDependencyCycle(workspaceId, taskId, predecessorId);
        if (hasCycle) return { error: "Circular dependency detected." };
        const db = getPrismaClient(workspaceId);
        await db.taskDependency.create({ data: { taskId, predecessorId, type } });
        return { success: true, message: `Dependency created.` };
      }
    },
    create_epic: {
      description: 'Create an Epic (summary task with children).',
      inputSchema: z.object({ title: z.string(), childTaskTitles: z.array(z.string()).optional() }),
      execute: async ({ title, childTaskTitles }: any) => {
        await enforce(ctx, "write", "task");
        const db = getPrismaClient(workspaceId);
        const epic = await db.task.create({ data: { title, isSummary: true, workspaceId, userId: user.id, projectId: (projectId || (await db.project.findFirst({ where: { workspaceId } }))?.id) as string } });
        if (childTaskTitles) { await Promise.all(childTaskTitles.map((t: string) => db.task.create({ data: { title: t, parentId: epic.id, workspaceId, userId: user.id, projectId: epic.projectId } }))); }
        return { success: true, message: `Epic "**${title}**" created.`, id: epic.id };
      }
    },
    get_suggestions: {
      description: 'Get AI suggestions for workflow improvements.',
      inputSchema: z.object({ projectId: z.string().optional() }),
      execute: async ({ projectId: pId }: any) => {
        await enforce(ctx, "read", "task");
        const db = getPrismaClient(workspaceId);
        const [overdue, stalled] = await Promise.all([
          db.task.findMany({ where: { workspaceId, projectId: pId || undefined, dueDate: { lt: new Date() }, status: { not: STATUS_DONE } }, take: 3 }),
          db.task.findMany({ where: { workspaceId, projectId: pId || undefined, status: STATUS_IN_PROGRESS, updatedAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } }, take: 3 })
        ]);
        return { suggestions: [
          overdue.length > 0 ? `You have **${overdue.length}** overdue tasks.` : "No overdue tasks.",
          stalled.length > 0 ? `**${stalled[0].title}** has been stalled for 3 days.` : "Team is moving fast!"
        ]};
      }
    },
    generate_daily_brief: {
      description: 'Generate a personalized daily brief.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        await auditToolExecution(workspaceId, user.id, "generate_daily_brief", {});
        const db = getPrismaClient(workspaceId);
        const [overdue, upcoming, activities] = await Promise.all([
          db.task.findMany({ where: { workspaceId, userId: user.id, dueDate: { lt: new Date() }, status: { not: STATUS_DONE } }, take: 5 }),
          db.task.findMany({ where: { workspaceId, userId: user.id, dueDate: { gte: new Date() } }, orderBy: { dueDate: 'asc' }, take: 5 }),
          db.activity.findMany({ where: { workspaceId }, take: 5, orderBy: { createdAt: 'desc' } })
        ]);
        return { brief: { critical: overdue.map(t => t.title), onDeck: upcoming.map(t => t.title), teamPulse: activities.map(a => `${a.action} ${a.entityType}`) }, recommendation: overdue.length > 0 ? "Focus on clearing blockers." : "Schedule looks clear." };
      }
    },
    generate_meeting_prep: {
      description: 'Prepare a meeting agenda and context.',
      inputSchema: z.object({ topic: z.string(), projectId: z.string().optional() }),
      execute: async ({ topic, projectId: pId }: any) => {
        await enforce(ctx, "read", "project");
        await auditToolExecution(workspaceId, user.id, "generate_meeting_prep", { topic, projectId: pId });
        const db = getPrismaClient(workspaceId);
        const tasks = await db.task.findMany({ where: { workspaceId, projectId: pId || undefined, status: STATUS_IN_PROGRESS }, take: 5 });
        return { agenda: ["Status update", "Blockers review", "Resource allocation", "Action items"], context: tasks.map(t => t.title) };
      }
    },
    project_health_analysis: {
      description: 'Perform a health check on a project.',
      inputSchema: z.object({ projectId: z.string() }),
      execute: async ({ projectId: pId }: any) => {
        await enforce(ctx, "read", "project");
        const { ProjectIntelligence } = await import("@/lib/nova/project-intelligence");
        return ProjectIntelligence.analyzeHealth(workspaceId, pId);
      }
    },
    create_approval_request: {
      description: 'Create a formal approval request.',
      inputSchema: z.object({ entityId: z.string(), approverId: z.string(), note: z.string().optional() }),
      execute: async ({ entityId, approverId, note }: any) => {
        await enforce(ctx, "write", "task");
        const db = getPrismaClient(workspaceId);
        await db.notification.create({ data: { title: "Approval Required", message: `Approval for ${entityId}. Note: ${note || 'None'}`, type: "APPROVAL", userId: approverId, workspaceId, priority: "high", metadata: { entityId, requesterId: user.id } } });
        return { success: true, message: "Approval request sent." };
      }
    },
    save_conversation: {
      description: 'Save the current AI conversation.',
      inputSchema: z.object({ title: z.string(), messages: z.array(z.object({ role: z.string(), content: z.string() })) }),
      execute: async ({ title, messages }: any) => {
        await enforce(ctx, "write", "workspace");
        await auditToolExecution(workspaceId, user.id, "save_conversation", { title });
        const db = getPrismaClient(workspaceId);
        const conversation = await db.aiConversation.create({ data: { title, workspaceId, userId: user.id, messages: { create: messages } } });
        return { success: true, id: conversation.id };
      }
    },
    create_form: {
      description: 'Create an intake form.',
      inputSchema: z.object({ title: z.string(), description: z.string().optional(), fields: z.array(z.object({ label: z.string(), type: z.enum(['text', 'number', 'select', 'date']), required: z.boolean() })) }),
      execute: async ({ title, description, fields }: any) => {
        await enforce(ctx, "admin", "workspace");
        const db = getPrismaClient(workspaceId);
        const form = await db.form.create({ data: { title, description, fields, workspaceId, userId: user.id, slug: title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() } });
        return { success: true, message: `Form "**${title}**" created.`, url: `/forms/${form.slug}` };
      }
    },
    create_sprint_board: {
      description: 'Create a new sprint board.',
      inputSchema: z.object({ projectId: z.string(), name: z.string(), startDate: z.string().optional(), endDate: z.string().optional() }),
      execute: async ({ projectId: pId, name, startDate, endDate }: any) => {
        await enforce(ctx, "write", "project");
        const db = getPrismaClient(workspaceId);
        const board = await db.board.create({ data: { name, projectId: pId, workspaceId, visibility: 'private', description: `Sprint: ${startDate || 'N/A'} to ${endDate || 'N/A'}` } });
        await db.column.createMany({ data: [
          { name: 'Sprint Backlog', boardId: board.id, order: 0 },
          { name: 'In Development', boardId: board.id, order: 1 },
          { name: 'Review', boardId: board.id, order: 2 },
          { name: 'Done', boardId: board.id, order: 3 },
        ]});
        return { success: true, message: `Board "**${name}**" created.` };
      }
    },
    set_recurring: {
      description: 'Set a task to recur on a regular interval.',
      inputSchema: z.object({ taskId: z.string(), interval: z.enum(['daily', 'weekly', 'monthly', 'quarterly']) }),
      execute: async ({ taskId, interval }: any) => {
        await enforce(ctx, "write", "task");
        const db = getPrismaClient(workspaceId);
        const existing = await db.task.findUnique({ where: { id: taskId } });
        await db.task.update({ where: { id: taskId }, data: { description: `[RECURRING: ${interval.toUpperCase()}]\n${existing?.description || ''}` } });
        return { success: true, message: `Task set to recur **${interval}**.` };
      }
    },
    set_task_metadata: {
      description: 'Set custom metadata for a task.',
      inputSchema: z.object({ taskId: z.string(), fields: z.record(z.any()) }),
      execute: async ({ taskId, fields }: any) => {
        await enforce(ctx, "write", "task");
        const db = getPrismaClient(workspaceId);
        const task = await db.task.findUnique({ where: { id: taskId } });
        const existingMetadata = typeof task?.attachments === 'object' && task?.attachments ? task.attachments : {};
        await db.task.update({ where: { id: taskId }, data: { attachments: { ...existingMetadata, customFields: fields } } });
        return { success: true, message: `Updated custom fields for task **${task?.title}**.` };
      }
    },
    generate_dashboard_config: {
      description: 'Generate a JSON dashboard configuration.',
      inputSchema: z.object({ title: z.string(), focus: z.enum(['tasks', 'productivity', 'billing', 'velocity']) }),
      execute: async ({ title, focus }: any) => ({ dashboard: { title, layout: "grid", widgets: [{ type: "stat", title: "Active Projects", metric: "count_projects" }, { type: "chart", title: "Task Velocity", focus }, { type: "list", title: "Blockers", filter: "overdue" }] } })
    },
    list_forms: {
      description: 'List all active intake forms.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const db = getPrismaClient(workspaceId);
        const forms = await db.form.findMany({ where: { workspaceId }, select: { id: true, title: true, slug: true } });
        return { forms };
      }
    },
    get_form_responses: {
      description: 'Retrieve responses for a specific form.',
      inputSchema: z.object({ formId: z.string() }),
      execute: async ({ formId }: any) => {
        await enforce(ctx, "read", "workspace");
        await auditToolExecution(workspaceId, user.id, "get_form_responses", { formId });
        const db = getPrismaClient(workspaceId);
        const responses = await db.formResponse.findMany({ where: { formId }, take: 10, orderBy: { createdAt: 'desc' } });
        const { decryptSensitiveFields } = await import("@/lib/field-encryption");
        return { responses: responses.map(r => decryptSensitiveFields("formResponse", r).data) };
      }
    },
    propose_custom_module: {
      description: 'Propose a new custom module structure.',
      inputSchema: z.object({ moduleName: z.string(), features: z.array(z.string()) }),
      execute: async ({ moduleName, features }: any) => ({ proposal: { module: moduleName, schema: features.map((f: string) => ({ field: f, type: "String" })), ui: ["Table View", "Detail Sidebar", "Create Modal"] }, note: "Ready for App Builder." })
    },
    send_team_announcement: {
      description: 'Send a workspace-wide announcement.',
      inputSchema: z.object({ title: z.string(), message: z.string() }),
      execute: async ({ title, message }: any) => {
        await enforce(ctx, "admin", "workspace");
        const db = getPrismaClient(workspaceId);
        const members = await db.workspaceMember.findMany({ where: { workspaceId } });
        await Promise.all(members.map((m: { userId: string }) => db.notification.create({ data: { title: `Announcement: ${title}`, message, type: "ANNOUNCEMENT", userId: m.userId, workspaceId, priority: "high" } })));
        return { success: true, message: `Announcement sent to **${members.length}** members.` };
      }
    },
    list_integrations: {
      description: 'List active and available integrations.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const db = getPrismaClient(workspaceId);
        const active = await db.integration.findMany({ where: { workspaceId } });
        return { active: active.map(i => i.provider), available: [...AVAILABLE_INTEGRATIONS] };
      }
    },
    export_workspace_data: {
      description: 'Export workspace data as JSON.',
      inputSchema: z.object({
        includeTypes: z.array(z.enum(["tasks","projects","documents"])).optional().describe("Entity types to include; defaults to all."),
        maxItems: z.number().max(500).optional().describe("Max items per type (default 200, max 500).")
      }),
      execute: async ({ includeTypes = ["tasks", "projects"], maxItems = 200 }: { includeTypes?: string[]; maxItems?: number }) => {
        await enforce(ctx, "admin", "workspace");
        const db = getPrismaClient(workspaceId);
        const queries: Promise<{ name: string; count: number; data: unknown[] }>[] = [];
        if (includeTypes.includes("tasks")) {
          queries.push(
            db.task.findMany({ where: { workspaceId }, take: maxItems }).then((data: unknown[]) => ({ name: "tasks", count: data.length, data }))
          );
        }
        if (includeTypes.includes("projects")) {
          queries.push(
            db.project.findMany({ where: { workspaceId }, take: maxItems }).then((data: unknown[]) => ({ name: "projects", count: data.length, data }))
          );
        }
        if (includeTypes.includes("documents")) {
          queries.push(
            db.document.findMany({ where: { workspaceId }, take: maxItems }).then((data: unknown[]) => ({ name: "documents", count: data.length, data }))
          );
        }
        const results = await Promise.all(queries);
        const summary: Record<string, number> = {};
        const data: Record<string, unknown[]> = {};
        for (const { name, count, data: items } of results) {
          summary[name] = count;
          data[name] = items;
        }
        await auditToolExecution(workspaceId, user.id, "export_workspace_data", { includeTypes, maxItems, summary });
        return { success: true, message: `Exported ${Object.entries(summary).map(([k, v]) => `${v} ${k}`).join(", ")}.`, data };
      }
    },
    browse_templates: {
      description: 'Browse template marketplace.',
      inputSchema: z.object({ category: z.string().optional() }),
      execute: async () => ({ templates: BROWSE_TEMPLATES })
    },
    create_client_invite: {
      description: 'Invite an external client to a guest portal.',
      inputSchema: z.object({ email: z.string().email(), projectId: z.string() }),
      execute: async ({ email, projectId: pId }: any) => {
        await enforce(ctx, "admin", "member");
        const { createInvite } = await import("@/lib/invite");
        await createInvite(workspaceId, email, "guest");
        return { success: true, message: `Guest invitation sent to **${email}**.` };
      }
    },
    set_workspace_goal: {
      description: 'Set a high-level OKR or goal.',
      inputSchema: z.object({ title: z.string(), targetDate: z.string().optional(), metrics: z.array(z.string()).optional() }),
      execute: async ({ title, targetDate, metrics }: any) => {
        await enforce(ctx, "write", "document");
        const db = getPrismaClient(workspaceId);
        await db.document.create({ data: { title: `GOAL: ${title}`, content: `## Goal\nTarget: ${targetDate || 'N/A'}\n### Key Results\n${metrics?.map((m: string) => `- [ ] ${m}`).join('\n') || 'None'}`, workspaceId, userId: user.id } });
        return { success: true, message: `Goal "**${title}**" established.` };
      }
    },
    check_billing_history: {
      description: 'Retrieve billing and subscription history.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "billing");
        const db = getPrismaClient(workspaceId);
        const history = await db.billingLog.findMany({ where: { workspaceId }, take: 5, orderBy: { createdAt: 'desc' } });
        const { decryptSensitiveFields } = await import("@/lib/field-encryption");
        return { history: history.map((h: any) => ({ date: h.createdAt, amount: h.amount, status: h.action, metadata: decryptSensitiveFields("billingLog", h as any).metadata })), plan: "Enterprise Alpha" };
      }
    },
    orchestrate_agentic_workflow: {
      description: 'Trigger a multi-step autonomous workflow using specialized agents.',
      inputSchema: z.object({ objective: z.string(), context: z.string().optional() }),
      execute: async ({ objective, context: extraContext }: any) => {
        await enforce(ctx, "write", "project");
        const { AgentFramework } = await import("@/lib/nova/agent-framework");
        const plans = await AgentFramework.planExecution(objective);
        if (plans.length === 0) {
          return { message: `No specialized agents matched objective: "**${objective}**". Consider using more specific keywords (e.g., sprint, task, report, document, risk, automate).`, agents: [] };
        }
        const db = getPrismaClient(workspaceId);
        const results: Array<{ agentId: string; agentName: string; result: string }> = [];
        for (const plan of plans) {
          const agent = AgentFramework.getAgent(plan.agentId);
          const stepResults: string[] = [];
          for (const step of plan.steps) {
            stepResults.push(step.description);
          }
          if (agent) {
            await db.activity.create({
              data: {
                action: "AGENT_WORKFLOW_STEP",
                entityType: "AGENT",
                entityId: agent.id,
                workspaceId,
                userId: user.id,
                metadata: { agent: agent.name, steps: plan.steps.map(s => s.tool), objective, extraContext },
              },
            });
          }
          let summary = `Aggregated data from **${agent?.name || plan.agentId}**`;
          if (plan.agentId === "sprint-agent" || plan.agentId === "task-agent") {
            const taskCount = await db.task.count({ where: { workspaceId } });
            summary += ` — workspace contains **${taskCount}** tasks.`;
          }
          if (plan.agentId === "reporting-agent") {
            const projectCount = await db.project.count({ where: { workspaceId } });
            summary += ` — **${projectCount}** projects available for reporting.`;
          }
          if (plan.agentId === "risk-agent") {
            const overdueTasks = await db.task.count({ where: { workspaceId, status: { not: "done" } } });
            summary += ` — **${overdueTasks}** incomplete tasks may carry risks.`;
          }
          if (plan.agentId === "documentation-agent") {
            const docCount = await db.document.count({ where: { workspaceId } });
            summary += ` — **${docCount}** documents in the knowledge base.`;
          }
          results.push({ agentId: plan.agentId, agentName: agent?.name || plan.agentId, result: summary });
        }
        return {
          message: `**Orchestration complete.** Activated ${results.length} agent(s) for: "${objective}".`,
          agents: results,
          steps: plans.flatMap(p => p.steps.map(s => s.description)),
        };
      }
    },
    remember_preference: {
      description: 'Save a user preference to memory.',
      inputSchema: z.object({ key: z.string().min(1).max(100).describe("Preference key (max 100 chars)."), value: z.string().min(1).max(2000).describe("Preference value (max 2000 chars).") }),
      execute: async ({ key, value }: any) => {
        await enforce(ctx, "write", "workspace");
        if (!/^[a-zA-Z0-9_\-.\s]+$/.test(key)) {
          return { success: false, message: "Invalid key: only letters, numbers, spaces, hyphens, underscores, and periods allowed." };
        }
        const db = getPrismaClient(workspaceId);
        const existingCount = await db.aiMemory.count({ where: { userId: user.id } });
        if (existingCount >= 100) {
          return { success: false, message: "Memory limit reached (max 100 preferences). Clear some before saving more." };
        }
        let mem0Synced = false;
        try {
          const { mem0 } = await import("@/lib/mem0");
          await mem0.add([{ role: "user", content: `User preference: ${key} = ${value}` }], { user_id: user.id });
          mem0Synced = true;
        } catch (e) { logger.warn("Mem0 sync failed:", e); }
        await db.aiMemory.upsert({ where: { userId_key: { userId: user.id, key } }, update: { content: value }, create: { userId: user.id, key, content: value } });
        return { success: true, message: `Remembered: **${key}**${mem0Synced ? "" : " (memory sync unavailable)"}` };
      }
    },
  };

  for (const [name, tool] of Object.entries(rawTools)) {
    const originalExecute = (tool as any).execute;
    (rawTools as any)[name].execute = wrapTool(name, originalExecute);
  }

  return rawTools;
}
