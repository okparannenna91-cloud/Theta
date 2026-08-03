import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { getTimeEntries, logTimeManual, deleteTimeEntry } from "@/lib/services/time-tracking";

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

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    if (!(await canAccessTask(user.id, taskId))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const entries = await getTimeEntries(taskId);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Get time entries error:", error);
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
    const { taskId, duration, description } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    if (typeof duration !== "number" || duration <= 0) {
      return NextResponse.json({ error: "duration must be a positive number (seconds)" }, { status: 400 });
    }

    if (!(await canAccessTask(user.id, taskId))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const entry = await logTimeManual(taskId, user.id, duration, description);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Log time error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get("entryId");

    if (!entryId) {
      return NextResponse.json({ error: "entryId is required" }, { status: 400 });
    }

    const entry = await prisma.timeLog.findUnique({
      where: { id: entryId },
      select: { taskId: true },
    });
    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    if (!(await canAccessTask(user.id, entry.taskId))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await deleteTimeEntry(entryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete time entry error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
