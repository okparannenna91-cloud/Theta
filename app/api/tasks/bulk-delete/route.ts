import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds } from "@/lib/project-permissions";
import { publishToChannel, getWorkspaceChannel, getBoardChannel } from "@/lib/ably";

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskIds } = await req.json();
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
    });

    if (tasks.length !== taskIds.length) {
      return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
    }

    // Validate all tasks belong to the same workspace and user has access
    const workspaceIds = new Set(tasks.map(t => t.workspaceId));
    if (workspaceIds.size !== 1) {
      return NextResponse.json({ error: "Tasks must belong to the same workspace" }, { status: 400 });
    }

    const workspaceId = tasks[0].workspaceId;
    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Validate project access for each task
    const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
    const allProjectsAccessible = tasks.every(t => accessibleProjectIds.includes(t.projectId));
    if (!allProjectsAccessible) {
      return NextResponse.json({ error: "Access denied to one or more tasks" }, { status: 403 });
    }

    const deleted = await prisma.task.deleteMany({
      where: {
        id: { in: taskIds },
        workspaceId,
      }
    });

    // Log activity
    const { createActivity } = await import("@/lib/activity");
    await createActivity(
      user.id,
      workspaceId,
      "deleted",
      "task",
      taskIds[0],
      { taskIds, count: taskIds.length },
      tasks[0].projectId
    );

    // Notify via Ably
    const workspaceChannel = getWorkspaceChannel(workspaceId);
    await publishToChannel(workspaceChannel, "task:deleted", { taskIds });

    if (tasks[0].boardId) {
      const boardChannel = getBoardChannel(workspaceId, tasks[0].boardId);
      await publishToChannel(boardChannel, "task:deleted", { taskIds });
    }

    return NextResponse.json({ success: true, count: deleted.count });
  } catch (error) {
    console.error("[TASK_BULK_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
