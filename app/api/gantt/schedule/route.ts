import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { calculateSchedules } from "@/lib/scheduling/scheduling-engine";
import type { TaskData } from "@/lib/scheduling/scheduling-engine";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const body = await req.json();

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const access = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      include: {
        predecessors: { select: { predecessorId: true, type: true, lag: true } },
      },
    });

    const workingDays = body.workingDays || {
      monday: true, tuesday: true, wednesday: true, thursday: true,
      friday: true, saturday: false, sunday: false,
    };

    const holidays = body.holidays || [];

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

    const scheduledTasks = calculateSchedules(taskDataList, {
      workingDays,
      holidays,
      workingHourStart: 9,
      workingHourEnd: 17,
    });

    let updatedCount = 0;
    for (const st of scheduledTasks) {
      if (st.schedulingMode !== "auto") continue;
      const original = tasks.find((t: any) => t.id === st.id);
      if (!original) continue;
      const origStart = original.startDate ? new Date(original.startDate).getTime() : 0;
      const origEnd = original.dueDate ? new Date(original.dueDate).getTime() : 0;
      const newStart = st.startDate ? st.startDate.getTime() : 0;
      const newEnd = st.dueDate ? st.dueDate.getTime() : 0;
      if (Math.abs(origStart - newStart) > 60000 || Math.abs(origEnd - newEnd) > 60000) {
        await prisma.task.update({
          where: { id: st.id },
          data: {
            startDate: st.startDate || original.startDate,
            dueDate: st.dueDate || original.dueDate,
          },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Recalculated schedules for ${updatedCount} auto-scheduled tasks`,
    });
  } catch (error) {
    console.error("Failed to recalculate schedules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}