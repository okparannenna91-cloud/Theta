import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, findAcrossShards } from "@/lib/prisma";
import { Project } from "@prisma/client";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    let project: Project | null = null;
    let db: any = null;

    if (workspaceId) {
      const { getPrismaClient } = await import("@/lib/prisma");
      db = getPrismaClient(workspaceId);
      project = await db.project.findUnique({
        where: { id: params.id },
      });
      console.log(`[Project GET] Target lookup with workspaceId=${workspaceId}. Found=${!!project}`);
    }

    if (!project) {
      console.log(`[Project GET] Shard fallback search for projectId=${params.id}...`);
      const result = await findAcrossShards<Project>("project", {
        id: params.id,
      });
      project = result.data;
      db = result.db;
    }

    if (!project) {
      console.error(`[Project GET] 404: Project ${params.id} not found on any shard.`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify workspace access first
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      console.error(`[Project GET] 403: User ${user.id} denied access to workspace ${project.workspaceId}`);
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    console.log(`[Project GET] Loading full relations for project=${project.id} from shard DB...`);
    // Re-fetch project with relations using the specific shard DB found
    const fullProject = await db.project.findUnique({
      where: { id: params.id },
      include: {
        tasks: {
          include: {
            comments: true,
            subtasks: true,
            tags: true,
          }
        },
        boards: {
          include: {
            columns: true,
            _count: { select: { tasks: true } }
          }
        },
        team: {
          include: {
            members: true
          }
        },
        projectTeams: {
          include: {
            team: {
              include: {
                members: true
              }
            }
          }
        },
        _count: { select: { tasks: true } }
      }
    });

    if (!fullProject) {
        return NextResponse.json({ error: "Project details not found" }, { status: 404 });
    }

    // Collect all user IDs needed
    const allUserIds = new Set<string>();
    if (fullProject.userId) allUserIds.add(fullProject.userId);
    fullProject.tasks?.forEach((t: any) => { if (t.userId) allUserIds.add(t.userId); });
    fullProject.team?.members?.forEach((m: any) => { if (m.userId) allUserIds.add(m.userId); });
    fullProject.projectTeams?.forEach((pt: any) => {
        pt.team.members?.forEach((m: any) => { if (m.userId) allUserIds.add(m.userId); });
    });

    // Safeguard: Only query valid MongoDB ObjectIds to prevent BSON errors from legacy data
    const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
    const validUserIds = Array.from(allUserIds).filter(isValidObjectId);

    // Fetch user profiles from the primary shard
    const users = await prisma.user.findMany({
      where: { id: { in: validUserIds } },
      select: {
          id: true,
          name: true,
          imageUrl: true,
          email: true,
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // Manually attach user profiles back
    const processedProject = {
        ...fullProject,
        user: userMap.get(fullProject.userId) || null,
        tasks: fullProject.tasks?.map((t: any) => ({
            ...t,
            user: userMap.get(t.userId) || null
        })) || [],
        team: fullProject.team ? {
            ...fullProject.team,
            members: fullProject.team.members?.map((m: any) => ({
                ...m,
                user: userMap.get(m.userId) || null
            })) || []
        } : null,
        projectTeams: fullProject.projectTeams?.map((pt: any) => ({
            ...pt,
            team: pt.team ? {
                ...pt.team,
                members: pt.team.members?.map((m: any) => ({
                    ...m,
                    user: userMap.get(m.userId) || null
                })) || []
            } : null
        })) || []
    };

    return NextResponse.json(processedProject);  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const { data: project, db } = await findAcrossShards<Project>("project", {
      id: params.id,
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify workspace access (admins/owners or creator)
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updated = await (db as any).project.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Update project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: project, db } = await findAcrossShards<Project>("project", {
      id: params.id,
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify workspace access (admins/owners)
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership || (membership.role !== "owner" && membership.role !== "admin" && project.userId !== user.id)) {
      return NextResponse.json({ error: "Access denied. Only project creators or workspace admins can delete projects." }, { status: 403 });
    }

    await (db as any).project.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

