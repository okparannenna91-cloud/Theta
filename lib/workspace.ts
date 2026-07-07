import { prisma } from "./prisma";
import { logger } from "./logger";
import { cacheGetOrSet, cacheKey, cacheInvalidate, cacheInvalidatePattern } from "@/lib/cache";

// L1: Proper TypeScript interfaces for workspace objects
export interface WorkspaceWithCounts {
    id: string;
    name: string;
    slug: string;
    plan: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        members: number;
        projects: number;
    };
}

export interface WorkspaceMemberResponse {
    id: string;
    name: string | null;
    email: string;
    imageUrl: string | null;
    role: string;
}

export interface CreateWorkspaceResult {
    id: string;
    name: string;
    slug: string;
    plan: string;
    members: any[];
    [key: string]: any;
}

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
      logger.error("Get current workspace error:", error);
    return null;
  }
}

/**
 * Require the user to be an owner or admin of the workspace (for billing mutations).
 */
export async function requireWorkspaceAdmin(
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
      select: { role: true },
    });

    if (!membership) return false;
    const role = membership.role.toLowerCase();
    return role === "owner" || role === "admin";
  } catch (error) {
    logger.error("Require workspace admin error:", error);
    return false;
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
    const membership = await cacheGetOrSet(
      cacheKey("member", workspaceId, userId),
      () => prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      }),
      30,
    );

    if (!membership) {
      logger.warn(`Access denied for user ${userId} to workspace ${workspaceId}. No membership found.`);
    }
    return !!membership;
  } catch (error) {
    logger.error("Verify workspace access error:", error);
    return false;
  }
}

/**
 * Create a new workspace for a user
 *
 * Uses a two-step create to avoid Prisma MongoDB nested-create issues:
 * 1. Create workspace document
 * 2. Create membership document separately
 * 3. If membership fails, rollback by deleting the workspace
 */
export async function createWorkspace(
  userId: string,
  name: string,
  plan: string = "free"
) {
  // Generate a unique slug from the name
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const finalBaseSlug = baseSlug || "workspace";

  let slug = finalBaseSlug;
  let counter = 1;
  const MAX_SLUG_RETRIES = 1000;

  // Ensure slug is unique (with max retry to prevent infinite loops)
  while (counter <= MAX_SLUG_RETRIES) {
    try {
      const existing = await prisma.workspace.findUnique({ where: { slug } });
      if (!existing) break;
    } catch (findError: any) {
      logger.error(`[createWorkspace] Slug uniqueness check failed for "${slug}": code=${findError.code}, message=${findError.message}`);
      throw new Error(
        `Database error during slug check. Prisma error code: ${findError.code || "unknown"}. ` +
        `Message: ${findError.message || findError}`
      );
    }
    slug = `${finalBaseSlug}-${counter}`;
    counter++;
  }

  if (counter > MAX_SLUG_RETRIES) {
    throw new Error(`Unable to generate unique slug for workspace "${name}" after ${MAX_SLUG_RETRIES} attempts`);
  }

  logger.info(`[createWorkspace] Step 1: Creating workspace: name="${name}", slug="${slug}", userId="${userId}"`);

  // Step 1: Create workspace document (no nested membership create)
  let workspace: any;
  try {
    workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        plan,
      },
    });
  } catch (createError: any) {
    logger.error(`[createWorkspace] Step 1 FAILED - workspace create error: code=${createError.code}, message=${createError.message}`, createError);
    throw new Error(
      `Failed to create workspace document. Prisma error code: ${createError.code || "unknown"}. ` +
      `Message: ${createError.message || createError}`
    );
  }

  logger.info(`[createWorkspace] Workspace created: id="${workspace.id}", slug="${workspace.slug}"`);

  // Step 2: Create membership document separately
  try {
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: "owner",
      },
    });
    logger.info(`[createWorkspace] Membership created: workspaceId="${workspace.id}", userId="${userId}", role="owner"`);
  } catch (memberError: any) {
    // Rollback: delete the workspace if membership creation fails
    logger.error(`[createWorkspace] Step 2 FAILED - Membership creation failed, rolling back workspace "${workspace.id}": code=${memberError.code}, message=${memberError.message}`, memberError);
    try {
      await prisma.workspace.delete({ where: { id: workspace.id } });
      logger.warn(`[createWorkspace] Workspace "${workspace.id}" deleted after rollback`);
    } catch (rollbackError: any) {
      logger.error(`[createWorkspace] Rollback delete also failed for workspace "${workspace.id}": code=${rollbackError.code}, message=${rollbackError.message}`, rollbackError);
    }
    throw new Error(
      `Failed to create workspace membership. Prisma error code: ${memberError.code || "unknown"}. ` +
      `Message: ${memberError.message || memberError}`
    );
  }

  // Step 3: Create default statuses
  try {
    await prisma.status.createMany({
      data: [
        { workspaceId: workspace.id, name: "Todo", color: "#64748b", order: 0 },
        { workspaceId: workspace.id, name: "In Progress", color: "#3b82f6", order: 1 },
        { workspaceId: workspace.id, name: "Done", color: "#22c55e", order: 2 },
      ]
    });
    logger.info(`[createWorkspace] Default statuses created for workspace "${workspace.id}"`);
  } catch (statusError: any) {
    logger.error(`[createWorkspace] Step 3 FAILED - default statuses for workspace "${workspace.id}": code=${statusError.code}, message=${statusError.message}`, statusError);
    // Rollback: delete workspace and membership if status creation fails
    try {
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
      await prisma.workspace.delete({ where: { id: workspace.id } });
    } catch (rollbackError: any) {
      logger.error(`[createWorkspace] Rollback after status failure also failed for workspace "${workspace.id}": code=${rollbackError.code}, message=${rollbackError.message}`, rollbackError);
    }
    throw new Error(
      `Failed to create default statuses for workspace. Prisma error code: ${statusError.code || "unknown"}. ` +
      `Message: ${statusError.message || statusError}`
    );
  }

  // Step 4: Fetch final workspace with members included for the response
  let result: any;
  try {
    result = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: { members: true },
    });
  } catch (fetchError: any) {
    logger.error(`[createWorkspace] Step 4 FAILED - final fetch for workspace "${workspace.id}": code=${fetchError.code}, message=${fetchError.message}`, fetchError);
    throw new Error(
      `Failed to fetch created workspace. Prisma error code: ${fetchError.code || "unknown"}. ` +
      `Message: ${fetchError.message || fetchError}`
    );
  }

  logger.info(`[createWorkspace] Complete: id="${workspace.id}", name="${name}", members=${result?.members?.length || 0}`);
  return result;
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
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (memberships.length === 0) {
      logger.warn(`[getUserWorkspaces] No workspace memberships found for user ${userId}`);
      return [];
    }

    logger.info(`[getUserWorkspaces] Found ${memberships.length} memberships for user ${userId}`);

    // Batch fetch project counts for all workspaces in a single query
    const workspaceIds = memberships.map(m => m.workspaceId);
    const projectCounts = await prisma.project.groupBy({
      by: ["workspaceId"],
      where: { workspaceId: { in: workspaceIds } },
      _count: { id: true },
    });
    const projectCountMap = new Map(projectCounts.map(pc => [pc.workspaceId, pc._count.id]));

    return memberships.map((m) => {
      if (!m.workspace) {
        logger.warn(`Skipping orphaned workspace member record: memberId=${m.id}, workspaceId=${m.workspaceId}`);
        return null;
      }

      return {
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        plan: m.workspace.plan,
        role: m.role,
        createdAt: m.workspace.createdAt,
        updatedAt: m.workspace.updatedAt,
        _count: {
          members: m.workspace._count?.members || 0,
          projects: projectCountMap.get(m.workspaceId) || 0,
        },
      };
    }).filter(Boolean);
  } catch (error) {
    logger.error("[getUserWorkspaces] Error:", error);
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
  try {
    // Workspace members are stored on the central metadata DB (Shard 1)
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
    return membership?.role === "owner" || membership?.role === "admin";
  } catch (error) {
    logger.error("isWorkspaceAdmin error:", error);
    return false;
  }
}

/**
 * Get all members of a workspace
 */
export async function getWorkspaceMembers(workspaceId: string) {
  try {
    // Workspace members are stored on the central metadata DB (Shard 1)
    return await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error("Get workspace members error:", error);
    return [];
  }
}
/**
 * Delete a workspace
 */
export async function deleteWorkspace(workspaceId: string, userId: string, forceDelete = false) {
  try {
    // Verify user is the owner
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || membership.role !== "owner") {
      throw new Error("Only the owner can delete the workspace");
    }

    // Check if it's the user's only workspace
    const otherWorkspaces = await prisma.workspaceMember.findMany({
      where: {
        userId,
        workspaceId: { not: workspaceId },
      },
    });

    if (otherWorkspaces.length === 0 && !forceDelete) {
      throw new Error("This is your only workspace. Set forceDelete=true to confirm deletion.");
    }

    // Delete all workspace-scoped data - schema cascades handle child records
    const where = { workspaceId };

    // Task dependencies need special handling due to self-referencing relations
    const taskIds = (await prisma.task.findMany({ where, select: { id: true } })).map(t => t.id);
    if (taskIds.length > 0) {
        await prisma.taskDependency.deleteMany({
            where: { OR: [{ taskId: { in: taskIds } }, { predecessorId: { in: taskIds } }] }
        });
    }

    // Delete project-scoped data that needs explicit handling
    const projectIds = (await prisma.project.findMany({ where, select: { id: true } })).map(p => p.id);
    if (projectIds.length > 0) {
        await prisma.projectTeam.deleteMany({ where: { projectId: { in: projectIds } } });
    }

    // Delete remaining workspace-scoped data (cascades handle the rest)
    await prisma.workspaceMember.deleteMany({ where });
    await prisma.project.deleteMany({ where });
    await prisma.task.deleteMany({ where });
    await prisma.team.deleteMany({ where });
    await prisma.board.deleteMany({ where });
    await prisma.chatMessage.deleteMany({ where });
    await prisma.activity.deleteMany({ where });
    await prisma.notification.deleteMany({ where });
    await prisma.tag.deleteMany({ where });
    await prisma.status.deleteMany({ where });
    await prisma.automation.deleteMany({ where });
    await prisma.document.deleteMany({ where });
    await prisma.calendarEvent.deleteMany({ where });
    await prisma.invite.deleteMany({ where });
    await prisma.integration.deleteMany({ where });
    await prisma.billingLog.deleteMany({ where });
    await prisma.form.deleteMany({ where });
    await prisma.savedSearch.deleteMany({ where });
    await prisma.evolutionTracking.deleteMany({ where });
    await prisma.paymentMethod.deleteMany({ where });
    await prisma.creditBalance.deleteMany({ where });
    await prisma.subscription.deleteMany({ where });
    await prisma.invoice.deleteMany({ where });

    // Finally, delete the workspace metadata
    const deleted = await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    // M2: Invalidate cache after deletion
    await cacheInvalidatePattern(`cache:member:${workspaceId}:*`);

    return deleted;
  } catch (error) {
    logger.error("Delete workspace error:", error);
    throw error;
  }
}
