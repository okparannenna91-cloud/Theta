import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { requireProjectAccess, requireProjectWriteAccess } from "@/lib/project-permissions";
import { createSprint } from "@/lib/services/sprint-service";

const listSprintsSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  projectId: z.string().min(1, "projectId is required"),
  status: z.string().optional(),
});

const createSprintSchema = z.object({
  name: z.string().min(1, "name is required"),
  projectId: z.string().min(1, "projectId is required"),
  workspaceId: z.string().min(1, "workspaceId is required"),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()),
  goal: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const params = Object.fromEntries(searchParams.entries());

    const parsed = listSprintsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { workspaceId, projectId, status } = parsed.data;

    const accessCheck = await requireProjectAccess(user.id, projectId, workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    const { prisma } = await import("@/lib/prisma");

    const where: Record<string, unknown> = { projectId };
    if (status) {
      where.status = status;
    }

    const sprints = await prisma.sprint.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    return NextResponse.json(sprints);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("GET /api/sprints error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSprintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, projectId, workspaceId, startDate, endDate, goal } = parsed.data;

    const accessCheck = await requireProjectWriteAccess(user.id, projectId, workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    const { prisma } = await import("@/lib/prisma");

    const overlappingSprint = await prisma.sprint.findFirst({
      where: {
        projectId,
        status: "ACTIVE",
      },
    });

    if (overlappingSprint) {
      return NextResponse.json(
        { error: "An active sprint already exists for this project" },
        { status: 409 }
      );
    }

    const sprint = await createSprint({
      name,
      projectId,
      workspaceId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      goal,
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("POST /api/sprints error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
