import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { getActiveTimer, startTimer, stopTimer } from "@/lib/services/time-tracking";

async function canAccessTask(userId: string, taskId: string): Promise<boolean> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, workspaceId: true, projectId: true },
  });
  if (!task) return false;
  const hasWorkspaceAccess = await verifyWorkspaceAccess(userId, task.workspaceId);
  if (!hasWorkspaceAccess) return false;
  return canAccessProjectResource(userId, task.workspaceId, task.projectId);
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timer = await getActiveTimer(user.id);
    return NextResponse.json({ timer });
  } catch (error) {
    console.error("Get active timer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, description } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    if (!(await canAccessTask(user.id, taskId))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const timer = await startTimer({ taskId, userId: user.id, description });
    return NextResponse.json(timer, { status: 201 });
  } catch (error) {
    console.error("Start timer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { timerId } = body;

    if (!timerId) {
      return NextResponse.json({ error: "timerId is required" }, { status: 400 });
    }

    const timer = await prisma.timeLog.findUnique({
      where: { id: timerId },
      select: { userId: true, taskId: true },
    });
    if (!timer) {
      return NextResponse.json({ error: "Timer not found" }, { status: 404 });
    }
    if (timer.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (!(await canAccessTask(user.id, timer.taskId))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const stopped = await stopTimer(timerId);
    return NextResponse.json(stopped);
  } catch (error) {
    console.error("Stop timer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
