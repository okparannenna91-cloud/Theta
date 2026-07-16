import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { calculateSchedules, detectCriticalPath, calculateSlack } from "@/lib/scheduling/scheduling-engine";
import type { TaskData } from "@/lib/scheduling/scheduling-engine";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const projectId = searchParams.get("projectId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const access = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where: any = { workspaceId };
    if (projectId) where.projectId = projectId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, imageUrl: true } },
        project: { select: { id: true, name: true } },
        predecessors: {
          include: { predecessor: { select: { id: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const taskDataList: TaskData[] = tasks.map((t: any) => ({
      id: t.id,
      startDate: t.startDate ? new Date(t.startDate) : null,
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      durationMinutes: t.startDate && t.dueDate
        ? Math.max(60, (new Date(t.dueDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60))
        : 480,
      schedulingMode: (t.schedulingMode as "auto" | "manual") || "auto",
      predecessors: (t.predecessors || []).map((p: any) => ({
        predecessorId: p.predecessorId,
        type: (p.type as any) || "FS",
        lagMinutes: (p.lag || 0) * 60,
      })),
    }));

    const scheduledTasks = calculateSchedules(taskDataList);
    const criticalPath = detectCriticalPath(taskDataList);
    const slackMap = calculateSlack(taskDataList);

    const enrichedTasks = tasks.map((t: any, i: number) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      taskType: t.taskType,
      startDate: t.startDate,
      dueDate: t.dueDate,
      progress: t.progress || 0,
      isMilestone: t.isMilestone,
      isSummary: t.isSummary,
      parentId: t.parentId,
      color: t.color,
      schedulingMode: t.schedulingMode,
      baselineStartDate: t.baselineStartDate,
      baselineDueDate: t.baselineDueDate,
      estimatedHours: t.estimatedHours,
      assigneeIds: t.assigneeIds || [],
      user: t.user,
      project: t.project,
      isCritical: criticalPath.has(t.id),
      slack: slackMap.get(t.id) || 0,
      predecessors: (t.predecessors || []).map((p: any) => ({
        id: p.id,
        predecessorId: p.predecessorId,
        type: p.type,
        lag: p.lag,
      })),
    }));

    return NextResponse.json({ tasks: enrichedTasks });
  } catch (error) {
    console.error("Failed to fetch gantt data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
