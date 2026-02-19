import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateTeam, getPlanLimitMessage } from "@/lib/plan-limits";
import { z } from "zod";

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

    const teams = await prisma.team.findMany({
      where: {
        workspaceId,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                lastActiveAt: true,
              },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      teams.map((team: any) => ({
        ...team,
        membersCount: team._count.members,
        userRole: team.members.find((m: any) => m.userId === user.id)?.role || "member",
      }))
    );
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
        include: { _count: { select: { teams: true } } }
      });
      if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

      const { enforcePlanLimit } = await import("@/lib/plan-limits");
      await enforcePlanLimit(workspaceId, "teams", workspace._count.teams);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const team = await prisma.team.create({
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
