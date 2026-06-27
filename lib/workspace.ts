import { prisma } from "./prisma";
import { User } from "@prisma/client";
import { logger } from "./logger";
import { cacheGetOrSet, cacheKey } from "@/lib/cache";

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

    logger.info(`[createWorkspace] Step 1: Creating workspace: name="${name}", slug="${slug}", userId="${userId}"`);

    // Step 1: Create workspace document (no nested membership create)
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        plan,
      },
    });

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
    } catch (memberError) {
      // Rollback: delete the workspace if membership creation fails
      logger.error(`[createWorkspace] Membership creation failed, rolling back workspace "${workspace.id}":`, memberError);
      try {
        await prisma.workspace.delete({ where: { id: workspace.id } });
        logger.warn(`[createWorkspace] Workspace "${workspace.id}" deleted after rollback`);
      } catch (rollbackError) {
        logger.error(`[createWorkspace] Rollback delete also failed for workspace "${workspace.id}":`, rollbackError);
      }
      throw new Error(`Failed to create workspace membership: ${(memberError as Error).message}`);
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
    } catch (statusError) {
      logger.error(`[createWorkspace] Failed to create default statuses for workspace "${workspace.id}":`, statusError);
    }

    // Fetch final workspace with members included for the response
    const result = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: { members: true },
    });

    logger.info(`[createWorkspace] Complete: id="${workspace.id}", name="${name}", members=${result?.members?.length || 0}`);
    return result;
  } catch (error) {
    logger.error("[createWorkspace] Error:", error);
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

    // Use allSettled so one bad member doesn't crash the entire list
    const results = await Promise.allSettled(
      memberships.map(async (m) => {
        if (!m.workspace) {
          logger.warn(`Skipping orphaned workspace member record: memberId=${m.id}, workspaceId=${m.workspaceId}`);
          return null;
        }

        const workspaceId = m.workspaceId;
        let projectsCount = 0;
        try {
          projectsCount = await prisma.project.count({
            where: { workspaceId },
          });
          logger.debug(`Workspace ${workspaceId} (${m.workspace.name}): ${projectsCount} projects`);
        } catch (countError) {
          logger.error(`Failed to fetch project count for workspace ${workspaceId} on its shard:`, countError);
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
            projects: projectsCount,
          },
        };
      })
    );

    const workspacesWithCounts: any[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value !== null) {
        workspacesWithCounts.push(result.value);
      } else if (result.status === "rejected") {
        logger.error("Failed to process workspace member:", result.reason);
      }
    }

    logger.info(`[getUserWorkspaces] Returning ${workspacesWithCounts.length} workspaces for user ${userId}`);

    return workspacesWithCounts;
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
export async function deleteWorkspace(workspaceId: string, userId: string) {
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

    if (otherWorkspaces.length === 0) {
      throw new Error("You must have at least one workspace. Create another one before deleting this one.");
    }

    // Delete all workspace-scoped data
    const where = { workspaceId };

    const [tasks, boards, forms, teams] = await Promise.all([
        prisma.task.findMany({ where, select: { id: true } }),
        prisma.board.findMany({ where, select: { id: true } }),
        prisma.form.findMany({ where, select: { id: true } }),
        prisma.team.findMany({ where, select: { id: true } }),
    ]);

    const taskIds = tasks.map((t: any) => t.id);
    const boardIds = boards.map((b: any) => b.id);
    const formIds = forms.map((f: any) => f.id);
    const teamIds = teams.map((t: any) => t.id);

    await Promise.all([
        taskIds.length > 0 ? prisma.subtask.deleteMany({ where: { taskId: { in: taskIds } } }) : Promise.resolve(),
        taskIds.length > 0 ? prisma.comment.deleteMany({ where: { taskId: { in: taskIds } } }) : Promise.resolve(),
        taskIds.length > 0 ? prisma.timeLog.deleteMany({ where: { taskId: { in: taskIds } } }) : Promise.resolve(),
        taskIds.length > 0 ? prisma.taskDependency.deleteMany({ 
            where: { OR: [{ taskId: { in: taskIds } }, { predecessorId: { in: taskIds } }] } 
        }) : Promise.resolve(),
        boardIds.length > 0 ? prisma.column.deleteMany({ where: { boardId: { in: boardIds } } }) : Promise.resolve(),
        formIds.length > 0 ? prisma.formResponse.deleteMany({ where: { formId: { in: formIds } } }) : Promise.resolve(),
        teamIds.length > 0 ? prisma.teamMember.deleteMany({ where: { teamId: { in: teamIds } } }) : Promise.resolve(),
    ]);

    await Promise.all([
        prisma.project.deleteMany({ where }),
        prisma.task.deleteMany({ where }),
        prisma.team.deleteMany({ where }),
        prisma.board.deleteMany({ where }),
        prisma.chatMessage.deleteMany({ where }),
        prisma.activity.deleteMany({ where }),
        prisma.notification.deleteMany({ where }),
        prisma.tag.deleteMany({ where }),
        prisma.status.deleteMany({ where }),
        prisma.automation.deleteMany({ where }),
        prisma.document.deleteMany({ where }),
        prisma.calendarEvent.deleteMany({ where }),
        prisma.invite.deleteMany({ where }),
        prisma.integration.deleteMany({ where }),
        prisma.billingLog.deleteMany({ where }),
        prisma.form.deleteMany({ where }),
    ]);

    // Finally, delete the workspace metadata
    return await prisma.workspace.delete({
      where: { id: workspaceId },
    });
  } catch (error) {
    logger.error("Delete workspace error:", error);
    throw error;
  }
}
