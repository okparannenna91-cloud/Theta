import { prisma } from "./prisma";
import { cacheGetOrSet, cacheKey } from "@/lib/cache";

export type WorkspaceRole = "owner" | "admin" | "member" | "guest";
export type ProjectRole = "manager" | "editor" | "contributor" | "viewer";
export type ProjectVisibility = "private" | "team_access" | "workspace_visible";

export const WORKSPACE_ROLE_HIERARCHY: Record<string, number> = {
  owner: 100,
  admin: 50,
  member: 10,
  guest: 1,
};

export const PROJECT_ROLE_HIERARCHY: Record<string, number> = {
  manager: 100,
  editor: 50,
  contributor: 20,
  viewer: 10,
};

function meetsMinRoleWeight(
  userRole: string | null | undefined,
  requiredRole: string,
  hierarchy: Record<string, number>
): boolean {
  const userWeight = hierarchy[userRole ?? ""] ?? 0;
  const requiredWeight = hierarchy[requiredRole] ?? 0;
  return userWeight >= requiredWeight;
}

export function hasMinWorkspaceRole(
  userRole: string | null | undefined,
  requiredRole: WorkspaceRole
): boolean {
  return meetsMinRoleWeight(userRole, requiredRole, WORKSPACE_ROLE_HIERARCHY);
}

export function hasMinProjectRole(
  userRole: string | null | undefined,
  requiredRole: ProjectRole
): boolean {
  return meetsMinRoleWeight(userRole, requiredRole, PROJECT_ROLE_HIERARCHY);
}

interface ProjectAccessResult {
  hasAccess: boolean;
  reason?: string;
  projectRole?: ProjectRole | null;
  workspaceRole?: WorkspaceRole | null;
}

export async function canAccessProject(
  userId: string,
  projectId: string,
  workspaceId?: string
): Promise<ProjectAccessResult> {
  try {
    const project: any = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        teamId: true,
        visibility: true,
      },
    });

    if (!project) {
      return { hasAccess: false, reason: "Project not found", projectRole: null, workspaceRole: null };
    }

    const targetWorkspaceId = project.workspaceId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: targetWorkspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      return { hasAccess: false, reason: "Not a workspace member", projectRole: null, workspaceRole: null };
    }

    const workspaceRole = membership.role as WorkspaceRole;

    if (hasMinWorkspaceRole(workspaceRole, "admin")) {
      return { hasAccess: true, projectRole: "manager", workspaceRole };
    }

    const projectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: project.id, userId },
      },
    });

    if (projectMember) {
      return { hasAccess: true, projectRole: projectMember.role as ProjectRole, workspaceRole };
    }

    if (project.userId === userId) {
      return { hasAccess: true, projectRole: "manager", workspaceRole };
    }

    const projectTeams = await prisma.projectTeam.findMany({
      where: { projectId: project.id },
      select: { teamId: true },
    });

    if (projectTeams.length > 0) {
      const teamIds = projectTeams.map((pt: any) => pt.teamId);
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: { in: teamIds },
          userId,
        },
      });

      if (teamMember) {
        return { hasAccess: true, projectRole: "viewer", workspaceRole };
      }
    }

    if (project.teamId) {
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: project.teamId,
            userId,
          },
        },
      });

      if (teamMember) {
        return { hasAccess: true, projectRole: "viewer", workspaceRole };
      }
    }

    const visibility = project.visibility || "private";
    if (visibility === "workspace_visible") {
      return { hasAccess: true, projectRole: "viewer", workspaceRole };
    }

    if (visibility === "team_access") {
      return { hasAccess: false, reason: "Not a member of a linked team", projectRole: null, workspaceRole };
    }

    return { hasAccess: false, reason: "No direct project access", projectRole: null, workspaceRole };
  } catch (error) {
    console.error("canAccessProject error:", error);
    return { hasAccess: false, reason: "Permission check failed", projectRole: null, workspaceRole: null };
  }
}

export async function getAccessibleProjectIds(
  userId: string,
  workspaceId: string
): Promise<string[]> {
  return cacheGetOrSet(
    cacheKey("accessible", userId, workspaceId),
    async () => {
      try {
        const membership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId },
          },
        });

        if (!membership) return [];

        const workspaceRole = membership.role as WorkspaceRole;

        if (hasMinWorkspaceRole(workspaceRole, "admin")) {
          const allProjects = await prisma.project.findMany({
            where: { workspaceId },
            select: { id: true },
          });
          return allProjects.map((p: any) => p.id);
        }

        const [ownProjects, projectMemberships, teamMemberships, visibleProjects] = await Promise.all([
          prisma.project.findMany({ where: { workspaceId, userId }, select: { id: true } }),
          prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
          prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } }),
          prisma.project.findMany({ where: { workspaceId, visibility: "workspace_visible" }, select: { id: true } }),
        ]);

        const accessibleIds = new Set<string>();

        ownProjects.forEach((p: any) => accessibleIds.add(p.id));
        projectMemberships.forEach((pm: any) => accessibleIds.add(pm.projectId));

        const teamIds = teamMemberships.map((tm: any) => tm.teamId);
        if (teamIds.length > 0) {
          const [teamLinked, legacyLinked] = await Promise.all([
            prisma.projectTeam.findMany({ where: { teamId: { in: teamIds } }, select: { projectId: true } }),
            prisma.project.findMany({ where: { workspaceId, teamId: { in: teamIds } }, select: { id: true } }),
          ]);
          teamLinked.forEach((pt: any) => accessibleIds.add(pt.projectId));
          legacyLinked.forEach((p: any) => accessibleIds.add(p.id));
        }

        visibleProjects.forEach((p: any) => accessibleIds.add(p.id));

        return Array.from(accessibleIds);
      } catch (error) {
        console.error("getAccessibleProjectIds error:", error);
        return [];
      }
    },
    5,
  );
}

export async function canAccessProjectResource(
  userId: string,
  workspaceId: string,
  projectId: string | null | undefined
): Promise<boolean> {
  if (!projectId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
    return !!membership;
  }

  const result = await canAccessProject(userId, projectId, workspaceId);
  return result.hasAccess;
}

export async function requireProjectAccess(
  userId: string,
  projectId: string,
  workspaceId?: string
): Promise<{ allowed: boolean; role?: ProjectRole; error?: { status: number; message: string } }> {
  const result = await canAccessProject(userId, projectId, workspaceId);

  if (!result.hasAccess) {
    return {
      allowed: false,
      error: {
        status: 403,
        message: result.reason === "Project not found"
          ? "Project not found"
          : "Access denied to this project",
      },
    };
  }

  return { allowed: true, role: result.projectRole ?? undefined };
}

export async function getProjectRole(
  userId: string,
  projectId: string,
  workspaceId: string
): Promise<ProjectRole | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, userId: true },
  });
  if (!project) return null;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });

  if (membership && hasMinWorkspaceRole(membership.role, "admin")) return "manager";

  const projectMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (projectMember) return projectMember.role as ProjectRole;

  if (project.userId === userId) return "manager";

  const projectTeam = await prisma.projectTeam.findFirst({
    where: {
      projectId,
      team: { members: { some: { userId } } },
    },
  });

  if (projectTeam) return "viewer";

  return null;
}

export async function requireProjectWriteAccess(
  userId: string,
  projectId: string,
  workspaceId?: string
): Promise<{ allowed: boolean; error?: { status: number; message: string } }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, userId: true },
  });
  if (!project) {
    return { allowed: false, error: { status: 404, message: "Project not found" } };
  }

  const wsId = workspaceId || project.workspaceId;
  const role = await getProjectRole(userId, projectId, wsId);

  if (!role) {
    return { allowed: false, error: { status: 403, message: "Access denied" } };
  }

  if (hasMinProjectRole(role, "contributor")) return { allowed: true };

  const projectTeam = await prisma.projectTeam.findFirst({
    where: {
      projectId,
      role: { in: ["full_access", "editor"] },
      team: { members: { some: { userId } } },
    },
  });

  if (projectTeam) return { allowed: true };

  return { allowed: false, error: { status: 403, message: "Write access denied" } };
}

export async function requireProjectAdminAccess(
  userId: string,
  projectId: string,
  workspaceId?: string
): Promise<{ allowed: boolean; error?: { status: number; message: string } }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, userId: true },
  });
  if (!project) {
    return { allowed: false, error: { status: 404, message: "Project not found" } };
  }

  const wsId = workspaceId || project.workspaceId;
  const role = await getProjectRole(userId, projectId, wsId);

  if (!role) {
    return { allowed: false, error: { status: 403, message: "Access denied" } };
  }

  if (hasMinProjectRole(role, "manager")) return { allowed: true };

  const projectTeam = await prisma.projectTeam.findFirst({
    where: {
      projectId,
      role: "full_access",
      team: { members: { some: { userId } } },
    },
  });

  if (projectTeam) return { allowed: true };

  return { allowed: false, error: { status: 403, message: "Admin access denied" } };
}

export async function getWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRole | null> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return (membership?.role as WorkspaceRole) ?? null;
}
