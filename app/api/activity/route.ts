import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProjectResource, getAccessibleProjectIds } from "@/lib/project-permissions";
import { z } from "zod";

const querySchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  search: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
});

function parseSkipTake(val: string | null, def: number): number {
  const n = parseInt(val || String(def), 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams.entries());
    const parsed = querySchema.safeParse(rawParams);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const {
      workspaceId,
      projectId,
      userId,
      entityType,
      entityId,
      search,
      action,
      startDate,
      endDate,
    } = parsed.data;

    const skip = parseSkipTake(searchParams.get("skip"), 0);
    const take = Math.min(parseSkipTake(searchParams.get("take"), 20), 100);

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      include: { workspace: true }
    });

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { getPlanLimits, isValidPlan } = await import("@/lib/plan-limits");
    const rawPlan = membership.workspace.plan || "free";
    const planName = isValidPlan(rawPlan) ? rawPlan : "free";
    const limits = getPlanLimits(planName);

    const where: Record<string, unknown> = { workspaceId };

    if (limits.activityHistoryDays !== -1) {
      const { subDays } = await import("date-fns");
      const cutoffDate = subDays(new Date(), limits.activityHistoryDays);
      where.createdAt = { gte: cutoffDate };
    }

    if (startDate) {
      where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), lte: new Date(endDate) };
    }

    // Project access filtering
    const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);

    if (projectId) {
      if (!accessibleProjectIds.includes(projectId)) {
        return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
      }
      where.projectId = projectId;
    } else {
      where.OR = [
        { projectId: null },
        { projectId: { in: accessibleProjectIds } }
      ];
    }

    // Additional filters
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;

    if (search) {
      const searchOr = [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR as Array<Record<string, unknown>> },
          { OR: searchOr },
        ];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    const [activitiesRaw, total] = await Promise.all([
      prisma.activity.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
            project: { select: { name: true, color: true } }
        }
      }),
      prisma.activity.count({ where: where as any })
    ]);

    const userIds = Array.from(new Set(activitiesRaw.map(a => a.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, imageUrl: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const activities = activitiesRaw.map(a => ({
      ...a,
      user: userMap.get(a.userId) || null
    }));

    return NextResponse.json({
      activities,
      total,
      hasMore: skip + take < total
    });
  } catch (error) {
    console.error("Activity GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
