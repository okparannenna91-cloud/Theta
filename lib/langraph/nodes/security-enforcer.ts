import { logger } from "@/lib/logger";
import type { SecurityAction, ResourceType } from "@/lib/nova/constitution/security";

export async function enforcePermission(userId: string, workspaceId: string, action: SecurityAction, resourceType: ResourceType, projectId?: string): Promise<void> {
  const { SecurityGuard } = await import("@/lib/nova/security-guard");
  await SecurityGuard.enforce({ userId, workspaceId, action, resourceType, projectId });
}

export async function getAccessibleProjectIds(userId: string, workspaceId: string): Promise<string[]> {
  const { getAccessibleProjectIds: getIds } = await import("@/lib/project-permissions");
  return getIds(userId, workspaceId);
}
