import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, getPrismaClient } from "@/lib/prisma";
import { PlanName } from "@/lib/plan-limits";
import { canAccessProjectResource, getAccessibleProjectIds } from "@/lib/project-permissions";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const search = searchParams.get("search");
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "20");

    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      include: { workspace: true }
    });

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { getPlanLimits } = await import("@/lib/plan-limits");
    const limits = getPlanLimits(membership.workspace.plan as any);

    const where: any = { workspaceId };

    if (limits.activityHistoryDays !== -1) {
      const { subDays } = await import("date-fns");
      const cutoffDate = subDays(new Date(), limits.activityHistoryDays);
      where.createdAt = { gte: cutoffDate };
    }

    // Project access filtering
    if (projectId) {
      const hasProjectAccess = await canAccessProjectResource(user.id, workspaceId, projectId);
      if (!hasProjectAccess) {
        return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
      }
      where.projectId = projectId;
    } else {
      const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
      where.OR = [
        { projectId: null },
        { projectId: { in: accessibleProjectIds } }
      ];
    }

    // Additional filters
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (search) {
      // Combine with existing project OR filter using AND
      const searchOr = [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } }
      ];
      where.AND = [
        { OR: where.OR },
        { OR: searchOr }
      ];
      delete where.OR;
    }

    const db = getPrismaClient(workspaceId);

    const [activitiesRaw, total] = await Promise.all([
      db.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
            project: { select: { name: true, color: true } }
        }
      }),
      db.activity.count({ where })
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
