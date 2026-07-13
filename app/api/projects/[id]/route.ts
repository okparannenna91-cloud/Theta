import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireProjectWriteAccess } from "@/lib/project-permissions";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color").optional(),
  coverImage: z.string().url("Cover image must be a valid URL").optional().or(z.literal("")),
  visibility: z.enum(["private", "team_access", "workspace_visible"]).optional(),
  teamId: z.string().optional().nullable(),
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

    const project = await prisma.project.findUnique({
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

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const access = await requireProjectAccess(user.id, project.id, project.workspaceId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error!.message },
        { status: access.error!.status }
      );
    }

    const allUserIds = new Set<string>();
    if (project.userId) allUserIds.add(project.userId);
    project.tasks?.forEach((t: any) => { if (t.userId) allUserIds.add(t.userId); });
    project.team?.members?.forEach((m: any) => { if (m.userId) allUserIds.add(m.userId); });
    project.projectTeams?.forEach((pt: any) => {
        pt.team.members?.forEach((m: any) => { if (m.userId) allUserIds.add(m.userId); });
    });

    const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
    const validUserIds = Array.from(allUserIds).filter(isValidObjectId);

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

    const processedProject = {
        ...project,
        user: userMap.get(project.userId) || null,
        tasks: project.tasks?.map((t: any) => ({
            ...t,
            user: userMap.get(t.userId) || null
        })) || [],
        team: project.team ? {
            ...project.team,
            members: project.team.members?.map((m: any) => ({
                ...m,
                user: userMap.get(m.userId) || null
            })) || []
        } : null,
        projectTeams: project.projectTeams?.map((pt: any) => ({
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

    return NextResponse.json(processedProject);
  } catch (error) {
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

    const project = await prisma.project.findUnique({ where: { id: params.id } });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const access = await requireProjectWriteAccess(user.id, project.id, project.workspaceId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error!.message },
        { status: access.error!.status }
      );
    }

    const updated = await prisma.project.update({
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

    const project = await prisma.project.findUnique({ where: { id: params.id } });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const access = await requireProjectAccess(user.id, project.id, project.workspaceId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error!.message },
        { status: access.error!.status }
      );
    }

    // Check delete permission: workspace owner/admin, project creator, or projectTeams full_access
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: user.id,
        },
      },
    });

    const isWorkspaceAdmin = membership && (membership.role === "owner" || membership.role === "admin");
    const isProjectCreator = project.userId === user.id;

    if (!isWorkspaceAdmin && !isProjectCreator) {
      // Check if user has full_access via projectTeams
      const projectTeam = await prisma.projectTeam.findFirst({
        where: {
          projectId: params.id,
          role: "full_access",
          team: {
            members: {
              some: { userId: user.id },
            },
          },
        },
      });
      if (!projectTeam) {
        return NextResponse.json({ error: "Access denied. Only project creators or workspace admins can delete projects." }, { status: 403 });
      }
    }

    await prisma.task.deleteMany({
        where: { projectId: params.id }
    });

    await prisma.project.delete({
      where: { id: params.id },
    });

    // Notify via Ably
    const { getWorkspaceChannel, publishToChannel } = await import("@/lib/ably");
    const workspaceChannel = getWorkspaceChannel(project.workspaceId);
    await publishToChannel(workspaceChannel, "project:deleted", { id: params.id });

    // Log Activity
    const { logActivity } = await import("@/lib/activity");
    await logActivity({
        userId: user.id,
        workspaceId: project.workspaceId,
        action: "deleted",
        entityType: "project",
        entityId: params.id,
        metadata: { entityName: project.name, name: project.name }
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

