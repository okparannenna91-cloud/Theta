import { prisma, getPrismaClient } from "./prisma";
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
      },
      include: {
        members: true,
      },
    });

    // Create default statuses on the correct shard (where tasks will live)
    try {
      const db = getPrismaClient(workspace.id);
      await db.status.createMany({
        data: [
          { workspaceId: workspace.id, name: "Todo", color: "#64748b", order: 0 },
          { workspaceId: workspace.id, name: "In Progress", color: "#3b82f6", order: 1 },
          { workspaceId: workspace.id, name: "Done", color: "#22c55e", order: 2 },
        ]
      });
    } catch (statusError) {
      console.error("Failed to create default statuses on shard:", statusError);
      // We don't throw here to avoid failing workspace creation if status setup fails
    }

    return workspace;
  } catch (error) {
    logger.error("Create workspace error:", error);
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
      logger.warn(`No workspace memberships found for user ${userId}`);
      return [];
    }

    // Fetch project counts from correct shards
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
          const db = getPrismaClient(workspaceId);
          projectsCount = await db.project.count({
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

    return workspacesWithCounts;
  } catch (error) {
    logger.error("Get user workspaces error:", error);
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

    // Multi-shard cleanup: Delete all workspace-scoped data across all shards
    // This is necessary because Cascade deletes don't work across different DB clusters
    const { getPrismaClient } = await import("./prisma");
    const shards = [1, 2, 3, 4].map(i => {
        // We use a try-catch for each shard to ensure one failure doesn't block the rest
        try {
            // This is a bit hacky but works given our getPrismaClient logic
            // We need to target each shard's connection specifically
            // Since our hashing is based on workspaceId, we can't easily "iterate shards" via getPrismaClient(workspaceId)
            // But we have access to the underlying prismaShardX clients in prisma.ts
            return true;
        } catch(e) { return false; }
    });

    // Actually, a better way is to iterate over the actual shards we have initialized
    const { prismaShard1, prismaShard2, prismaShard3 } = await import("./prisma");
    const allShards = [prismaShard1, prismaShard2, prismaShard3].filter(Boolean);

    await Promise.all(allShards.map(async (shard: any) => {
        try {
            // Delete workspace-scoped entities on this shard
            const where = { workspaceId };
            
            // 1. Fetch parent IDs for entities that have children without workspaceId
            const [tasks, boards, forms, teams] = await Promise.all([
                shard.task.findMany({ where, select: { id: true } }),
                shard.board.findMany({ where, select: { id: true } }),
                shard.form.findMany({ where, select: { id: true } }),
                shard.team.findMany({ where, select: { id: true } }),
            ]);

            const taskIds = tasks.map((t: any) => t.id);
            const boardIds = boards.map((b: any) => b.id);
            const formIds = forms.map((f: any) => f.id);
            const teamIds = teams.map((t: any) => t.id);

            // 2. Delete child entities first
            await Promise.all([
                taskIds.length > 0 ? shard.subtask.deleteMany({ where: { taskId: { in: taskIds } } }) : Promise.resolve(),
                taskIds.length > 0 ? shard.comment.deleteMany({ where: { taskId: { in: taskIds } } }) : Promise.resolve(),
                taskIds.length > 0 ? shard.timeLog.deleteMany({ where: { taskId: { in: taskIds } } }) : Promise.resolve(),
                taskIds.length > 0 ? shard.taskDependency.deleteMany({ 
                    where: { OR: [{ taskId: { in: taskIds } }, { predecessorId: { in: taskIds } }] } 
                }) : Promise.resolve(),
                boardIds.length > 0 ? shard.column.deleteMany({ where: { boardId: { in: boardIds } } }) : Promise.resolve(),
                formIds.length > 0 ? shard.formResponse.deleteMany({ where: { formId: { in: formIds } } }) : Promise.resolve(),
                teamIds.length > 0 ? shard.teamMember.deleteMany({ where: { teamId: { in: teamIds } } }) : Promise.resolve(),
            ]);

            // 3. Delete workspace-scoped entities
            await Promise.all([
                shard.project.deleteMany({ where }),
                shard.task.deleteMany({ where }),
                shard.team.deleteMany({ where }),
                shard.board.deleteMany({ where }),
                shard.chatMessage.deleteMany({ where }),
                shard.activity.deleteMany({ where }),
                shard.notification.deleteMany({ where }),
                shard.tag.deleteMany({ where }),
                shard.status.deleteMany({ where }),
                shard.automation.deleteMany({ where }),
                shard.document.deleteMany({ where }),
                shard.calendarEvent.deleteMany({ where }),
                shard.invite.deleteMany({ where }),
                shard.integration.deleteMany({ where }),
                shard.billingLog.deleteMany({ where }),
                shard.form.deleteMany({ where }),
                shard.projectTeam.deleteMany({ where }),
            ]);
        } catch (shardError) {
            logger.error(`Failed to cleanup shard during workspace deletion:`, shardError);
        }
    }));

    // Finally, delete the workspace metadata from Shard 1
    return await prisma.workspace.delete({
      where: { id: workspaceId },
    });
  } catch (error) {
    logger.error("Delete workspace error:", error);
    throw error;
  }
}
