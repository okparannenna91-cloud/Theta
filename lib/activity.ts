import { prisma } from "@/lib/prisma";

export async function createActivity(
  userId: string,
  workspaceId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: any
) {
  try {
    await prisma.activity.create({
      data: {
        userId,
        workspaceId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error("Failed to create activity:", error);
    // Don't throw - activity logging shouldn't break the main flow
  }
}

