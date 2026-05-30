import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient, prisma as globalPrisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { z } from "zod";

const linkTeamSchema = z.object({
  teamIds: z.array(z.string()),
  role: z.enum(["full_access", "editor", "viewer", "custom"]).optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getPrismaClient(workspaceId);
    
    // Find project teams
    const projectTeams = await db.projectTeam.findMany({
      where: { projectId: params.id },
      include: {
        team: {
          include: {
            members: {
                select: { userId: true, role: true }
            },
            _count: { select: { members: true } }
          }
        }
      }
    });

    // Resolve user data for team members
    const allUserIds = new Set<string>();
    projectTeams.forEach(pt => {
        pt.team?.members?.forEach(m => allUserIds.add(m.userId));
    });

    const users = await globalPrisma.user.findMany({
        where: { id: { in: Array.from(allUserIds) } },
        select: { id: true, name: true, imageUrl: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const enrichedTeams = projectTeams.map(pt => {
        if (!pt.team) return null;
        return {
            ...pt.team,
            projectRole: pt.role,
            dateAdded: pt.createdAt,
            members: pt.team.members?.map(m => ({
                ...m,
                user: userMap.get(m.userId) || null
            })) || []
        };
    }).filter(Boolean);

    return NextResponse.json(enrichedTeams);
  } catch (error) {
    console.error("Project teams GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { teamIds, role = "viewer" } = linkTeamSchema.parse(body);

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getPrismaClient(workspaceId);

    // Create project teams
    const results = await Promise.all(
        teamIds.map(async (teamId) => {
            return db.projectTeam.upsert({
                where: {
                    projectId_teamId: {
                        projectId: params.id,
                        teamId
                    }
                },
                update: { role },
                create: {
                    projectId: params.id,
                    teamId,
                    role
                }
            });
        })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Project teams POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get("teamId");
        const workspaceId = searchParams.get("workspaceId");

        if (!teamId || !workspaceId) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const db = getPrismaClient(workspaceId);

        await db.projectTeam.delete({
            where: {
                projectId_teamId: {
                    projectId: params.id,
                    teamId
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Project teams DELETE error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
