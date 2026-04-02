import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateTeam, getPlanLimitMessage } from "@/lib/plan-limits";
import { z } from "zod";
export const dynamic = "force-dynamic";

const teamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  workspaceId: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Explicit workspaceId is required for multi-tenant isolation." },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { getPrismaClient } = await import("@/lib/prisma");
    const db = getPrismaClient(workspaceId);

    const teams = await db.team.findMany({
      where: {
        workspaceId,
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
          }
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Manually resolve user data for the members from Shard 1
    const allUserIds = [...new Set(teams.flatMap(t => t.members.map(m => m.userId)))];
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        lastActiveAt: true,
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const teamsWithUsers = teams.map(team => ({
      ...team,
      membersCount: team._count.members,
      userRole: team.members.find(m => m.userId === user.id)?.role || "member",
      members: team.members.map(m => ({
        ...m,
        user: userMap.get(m.userId) || null
      }))
    }));

    // Calculate counts
    const count = await db.team.count({ where: { workspaceId } });
    const memberCount = await prisma.workspaceMember.count({ where: { workspaceId } });
    const pendingInvites = await prisma.invite.count({ where: { workspaceId, status: "pending" } });

    const { getPlanLimits } = await import("@/lib/plan-limits");
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { plan: true }
    });

    const plan = workspace?.plan || "free";
    const limits = getPlanLimits(plan as any);

    return NextResponse.json({
        teams: teamsWithUsers,
        limits: {
            max: limits.maxTeams,
            current: count,
        },
        memberLimits: {
            max: limits.maxMembers,
            current: memberCount + pendingInvites,
        }
    });
  } catch (error) {
    console.error("Teams API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const result = teamSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description, workspaceId } = result.data;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Explicit workspaceId is required for creation. No loose tenant assignment allowed." },
        { status: 400 }
      );
    }

    const { getPrismaClient } = await import("@/lib/prisma");
    const db = getPrismaClient(workspaceId);

    // Verify workspace membership (admin/owner to create teams?)
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership || (membership.role !== "admin" && membership.role !== "owner")) {
      return NextResponse.json({ error: "Access denied. Only workspace admins can create teams." }, { status: 403 });
    }

    // Check plan limits strictly
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { plan: true }
      });
      if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

      const { getTeamCount } = await import("@/lib/usage-tracking");
      const teamCount = await getTeamCount(workspaceId);

      const { enforcePlanLimit } = await import("@/lib/plan-limits");
      await enforcePlanLimit(workspaceId, "teams", teamCount);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const team = await db.team.create({
      data: {
        name,
        description,
        workspaceId,
        members: {
          create: {
            userId: user.id,
            role: "admin",
          },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return NextResponse.json({
      ...team,
      membersCount: team._count.members,
    });
  } catch (error) {
    console.error("Create team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
