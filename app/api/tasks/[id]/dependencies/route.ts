import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { z } from "zod";
import { publishToChannel, getWorkspaceChannel } from "@/lib/ably";
import { TaskIntelligence } from "@/lib/nova/task-intelligence";

const bodySchema = z.object({
  predecessorId: z.string(),
  type: z.enum(["FS", "SS", "FF", "SF"]).default("FS"),
  lag: z.number().default(0),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taskId = params.id;
    const body = await req.json();
    const data = bodySchema.parse(body);

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

    if (taskId === data.predecessorId) {
      return NextResponse.json({ error: "Cannot create self-dependency" }, { status: 400 });
    }

    const hasCycle = await TaskIntelligence.hasDependencyCycle(workspaceId, taskId, data.predecessorId);
    if (hasCycle) {
      return NextResponse.json({ error: "Circular dependency detected" }, { status: 400 });
    }

    const [taskInfo, predecessor] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } }),
      prisma.task.findUnique({ where: { id: data.predecessorId }, select: { projectId: true } }),
    ]);

    if (!taskInfo || !predecessor) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const hasTaskAccess = await canAccessProjectResource(user.id, workspaceId, taskInfo.projectId);
    const hasPredAccess = await canAccessProjectResource(user.id, workspaceId, predecessor.projectId);
    if (!hasTaskAccess || !hasPredAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        taskId,
        predecessorId: data.predecessorId,
        type: data.type,
        lag: data.lag,
      },
      include: {
        task: true,
        predecessor: true,
      },
    });

    const workspaceChannel = getWorkspaceChannel(workspaceId);
    await publishToChannel(workspaceChannel, "task:dependency:created", dependency);

    const { createActivity } = await import("@/lib/activity");
    await createActivity(
      user.id,
      workspaceId,
      "linked",
      "task",
      taskId,
      {
        predecessorId: data.predecessorId,
        type: data.type,
      }
    );

    return NextResponse.json(dependency);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Create dependency error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
