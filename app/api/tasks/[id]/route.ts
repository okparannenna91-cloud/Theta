import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { publishToChannel, getWorkspaceChannel, getBoardChannel, getProjectChannel } from "@/lib/ably";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
  taskType: z.enum(["task", "bug", "feature", "story", "epic", "improvement"]).optional(),
  projectId: z.string().optional(),
  boardId: z.string().optional(),
  columnId: z.string().optional(),
  order: z.number().optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  isMilestone: z.boolean().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  isSummary: z.boolean().optional(),
  progress: z.number().min(0).max(100).optional(),
  schedulingMode: z.string().optional(),
  baselineStartDate: z.string().optional(),
  baselineDueDate: z.string().optional(),
  fieldValues: z.any().optional(),
  tagIds: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string()).optional(),
  location: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  link: z.string().optional(),
  rating: z.number().optional(),
  vote: z.number().optional(),
  timeSpent: z.number().optional(),
  estimatedHours: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const task = await prisma.task.findUnique({ where: { id: params.id } });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: task.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify project access
    const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
    if (!hasProjectAccess) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

    const updateData: any = { ...data };
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.baselineStartDate) {
      updateData.baselineStartDate = new Date(data.baselineStartDate);
    }
    if (data.baselineDueDate) {
      updateData.baselineDueDate = new Date(data.baselineDueDate);
    }

    // Validate start date is not after due date
    const finalStartDate = updateData.startDate !== undefined ? updateData.startDate : task.startDate;
    const finalDueDate = updateData.dueDate !== undefined ? updateData.dueDate : task.dueDate;
    if (finalStartDate && finalDueDate && finalStartDate > finalDueDate) {
      return NextResponse.json({ error: "Start date cannot be after due date" }, { status: 400 });
    }

    // Build detailed change log for activity
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const skipFields = new Set(["workspaceId", "projectId"]);
    for (const key of Object.keys(data)) {
      if (skipFields.has(key)) continue;
      const oldVal = (task as any)[key];
      const newVal = (data as any)[key];
      if (oldVal === undefined && newVal === undefined) continue;
      if (oldVal instanceof Date) {
        if (typeof newVal === "string") {
          const newDate = new Date(newVal);
          if (!isNaN(newDate.getTime()) && oldVal.getTime() === newDate.getTime()) continue;
        } else if (newVal === null) {
          if (oldVal === null) continue;
        }
      }
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }

    // Resolve statusId and handle completion logic (Analytics & State Integrity Fix)
    if (data.status) {
        const statusRecord = await prisma.status.findFirst({
            where: { 
                workspaceId: task.workspaceId,
                name: { equals: data.status, mode: 'insensitive' }
            }
        });

        if (statusRecord) {
            updateData.statusId = statusRecord.id;
            
            // Completion Logic - match hardcoded names AND custom status names
            const completionKeywords = ['done', 'complete', 'finished', 'approved'];
            const isNowCompleted = completionKeywords.includes(data.status.toLowerCase()) ||
                (statusRecord && completionKeywords.some(kw => statusRecord.name.toLowerCase().includes(kw)));
            const wasCompleted = completionKeywords.includes(task.status.toLowerCase());

            if (isNowCompleted && !wasCompleted) {
                updateData.completedAt = new Date();
                updateData.progress = 100;
            } else if (!isNowCompleted && wasCompleted) {
                updateData.completedAt = null;
            }
        }
    }

    const updated = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Notify via Ably
    const workspaceChannel = getWorkspaceChannel(updated.workspaceId);
    await publishToChannel(workspaceChannel, "task:updated", updated);

    if (updated.boardId) {
      const boardChannel = getBoardChannel(updated.workspaceId, updated.boardId);
      await publishToChannel(boardChannel, "task:updated", updated);
    }

    if (updated.projectId) {
      const projectChannel = getProjectChannel(updated.workspaceId, updated.projectId);
      await publishToChannel(projectChannel, "task:updated", updated);
    }

    if (updated.parentId) {
      await updateParentTask(updated.parentId, task.workspaceId);
    }

    // If parentId was changed or removed, recalculate the old parent's progress
    if (data.parentId !== undefined && task.parentId && data.parentId !== task.parentId) {
      await updateParentTask(task.parentId, task.workspaceId);
    } else if (data.parentId === null && task.parentId) {
      await updateParentTask(task.parentId, task.workspaceId);
    }

    // Log Activity
    const { createActivity } = await import("@/lib/activity");
    await createActivity(
      user.id,
      task.workspaceId,
      "updated",
      "task",
      task.id,
      {
        taskTitle: updated.title,
        changes,
      },
      updated.projectId
    );

    // Notify members if status changed
    if (data.status && data.status !== task.status) {
      const { notifyWorkspaceMembers } = await import("@/lib/notifications");
      await notifyWorkspaceMembers(
        task.workspaceId,
        user.id,
        "task_updated",
        "Task Status Updated",
        `${user.name || "A member"} updated status of "${updated.title}" from ${task.status} to ${updated.status}`,
        { taskId: updated.id, projectId: updated.projectId }
      );
    }

    // Notify assignees if assignee list changed
    if (data.assigneeIds && JSON.stringify(data.assigneeIds.sort()) !== JSON.stringify((task.assigneeIds || []).sort())) {
      const { notifyWorkspaceMembers } = await import("@/lib/notifications");
      const addedIds = (data.assigneeIds || []).filter((id: string) => !(task.assigneeIds || []).includes(id));
      const removedIds = (task.assigneeIds || []).filter((id: string) => !(data.assigneeIds || []).includes(id));
      if (addedIds.length > 0) {
        for (const assigneeId of addedIds) {
          const { createNotification } = await import("@/lib/notifications");
          await createNotification(
            assigneeId,
            task.workspaceId,
            "task_assigned",
            "Task Assigned",
            `${user.name || "A member"} assigned you to: ${updated.title}`,
            { taskId: updated.id, projectId: updated.projectId }
          );
        }
      }
      if (removedIds.length > 0) {
        for (const assigneeId of removedIds) {
          const { createNotification } = await import("@/lib/notifications");
          await createNotification(
            assigneeId,
            task.workspaceId,
            "task_updated",
            "Task Unassigned",
            `${user.name || "A member"} removed you from: ${updated.title}`,
            { taskId: updated.id, projectId: updated.projectId }
          );
        }
      }
    }

    // Trigger Automations if status changed (Phase 2)
    if (data.status && data.status !== task.status) {
        try {
            const { processAutomations } = await import("@/lib/automations/engine");
            await processAutomations(task.workspaceId, "TASK_STATUS_UPDATED", {
                taskId: updated.id,
                projectId: updated.projectId,
                userId: user.id
            });
        } catch (automationError) {
            console.error("Failed to trigger automations on status change:", automationError);
        }
    }

    // Notify blocked task assignees when a blocking task completes
    if (data.status && data.status !== task.status) {
        const completionKeywords = ['done', 'complete', 'finished', 'approved'];
        const isNowCompleted = completionKeywords.includes(data.status.toLowerCase());
        if (isNowCompleted) {
            try {
                const blockedDeps = await prisma.taskDependency.findMany({
                    where: { predecessorId: params.id },
                    include: { task: { select: { id: true, title: true, assigneeIds: true } } },
                });
                const { createNotification } = await import("@/lib/notifications");
                for (const dep of blockedDeps) {
                    const blockedTask = dep.task;
                    if (!blockedTask?.assigneeIds?.length) continue;
                    for (const assigneeId of blockedTask.assigneeIds) {
                        if (assigneeId === user.id) continue;
                        await createNotification(
                            assigneeId,
                            task.workspaceId,
                            "task_updated",
                            "Dependency Resolved",
                            `"${updated.title}" is now complete — "${blockedTask.title}" is unblocked`,
                            { taskId: blockedTask.id, projectId: updated.projectId }
                        );
                    }
                }
            } catch (depError) {
                console.error("Failed to notify blocked tasks:", depError);
            }
        }
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findUnique({ where: { id: params.id } });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: task.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify project access
    const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
    if (!hasProjectAccess) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

    // Manual Cascade: Recursively delete all descendant tasks
    async function deleteDescendants(parentId: string) {
      const children = await prisma.task.findMany({ where: { parentId }, select: { id: true } });
      for (const child of children) {
        await deleteDescendants(child.id);
      }
      await prisma.task.deleteMany({ where: { parentId } });
    }
    await deleteDescendants(params.id);

    await prisma.task.delete({
      where: { id: params.id },
    });

    if (task.parentId) {
      await updateParentTask(task.parentId, task.workspaceId);
    }

    // Notify via Ably
    const workspaceChannel = getWorkspaceChannel(task.workspaceId);
    await publishToChannel(workspaceChannel, "task:deleted", { id: params.id });

    if (task.boardId) {
      const boardChannel = getBoardChannel(task.workspaceId, task.boardId);
      await publishToChannel(boardChannel, "task:deleted", { id: params.id });
    }

    // Log Activity
    const { createActivity } = await import("@/lib/activity");
    await createActivity(
      user.id,
      task.workspaceId,
      "deleted",
      "task",
      task.id,
      { taskTitle: task.title },
      task.projectId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function updateParentTask(parentId: string, workspaceId: string) {
  const children = await prisma.task.findMany({
    where: { parentId },
    select: { progress: true, startDate: true, dueDate: true }
  });

  if (children.length === 0) return;

  const avgProgress = Math.round(
    children.reduce((acc: number, child: any) => acc + (child.progress || 0), 0) / children.length
  );

  let minStart = children[0].startDate;
  let maxEnd = children[0].dueDate;

  for (const child of children) {
    if (child.startDate && (!minStart || child.startDate < minStart)) minStart = child.startDate;
    if (child.dueDate && (!maxEnd || child.dueDate > maxEnd)) maxEnd = child.dueDate;
  }

  const updatedParent = await prisma.task.update({
    where: { id: parentId },
    data: {
      progress: avgProgress,
      startDate: minStart,
      dueDate: maxEnd,
      isSummary: true
    }
  });

  const workspaceChannel = getWorkspaceChannel(workspaceId);
  await publishToChannel(workspaceChannel, "task:updated", updatedParent);

  if (updatedParent.parentId) {
    await updateParentTask(updatedParent.parentId, workspaceId);
  }
}


