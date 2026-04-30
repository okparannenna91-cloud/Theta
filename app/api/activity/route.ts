import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, getPrismaClient } from "@/lib/prisma";
import { PlanName } from "@/lib/plan-limits";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let workspaceId = searchParams.get("workspaceId");
    const entityId = searchParams.get("entityId");
    const entityType = searchParams.get("entityType");

    if (!workspaceId) {
      const workspace = await prisma.workspaceMember.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });
      workspaceId = workspace?.workspaceId || null;
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Verify workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      include: {
        workspace: true
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Apply plan-based activity history limit
    const { getPlanLimits } = await import("@/lib/plan-limits");
    const limits = getPlanLimits(membership.workspace.plan as PlanName);

    const whereClause: any = { workspaceId };

    if (limits.activityHistoryDays !== -1) {
      const { subDays } = await import("date-fns");
      const cutoffDate = subDays(new Date(), limits.activityHistoryDays);
      whereClause.createdAt = { gte: cutoffDate };
    }

    if (entityId) whereClause.entityId = entityId;
    if (entityType) whereClause.entityType = entityType;

    const db = getPrismaClient(workspaceId);

    const rawActivities = await db.activity.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const userIdsToFetch = new Set<string>();
    rawActivities.forEach((a: any) => {
      if (a.userId) userIdsToFetch.add(a.userId);
    });

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIdsToFetch) } },
      select: { name: true, imageUrl: true, id: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const activities = rawActivities.map((a: any) => ({
      ...a,
      user: userMap.get(a.userId) || null
    }));

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Activity API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
