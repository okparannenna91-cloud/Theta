import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const milestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  projectId: z.string().optional(),
  dueDate: z.string().datetime(),
  color: z.string().optional(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).default("planned"),
  taskIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id },
    });
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: any = { workspaceId };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const milestones = await prisma.milestone.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, imageUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    const allTaskIds = [...new Set(milestones.flatMap((m) => m.taskIds))];
    const linkedTasks =
      allTaskIds.length > 0
        ? await prisma.task.findMany({
            where: { id: { in: allTaskIds } },
            select: { id: true, title: true, status: true, progress: true, dueDate: true },
          })
        : [];
    const tasksById = new Map(linkedTasks.map((t) => [t.id, t]));

    const milestonesWithTasks = milestones.map((m) => ({
      ...m,
      tasks: m.taskIds.map((id) => tasksById.get(id)).filter(Boolean),
    }));

    return NextResponse.json(milestonesWithTasks);
  } catch (error) {
    console.error("Get milestones error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = milestoneSchema.parse(body);

    if (!data.projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const hasAccess = await prisma.projectMember.findFirst({
      where: { projectId: data.projectId, userId: user.id },
    });
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const workspace = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { workspaceId: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const milestone = await prisma.milestone.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        workspaceId: workspace.workspaceId,
        ownerId: user.id,
        dueDate: new Date(data.dueDate),
        color: data.color || "#f59e0b",
        status: data.status,
        taskIds: data.taskIds || [],
      },
      include: {
        owner: { select: { id: true, name: true, imageUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });

    if (data.taskIds && data.taskIds.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: data.taskIds } },
        data: { isMilestone: true },
      });
    }

    return NextResponse.json(milestone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors.map((e) => e.message).join(", ") }, { status: 400 });
    }
    console.error("Create milestone error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}