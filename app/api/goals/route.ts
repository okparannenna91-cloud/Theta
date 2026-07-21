import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getGoalsForWorkspace, createGoal } from "@/lib/services/goals-service";

const listGoalsSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  projectId: z.string().optional(),
  status: z.string().optional(),
});

const createGoalSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  type: z.enum(["okr", "milestone", "target"]).optional(),
  ownerId: z.string().min(1, "ownerId is required"),
  projectId: z.string().optional(),
  workspaceId: z.string().min(1, "workspaceId is required"),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const params = Object.fromEntries(searchParams.entries());

    const parsed = listGoalsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { workspaceId, projectId, status } = parsed.data;

    const workspace = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const goals = await getGoalsForWorkspace(workspaceId, {
      projectId,
      status,
    });

    const { getPlanLimits, isValidPlan } = await import("@/lib/plan-limits");
    const planWorkspace = await import("@/lib/prisma").then(m => m.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } }));
    const planName = isValidPlan(planWorkspace?.plan ?? "") ? (planWorkspace?.plan as "free" | "growth" | "pro" | "theta_plus") : "free";
    const limits = getPlanLimits(planName);

    return NextResponse.json({
      goals,
      limits: {
        max: (limits as any).maxGoals ?? -1,
        current: goals.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("GET /api/goals error:", error);
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
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const {
      title,
      description,
      type,
      ownerId,
      projectId,
      workspaceId,
      startDate,
      endDate,
    } = parsed.data;

    const workspace = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const goal = await createGoal({
      title,
      description,
      type,
      ownerId,
      projectId,
      workspaceId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("POST /api/goals error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
