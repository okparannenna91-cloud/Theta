import { prisma } from "./prisma";
import { cacheGetOrSet, cacheKey } from "@/lib/cache";

export type ProjectVisibility = "private" | "team_access" | "workspace_visible";

interface ProjectAccessResult {
  hasAccess: boolean;
  reason?: string;
}

/**
 * Check if a user has access to a specific project.
 *
 * Access is granted if ANY of the following is true:
 * 1. User is Workspace Owner
 * 2. User is Workspace Admin
 * 3. User is a Direct Project Member (project.userId === user.id)
 * 4. User belongs to a Team linked to the Project
 * 5. Project visibility is "workspace_visible" and user is a workspace member
 *
 * For private projects, only conditions 1-4 apply.
 * For team_access projects, conditions 1-4 apply.
 * For workspace_visible projects, all workspace members have access.
 */
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
      return { hasAccess: false, reason: "Project not found" };
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
      return { hasAccess: false, reason: "Not a workspace member" };
    }

    if (membership.role === "owner" || membership.role === "admin") {
      return { hasAccess: true };
    }

    if (project.userId === userId) {
      return { hasAccess: true };
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
        return { hasAccess: true };
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
        return { hasAccess: true };
      }
    }

    const visibility = project.visibility || "private";
    if (visibility === "workspace_visible") {
      return { hasAccess: true };
    }

    if (visibility === "team_access") {
      return { hasAccess: false, reason: "Not a member of a linked team" };
    }

    return { hasAccess: false, reason: "No direct project access" };
  } catch (error) {
    console.error("canAccessProject error:", error);
    return { hasAccess: false, reason: "Permission check failed" };
  }
}

/**
 * Get all project IDs that a user has access to within a workspace.
 * This is used to filter queries for tasks, boards, documents, etc.
 */
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

        if (membership.role === "owner" || membership.role === "admin") {
          const allProjects = await prisma.project.findMany({
            where: { workspaceId },
            select: { id: true },
          });
          return allProjects.map((p: any) => p.id);
        }

        const [ownProjects, teamMemberships, visibleProjects] = await Promise.all([
          prisma.project.findMany({ where: { workspaceId, userId }, select: { id: true } }),
          prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } }),
          prisma.project.findMany({ where: { workspaceId, visibility: "workspace_visible" }, select: { id: true } }),
        ]);

        const ownProjectIds = ownProjects.map((p: any) => p.id);
        const visibleProjectIds = visibleProjects.map((p: any) => p.id);
        const teamIds = teamMemberships.map((tm: any) => tm.teamId);

        let teamLinkedProjectIds: string[] = [];
        let legacyTeamProjectIds: string[] = [];

        if (teamIds.length > 0) {
          const [teamLinked, legacyLinked] = await Promise.all([
            prisma.projectTeam.findMany({ where: { teamId: { in: teamIds } }, select: { projectId: true } }),
            prisma.project.findMany({ where: { workspaceId, teamId: { in: teamIds } }, select: { id: true } }),
          ]);
          teamLinkedProjectIds = teamLinked.map((pt: any) => pt.projectId);
          legacyTeamProjectIds = legacyLinked.map((p: any) => p.id);
        }

        const accessibleIds = new Set([
          ...ownProjectIds, ...teamLinkedProjectIds,
          ...legacyTeamProjectIds, ...visibleProjectIds,
        ]);

        return Array.from(accessibleIds);
      } catch (error) {
        console.error("getAccessibleProjectIds error:", error);
        return [];
      }
    },
    5,
  );
}

/**
 * For a specific resource (task, board, document, chat, etc.) that belongs to a project,
 * check if the user has access via project permissions.
 * Returns true if the resource has no projectId (workspace-level resource),
 * or if the user can access the associated project.
 */
export async function canAccessProjectResource(
  userId: string,
  workspaceId: string,
  projectId: string | null | undefined
): Promise<boolean> {
  if (!projectId) {
    // Workspace-level resource (no project association)
    // Check basic workspace membership
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

/**
 * Verify project access for API routes. Returns a response-like object
 * with the appropriate error status if access is denied.
 */
export async function requireProjectAccess(
  userId: string,
  projectId: string,
  workspaceId?: string
): Promise<{ allowed: boolean; error?: { status: number; message: string } }> {
  const result = await canAccessProject(userId, projectId, workspaceId);

  if (!result.hasAccess) {
    console.warn(
      `[Permission Denied] User ${userId} tried to access project ${projectId}: ${result.reason}`
    );
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

  return { allowed: true };
}

const ROLE_WEIGHTS: Record<string, number> = {
  owner: 100,
  admin: 50,
  member: 10,
};

export function hasMinRole(userRole: string, requiredRole: string): boolean {
  const userWeight = ROLE_WEIGHTS[userRole] ?? 0;
  const requiredWeight = ROLE_WEIGHTS[requiredRole] ?? 0;
  return userWeight >= requiredWeight;
}

export async function getProjectRole(
  userId: string,
  projectId: string,
  workspaceId: string
): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, userId: true },
  });
  if (!project) return null;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });

  if (membership && hasMinRole(membership.role, "admin")) return "admin";

  if (project.userId === userId) return "admin";

  return membership?.role || null;
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

  if (hasMinRole(role, "admin")) return { allowed: true };

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

  if (hasMinRole(role, "admin")) return { allowed: true };

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
