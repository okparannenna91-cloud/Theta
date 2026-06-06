import { PERMISSION_MATRIX, SENSITIVE_ACTIONS, AUDIT_LOGGING_REQUIREMENTS, AI_SECURITY_RULES, SECURITY_PRIORITY_ORDER, hasPermission, type SecurityRole, type ResourceType, type SecurityAction as ConstitutionSecurityAction } from "./constitution/security";
import { logger } from "../logger";

export { type SecurityRole } from "./constitution/security";

export type PermissionCheckAction = ConstitutionSecurityAction;

export interface PermissionCheckOptions {
  userId: string;
  workspaceId: string;
  action: PermissionCheckAction;
  resourceType: ResourceType;
}

export class SecurityGuard {
  public static async validate(options: PermissionCheckOptions): Promise<boolean> {
    const { userId, workspaceId, action, resourceType } = options;
    const { getPrismaClient } = await import("../prisma");
    const db = getPrismaClient(workspaceId);

    const membership = await db.workspaceMember.findFirst({
      where: { workspaceId, userId, status: "active" },
    });

    if (!membership) {
      logger.warn(`Access Denied: User ${userId} is not a member of workspace ${workspaceId}`);
      return false;
    }

    const role = membership.role.toLowerCase() as SecurityRole;
    return hasPermission(role, resourceType, action);
  }

  public static async enforce(options: PermissionCheckOptions): Promise<void> {
    const isAllowed = await this.validate(options);
    if (!isAllowed) {
      throw new Error(
        `Security Exception: Unauthorized access to ${options.action} on ${options.resourceType}`
      );
    }
  }

  public static getSecurityRules() {
    return {
      sensitiveActions: SENSITIVE_ACTIONS,
      auditRequirements: AUDIT_LOGGING_REQUIREMENTS,
      aiSecurityRules: AI_SECURITY_RULES,
      priorityOrder: SECURITY_PRIORITY_ORDER,
    };
  }

  public static getPermissionMatrix() {
    return PERMISSION_MATRIX;
  }
}
