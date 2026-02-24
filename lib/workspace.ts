import { prisma } from "./prisma";
import { User } from "@prisma/client";

/**
 * Get the current user's default or specified workspace
 */
export async function getCurrentWorkspace(
  userId: string,
  workspaceId?: string
) {
  try {
    if (workspaceId) {
      // Verify user has access to this workspace
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        include: {
          workspace: true,
        },
      });

      if (!membership) {
        return null;
      }

      return membership.workspace;
    }

    // Get user's first workspace (default)
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });

    return membership?.workspace || null;
  } catch (error) {
    console.error("Get current workspace error:", error);
    return null;
  }
}

/**
 * Verify user has access to a workspace
 */
export async function verifyWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    return !!membership;
  } catch (error) {
    console.error("Verify workspace access error:", error);
    return false;
  }
}

/**
 * Create a new workspace for a user
 */
export async function createWorkspace(
  userId: string,
  name: string,
  plan: string = "free"
) {
  try {
    // Generate a unique slug from the name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        plan,
        members: {
          create: {
            userId,
            role: "owner",
          },
        },
        statuses: {
          createMany: {
            data: [
              { name: "Todo", color: "#64748b", order: 0 },
              { name: "In Progress", color: "#3b82f6", order: 1 },
              { name: "Done", color: "#22c55e", order: 2 },
            ]
          }
        }
      },
      include: {
        members: true,
      },
    });

    return workspace;
  } catch (error) {
    console.error("Create workspace error:", error);
    throw error;
  }
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(userId: string) {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            tags: true,
            statuses: {
              orderBy: { order: "asc" }
            },
            _count: {
              select: {
                members: true,
                projects: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  } catch (error) {
    console.error("Get user workspaces error:", error);
    return [];
  }
}

/**
 * Get workspace member role
 */
export async function getWorkspaceMemberRole(
  userId: string,
  workspaceId: string
): Promise<string | null> {
  try {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    return membership?.role || null;
  } catch (error) {
    console.error("Get workspace member role error:", error);
    return null;
  }
}

/**
 * Check if user is workspace owner or admin
 */
export async function isWorkspaceAdmin(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const role = await getWorkspaceMemberRole(userId, workspaceId);
  return role === "owner" || role === "admin";
}
