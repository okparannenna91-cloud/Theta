import { prisma } from "@/lib/prisma";

export interface LogActivityProps {
  userId: string;
  workspaceId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  projectId?: string;
}

/**
 * Modern object-based logging function
 */
export async function logActivity({
  userId,
  workspaceId,
  action,
  entityType,
  entityId,
  metadata,
  projectId
}: LogActivityProps) {
  try {
    await prisma.activity.create({
      data: {
        userId,
        workspaceId,
        action,
        entityType,
        entityId,
        projectId,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw - activity logging shouldn't break the main flow
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
  metadata?: any,
  projectId?: string
) {
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
