import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { enforcePlanLimit, getPlanLimits } from "@/lib/plan-limits";
import { getProjectCount } from "@/lib/usage-tracking";
import { getAccessibleProjectIds } from "@/lib/project-permissions";
import { createActivity } from "@/lib/activity";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color").optional(),
  coverImage: z.string().url("Cover image must be a valid URL").optional().or(z.literal("")),
  visibility: z.enum(["private", "team_access", "workspace_visible"]).optional().default("private"),
  teamId: z.string().optional(),
  workspaceId: z.string(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const teamId = searchParams.get("teamId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Explicit workspaceId is required for multi-tenant isolation." },
        { status: 400 }
      );
    }

    // Verify workspace access
    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to workspace" },
        { status: 403 }
      );
    }


    let whereClause: any = { workspaceId };

    // Filter by project permissions
    const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);

    if (teamId) {
      // Verify team membership
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      whereClause = { workspaceId, teamId, id: { in: accessibleProjectIds } };
    } else {
      whereClause = { workspaceId, id: { in: accessibleProjectIds } };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        tasks: {
            select: { status: true, dueDate: true }
        },
        team: {
            include: {
                members: { select: { userId: true, role: true } }
            }
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Manually resolve User Data across shards
    const allUserIds = new Set<string>();
    projects.forEach((p: any) => {
        p.team?.members?.forEach((m: any) => allUserIds.add(m.userId));
        allUserIds.add(p.userId);
    });

    const users = await prisma.user.findMany({
        where: { id: { in: Array.from(allUserIds) } },
        select: { id: true, name: true, imageUrl: true }
    });
    
    const userMap = new Map(users.map(u => [u.id, u]));

    const enrichedProjects = projects.map((p: any) => ({
        ...p,
        user: userMap.get(p.userId) || null,
        team: p.team ? {
            ...p.team,
            members: p.team.members.map((m: any) => ({
                ...m,
                user: userMap.get(m.userId) || null
            }))
        } : null
    }));

    // Calculate limits
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { plan: true }
    });
    const plan = (workspace?.plan as any) || "free";
    const planLimits = getPlanLimits(plan);

    return NextResponse.json({
        projects: enrichedProjects,
        limits: {
            max: planLimits.maxProjects,
            current: enrichedProjects.length,
            hasAccess: true // Project creation is allowed on all plans, just limited by count
        }
    });
  } catch (error) {
    console.error("Projects API error:", error);
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
    const data = projectSchema.parse(body);

    // Verify workspace access
    const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to workspace" },
        { status: 403 }
      );
    }



    // Get workspace metadata from primary shard
    const workspace = await prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      select: { plan: true },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Get project count from correct shard
    const projectCount = await getProjectCount(data.workspaceId);

    // Check plan limits strictly
    try {
      await enforcePlanLimit(data.workspaceId, "projects", projectCount);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (data.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: data.teamId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Access denied to team" },
          { status: 403 }
        );
      }

      // Verify team belongs to workspace
      const team = await prisma.team.findFirst({
        where: { id: data.teamId, workspaceId: data.workspaceId },
      });

      if (!team) {
        return NextResponse.json(
          { error: "Team not found in workspace" },
          { status: 404 }
        );
      }
    }

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        coverImage: data.coverImage,
        visibility: data.visibility,
        workspaceId: data.workspaceId,
        userId: user.id,
        teamId: data.teamId || null,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    // Log activity
    await createActivity(
      user.id,
      data.workspaceId,
      "created",
      "project",
      project.id,
      {
        projectName: project.name,
      }
    );

    return NextResponse.json(project);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Create project critical error:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

