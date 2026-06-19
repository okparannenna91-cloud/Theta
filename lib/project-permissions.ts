import { prisma, getPrismaClient } from "./prisma";
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
    const db = workspaceId ? getPrismaClient(workspaceId) : null;

    let project: any = null;

    if (db) {
      project = await db.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          teamId: true,
          visibility: true,
        },
      });
    }

    if (!project) {
      const { findAcrossShards } = await import("./prisma");
      const result = await findAcrossShards<any>("project", {
        id: projectId,
      });
      project = result.data;
    }

    if (!project) {
      return { hasAccess: false, reason: "Project not found" };
    }

    const targetWorkspaceId = project.workspaceId;

    // Check workspace membership and role
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

    // Workspace Owner or Admin always have access
    if (membership.role === "owner" || membership.role === "admin") {
      return { hasAccess: true };
    }

    // Direct project member (creator/owner)
    if (project.userId === userId) {
      return { hasAccess: true };
    }

    // Check team membership through linked teams
    const projectDb = db || getPrismaClient(targetWorkspaceId);

    const projectTeams = await projectDb.projectTeam.findMany({
      where: { projectId: project.id },
      select: { teamId: true },
    });

    if (projectTeams.length > 0) {
      const teamIds = projectTeams.map((pt: any) => pt.teamId);
      const teamMember = await projectDb.teamMember.findFirst({
        where: {
          teamId: { in: teamIds },
          userId,
        },
      });

      if (teamMember) {
        return { hasAccess: true };
      }
    }

    // Also check the legacy teamId field on the project
    if (project.teamId) {
      const teamMember = await projectDb.teamMember.findUnique({
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

    // For workspace_visible projects, all workspace members have access
    const visibility = project.visibility || "private";
    if (visibility === "workspace_visible") {
      return { hasAccess: true };
    }

    // For team_access, only team members get access (already checked above)
    if (visibility === "team_access") {
      return { hasAccess: false, reason: "Not a member of a linked team" };
    }

    // Private project - no access
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
        const db = getPrismaClient(workspaceId);

        const membership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId },
          },
        });

        if (!membership) return [];

        if (membership.role === "owner" || membership.role === "admin") {
          const allProjects = await db.project.findMany({
            where: { workspaceId },
            select: { id: true },
          });
          return allProjects.map((p: any) => p.id);
        }

        const [ownProjects, teamMemberships, visibleProjects] = await Promise.all([
          db.project.findMany({ where: { workspaceId, userId }, select: { id: true } }),
          db.teamMember.findMany({ where: { userId }, select: { teamId: true } }),
          db.project.findMany({ where: { workspaceId, visibility: "workspace_visible" }, select: { id: true } }),
        ]);

        const ownProjectIds = ownProjects.map((p: any) => p.id);
        const visibleProjectIds = visibleProjects.map((p: any) => p.id);
        const teamIds = teamMemberships.map((tm: any) => tm.teamId);

        let teamLinkedProjectIds: string[] = [];
        let legacyTeamProjectIds: string[] = [];

        if (teamIds.length > 0) {
          const [teamLinked, legacyLinked] = await Promise.all([
            db.projectTeam.findMany({ where: { teamId: { in: teamIds } }, select: { projectId: true } }),
            db.project.findMany({ where: { workspaceId, teamId: { in: teamIds } }, select: { id: true } }),
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
    30,
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
