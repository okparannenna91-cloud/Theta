import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { publishToChannel, getWorkspaceChannel } from "@/lib/ably";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; predecessorId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId, predecessorId } = params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { project: { select: { workspaceId: true } } },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const workspaceId = task.project.workspaceId;
    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [taskInfo, predecessor] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } }),
      prisma.task.findUnique({ where: { id: predecessorId }, select: { projectId: true } }),
    ]);

    if (!taskInfo || !predecessor) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const hasTaskAccess = await canAccessProjectResource(user.id, workspaceId, taskInfo.projectId);
    const hasPredAccess = await canAccessProjectResource(user.id, workspaceId, predecessor.projectId);
    if (!hasTaskAccess || !hasPredAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.taskDependency.delete({
      where: {
        taskId_predecessorId: {
          taskId,
          predecessorId,
        },
      },
    });

    const workspaceChannel = getWorkspaceChannel(workspaceId);
    await publishToChannel(workspaceChannel, "task:dependency:deleted", { taskId, predecessorId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete dependency error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
