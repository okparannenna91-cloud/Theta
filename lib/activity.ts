import { getPrismaClient } from "@/lib/prisma";

export interface LogActivityProps {
  userId: string;
  workspaceId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  projectId?: string;
}

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
    const db = getPrismaClient(workspaceId);
    await db.activity.create({
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

