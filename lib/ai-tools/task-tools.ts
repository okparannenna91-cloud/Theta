import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STATUS_TODO, STATUS_DONE } from "@/lib/constants/status";
import { TaskIntelligence } from "@/lib/nova/task-intelligence";
import { type ToolContext, type ToolModule, enforce, requireToolApproval } from "./index";
import { updateParentTask } from "@/lib/task-utils";

interface TaskIntelligenceRecommendation {
  priority?: string;
  suggestedAssigneeId?: string | null;
  reason?: string;
}

function resolvedPriority(initialPriority: string | undefined, recommendation: TaskIntelligenceRecommendation): string {
  return initialPriority || recommendation.priority || "medium";
}

export function buildTaskTools(ctx: ToolContext): ToolModule {
  const { user, workspaceId, projectId } = ctx;

  return {
    list_tasks: {
      description: 'List all tasks in the workspace (optionally filtered by project). Use this when user asks "list tasks" or "show tasks".',
      inputSchema: z.object({ projectId: z.string().optional() }),
      execute: async ({ projectId: targetProjectId }: Record<string, unknown>) => {
        await enforce(ctx, "read", "task");
        const { getAccessibleProjectIds } = await import("../project-permissions");
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
        const where: { workspaceId: string; projectId: { in: string[] } | string } = { workspaceId, projectId: { in: accessibleProjectIds } };
        if (targetProjectId) {
          if (!accessibleProjectIds.includes(targetProjectId as string)) {
            return { tasks: [], message: "Project not found or access denied." };
          }
          where.projectId = targetProjectId as string;
        }
        const tasks = await prisma.task.findMany({ where, take: 50, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, status: true, priority: true } });
        return { tasks };
      }
    },
    create_task: {
      description: 'Create a new task with full parameter support.',
      inputSchema: z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        status: z.string().optional(),
        assigneeId: z.string().optional(),
        dueDate: z.string().optional(),
        labels: z.array(z.string()).optional(),
        projectId: z.string().optional()
      }),
      execute: async ({ title, description, priority: initialPriority, status, assigneeId, dueDate, labels, projectId: targetProjectId }: Record<string, unknown>) => {
        await enforce(ctx, "write", "task");
        const recommendation = await TaskIntelligence.analyzeAndRecommend(workspaceId, title as string, description as string | undefined);
        let pId = (targetProjectId as string) || projectId;
        if (!pId) {
          const { getAccessibleProjectIds } = await import("../project-permissions");
          const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
          const firstProject = await prisma.project.findFirst({ where: { workspaceId, id: { in: accessibleProjectIds } } });
          if (!firstProject) return { error: "No accessible projects found. Please create a project first." };
          pId = firstProject.id;
        } else {
          const { canAccessProject } = await import("../project-permissions");
          const access = await canAccessProject(user.id, pId, workspaceId);
          if (!access.hasAccess) return { error: "Access denied to the specified project." };
        }

        const taskData: any = {
          title: title as string,
          description: description as string | undefined,
          priority: resolvedPriority(initialPriority as string, recommendation),
          status: (status as string) || STATUS_TODO,
          workspaceId,
          projectId: pId,
          userId: (assigneeId as string) || recommendation.suggestedAssigneeId || user.id,
        };

        if (dueDate) {
          taskData.dueDate = new Date(dueDate as string);
        }

        if (labels && Array.isArray(labels)) {
          const existingTags = await prisma.tag.findMany({
            where: { workspaceId, name: { in: labels as string[] } },
          });
          const existingNames = new Set(existingTags.map(t => t.name));
          const newTags = (labels as string[])
            .filter(name => !existingNames.has(name))
            .map(name => ({ name, workspaceId }));
          if (newTags.length > 0) {
            await prisma.tag.createMany({ data: newTags });
          }
          const allTags = await prisma.tag.findMany({ where: { workspaceId, name: { in: labels as string[] } } });
          taskData.tagIds = allTags.map(t => t.id);
        }

        const task = await prisma.task.create({ data: taskData });
        await prisma.activity.create({ data: { action: "CREATED", entityType: "TASK", entityId: task.id, workspaceId, userId: user.id, projectId: pId, metadata: JSON.parse(JSON.stringify({ source: "NOVA_AI", title, intelligenceReasoning: recommendation.reason })) } });
        return { success: true, message: `Created task **${title}**. ${recommendation.reason}` };
      }
    },
    update_task: {
      description: 'Update an existing task.',
      inputSchema: z.object({ taskId: z.string(), status: z.string().optional(), priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(), title: z.string().optional(), assigneeId: z.string().optional() }),
      execute: async ({ taskId, status, priority, title, assigneeId }: Record<string, unknown>) => {
        await enforce(ctx, "write", "task");
        const existingTask = await prisma.task.findUnique({ where: { id: taskId as string }, select: { projectId: true, parentId: true, workspaceId: true, status: true } });
        if (!existingTask) return { error: "Task not found." };
        const { canAccessProjectResource } = await import("../project-permissions");
        const hasAccess = await canAccessProjectResource(user.id, workspaceId, existingTask.projectId);
        if (!hasAccess) return { error: "Access denied to this task's project." };

        const updateData: any = {};
        if (status) updateData.status = status as string;
        if (priority) updateData.priority = priority as string;
        if (title) updateData.title = title as string;
        if (assigneeId) updateData.userId = assigneeId as string;

        // Completion detection (matching API route logic)
        if (status) {
          const completionKeywords = ['done', 'complete', 'finished', 'approved'];
          const isNowCompleted = completionKeywords.some(kw => (status as string).toLowerCase().includes(kw));
          const wasCompleted = completionKeywords.some(kw => (existingTask.status || '').toLowerCase().includes(kw));
          if (isNowCompleted && !wasCompleted) {
            updateData.completedAt = new Date();
            updateData.progress = 100;
          } else if (!isNowCompleted && wasCompleted) {
            updateData.completedAt = null;
          }
        }

        const task = await prisma.task.update({ where: { id: taskId as string }, data: updateData });

        // Cascade to parent
        if (existingTask.parentId) {
          await updateParentTask(existingTask.parentId, existingTask.workspaceId);
        }

        await prisma.activity.create({ data: { action: "UPDATED", entityType: "TASK", entityId: task.id, workspaceId, userId: user.id, projectId: task.projectId, metadata: JSON.parse(JSON.stringify({ source: "NOVA_AI", updates: { status, priority, title } })) } });
        return { success: true, message: `Updated task **${task.title}**` };
      }
    },
    delete_task: {
      description: 'Delete a task.',
      inputSchema: z.object({ taskId: z.string() }),
      execute: async ({ taskId }: Record<string, unknown>) => {
        await requireToolApproval("delete_task", { taskId });
        await enforce(ctx, "delete", "task");
        const existingTask = await prisma.task.findUnique({ where: { id: taskId as string }, select: { projectId: true, parentId: true, workspaceId: true } });
        if (!existingTask) return { error: "Task not found." };
        const { canAccessProjectResource } = await import("../project-permissions");
        const hasAccess = await canAccessProjectResource(user.id, workspaceId, existingTask.projectId);
        if (!hasAccess) return { error: "Access denied to this task's project." };

        // Recursively delete descendants
        async function deleteDescendants(parentId: string) {
          const children = await prisma.task.findMany({ where: { parentId }, select: { id: true } });
          for (const child of children) {
            await deleteDescendants(child.id);
          }
          await prisma.task.deleteMany({ where: { parentId } });
        }
        await deleteDescendants(taskId as string);

        const task = await prisma.task.delete({ where: { id: taskId as string } });

        // Update parent progress
        if (existingTask.parentId) {
          await updateParentTask(existingTask.parentId, existingTask.workspaceId);
        }

        await prisma.activity.create({ data: { action: "DELETED", entityType: "TASK", entityId: taskId as string, workspaceId, userId: user.id, metadata: { source: "NOVA_AI", title: task.title } } });
        return { success: true, message: `Deleted task **${task.title}**` };
      }
    },
    breakdown_task: {
      description: 'Break down a complex task into multiple subtasks.',
      inputSchema: z.object({ taskId: z.string(), subtasks: z.array(z.string()) }),
      execute: async ({ taskId, subtasks: subtaskTitles }: Record<string, unknown>) => {
        await enforce(ctx, "write", "task");
        const taskRecord = await prisma.task.findUnique({ where: { id: taskId as string }, select: { projectId: true } });
        if (taskRecord) {
          const { canAccessProjectResource } = await import("../project-permissions");
          const hasAccess = await canAccessProjectResource(user.id, workspaceId, taskRecord.projectId);
          if (!hasAccess) return { error: "Access denied to this task's project." };
        }
        const titles = subtaskTitles as string[];
        const createdSubtasks = await Promise.all(titles.map((title: string, index: number) => prisma.subtask.create({ data: { title, taskId: taskId as string, order: index } })));
        await prisma.activity.create({ data: { action: "UPDATED", entityType: "TASK", entityId: taskId as string, workspaceId, userId: user.id, metadata: { source: "NOVA_AI", addedSubtasks: titles.length } } });
        return { success: true, message: `Broke down task into **${createdSubtasks.length}** subtasks.` };
      }
    },
    create_dependency: {
      description: 'Link two tasks with a dependency.',
      inputSchema: z.object({ taskId: z.string(), predecessorId: z.string(), type: z.enum(['FS', 'SS', 'FF', 'SF']).default('FS') }),
      execute: async ({ taskId, predecessorId, type }: Record<string, unknown>) => {
        await enforce(ctx, "write", "task");
        const hasCycle = await TaskIntelligence.hasDependencyCycle(workspaceId, taskId as string, predecessorId as string);
        if (hasCycle) return { error: "Circular dependency detected." };
        await prisma.taskDependency.create({ data: { taskId: taskId as string, predecessorId: predecessorId as string, type: (type as string) || 'FS' } });
        return { success: true, message: `Dependency created.` };
      }
    },
    set_estimation: {
      description: 'Set estimated hours for a task.',
      inputSchema: z.object({ taskId: z.string(), hours: z.number() }),
      execute: async ({ taskId, hours }: Record<string, unknown>) => {
        await enforce(ctx, "write", "task");
        await prisma.task.update({ where: { id: taskId as string }, data: { estimatedHours: hours as number } });
        return { success: true, message: `Estimation set to **${hours} hours**.` };
      }
    },
    log_time: {
      description: 'Log time spent on a specific task.',
      inputSchema: z.object({ taskId: z.string(), durationSeconds: z.number(), description: z.string().optional() }),
      execute: async ({ taskId, durationSeconds: duration, description }: Record<string, unknown>) => {
        await enforce(ctx, "write", "task");
        await prisma.timeLog.create({ data: { taskId: taskId as string, userId: user.id, duration: duration as number, description: description as string | undefined } });
        return { success: true, message: `Logged **${Math.round((duration as number)/60)} minutes** to the task.` };
      }
    },
    set_recurring: {
      description: 'Set a task to recur on a regular interval.',
      inputSchema: z.object({ taskId: z.string(), interval: z.enum(['daily', 'weekly', 'monthly', 'quarterly']) }),
      execute: async ({ taskId, interval }: Record<string, unknown>) => {
        await enforce(ctx, "write", "task");
        const existing = await prisma.task.findUnique({ where: { id: taskId as string } });
        await prisma.task.update({ where: { id: taskId as string }, data: { description: `[RECURRING: ${(interval as string).toUpperCase()}]\n${existing?.description || ''}` } });
        return { success: true, message: `Task set to recur **${interval}**.` };
      }
    },
    set_task_metadata: {
      description: 'Set custom metadata for a task.',
      inputSchema: z.object({ taskId: z.string(), fields: z.record(z.any()) }),
      execute: async ({ taskId, fields }: Record<string, unknown>) => {
        await enforce(ctx, "write", "task");
        const task = await prisma.task.findUnique({ where: { id: taskId as string } });
        if (!task) return { found: false, message: "Task not found." };
        const existingMetadata = typeof task.customFieldMetadata === 'object' && task.customFieldMetadata ? task.customFieldMetadata : {};
        await prisma.task.update({ where: { id: taskId as string }, data: { customFieldMetadata: { ...(existingMetadata as Record<string, unknown>), customFields: JSON.parse(JSON.stringify(fields)) } } });
        return { success: true, message: `Updated custom fields for task **${task.title}**.` };
      }
    },
    create_epic: {
      description: 'Create an Epic (summary task with children).',
      inputSchema: z.object({ title: z.string(), childTaskTitles: z.array(z.string()).optional() }),
      execute: async ({ title, childTaskTitles }: Record<string, unknown>) => {
        await enforce(ctx, "write", "task");
        const { getAccessibleProjectIds } = await import("../project-permissions");
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
        const targetProjectId = projectId && accessibleProjectIds.includes(projectId)
          ? projectId
          : (await prisma.project.findFirst({ where: { workspaceId, id: { in: accessibleProjectIds } } }))?.id;
        if (!targetProjectId) return { error: "No accessible project found." };
        const epic = await prisma.task.create({ data: { title: title as string, isSummary: true, workspaceId, userId: user.id, projectId: targetProjectId } });
        const children = childTaskTitles as string[] | undefined;
        if (children) { await Promise.all(children.map((t: string) => prisma.task.create({ data: { title: t, parentId: epic.id, workspaceId, userId: user.id, projectId: epic.projectId } }))); }
        return { success: true, message: `Epic "**${title}**" created.`, id: epic.id };
      }
    },
    create_approval_request: {
      description: 'Create a formal approval request.',
      inputSchema: z.object({ entityId: z.string(), approverId: z.string(), note: z.string().optional() }),
      execute: async ({ entityId, approverId, note }: Record<string, unknown>) => {
        await enforce(ctx, "write", "task");
        await prisma.notification.create({ data: { title: "Approval Required", message: `Approval for ${entityId}. Note: ${note || 'None'}`, type: "APPROVAL", userId: approverId as string, workspaceId, priority: "high", metadata: JSON.parse(JSON.stringify({ entityId, requesterId: user.id })) } });
        return { success: true, message: "Approval request sent." };
      }
    },
  };
}
