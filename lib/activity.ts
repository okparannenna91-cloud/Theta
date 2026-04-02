import { getPrismaClient } from "@/lib/prisma";

export async function createActivity(
  userId: string,
  workspaceId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: any
) {
  try {
    const db = getPrismaClient(workspaceId);
    await db.activity.create({
      data: {
        userId,
        workspaceId,
        action,
        entityType,
        entityId,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error("Failed to create activity:", error);
    // Don't throw - activity logging shouldn't break the main flow
  }
}

