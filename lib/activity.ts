import { prisma } from "@/lib/prisma";

export interface LogActivityProps {
  userId: string;
  workspaceId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  projectId?: string;
}

/**
 * Log an activity entry and publish to Ably for real-time updates.
 * Returns true if successful, false if logging failed.
 */
export async function logActivity({
  userId,
  workspaceId,
  action,
  entityType,
  entityId,
  metadata,
  projectId
}: LogActivityProps): Promise<boolean> {
  try {
    await prisma.activity.create({
      data: {
        userId,
        workspaceId,
        action,
        entityType,
        entityId,
        projectId,
        metadata: metadata as any || {},
      },
    });

    await publishActivityToAbly(workspaceId, {
      userId,
      action,
      entityType,
      entityId,
      metadata,
      projectId,
    });

    return true;
  } catch (error) {
    console.error("Failed to log activity:", error);
    return false;
  }
}

/**
 * Publish activity event to the workspace Ably channel for real-time feeds.
 */
async function publishActivityToAbly(
  workspaceId: string,
  data: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    projectId?: string;
  }
): Promise<void> {
  try {
    const { publishToChannel, getWorkspaceChannel } = await import("@/lib/ably");
    const channelName = getWorkspaceChannel(workspaceId);
    await publishToChannel(channelName, "activity:created", {
      ...data,
      workspaceId,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Ably publish failure should not break activity logging
  }
}

/**
 * Resolve a valid userId for webhook-originated activities.
 * Falls back to workspace owner, then admin, rather than using "system" string.
 */
export async function resolveWebhookUserId(workspaceId: string): Promise<string | null> {
  try {
    const owner = await prisma.workspaceMember.findFirst({
      where: { workspaceId, role: "owner" },
      select: { userId: true },
    });
    if (owner) return owner.userId;

    const admin = await prisma.workspaceMember.findFirst({
      where: { workspaceId, role: "admin" },
      select: { userId: true },
    });
    return admin?.userId || null;
  } catch {
    return null;
  }
}

/**
 * Backward compatibility wrapper for createActivity
 * Maps positional arguments to the new object-based logActivity signature.
 */
export async function createActivity(
  userId: string,
  workspaceId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
  projectId?: string
): Promise<boolean> {
  return logActivity({
    userId,
    workspaceId,
    action,
    entityType,
    entityId,
    metadata,
    projectId
  });
}
