import { PERMISSION_MATRIX, SENSITIVE_ACTIONS, AUDIT_LOGGING_REQUIREMENTS, AI_SECURITY_RULES, SECURITY_PRIORITY_ORDER, hasPermission, type SecurityRole, type ResourceType, type SecurityAction as ConstitutionSecurityAction } from "./constitution/security";
import { logger } from "../logger";
import { cacheGetOrSet, cacheKey } from "@/lib/cache";

export { type SecurityRole } from "./constitution/security";

export type PermissionCheckAction = ConstitutionSecurityAction;

export interface PermissionCheckOptions {
  userId: string;
  workspaceId: string;
  action: PermissionCheckAction;
  resourceType: ResourceType;
  projectId?: string;
}

const MAX_ENFORCE_FAILURES = 10;
const ENFORCE_WINDOW_SECONDS = 60;
const enforceFailures: Map<string, { count: number; windowStart: number }> = new Map();

function isEnforceLocked(userId: string): boolean {
  const record = enforceFailures.get(userId);
  if (!record) return false;
  if (Date.now() - record.windowStart > ENFORCE_WINDOW_SECONDS * 1000) {
    enforceFailures.delete(userId);
    return false;
  }
  return record.count >= MAX_ENFORCE_FAILURES;
}

function recordEnforceFailure(userId: string): void {
  const record = enforceFailures.get(userId) || { count: 0, windowStart: Date.now() };
  record.count++;
  enforceFailures.set(userId, record);
}

export class SecurityGuard {
  public static async validate(options: PermissionCheckOptions): Promise<boolean> {
    const { userId, workspaceId, action, resourceType, projectId } = options;

    if (isEnforceLocked(userId)) {
      logger.error(`Security lock active for user ${userId} — too many failures`);
      return false;
    }

    const { getPrismaClient } = await import("../prisma");

    const membership = await cacheGetOrSet(
      cacheKey("member", workspaceId, userId),
      async () => {
        const db = getPrismaClient(workspaceId);
        return db.workspaceMember.findFirst({
          where: { workspaceId, userId, status: "active" },
        });
      },
      30,
    );

    if (!membership) {
      logger.warn(`Access Denied: User ${userId} is not a member of workspace ${workspaceId}`);
      return false;
    }

    if (membership.workspaceId !== workspaceId) {
      logger.error(`Security violation: User ${userId} attempted cross-workspace access to ${workspaceId}`);
      return false;
    }

    const role = membership.role.toLowerCase() as SecurityRole;
    const hasBasePermission = hasPermission(role, resourceType, action);
    if (!hasBasePermission) {
      logger.warn(`Permission Denied: User ${userId} role ${role} lacks ${action} on ${resourceType}`);
      return false;
    }

    if (projectId) {
      const { canAccessProject } = await import("../project-permissions");
      const access = await canAccessProject(userId, projectId, workspaceId);
      if (!access.hasAccess) {
        logger.warn(`Access Denied: User ${userId} has no access to project ${projectId}`);
        return false;
      }
    }

    return true;
  }

  public static async enforce(options: PermissionCheckOptions): Promise<void> {
    const { userId } = options;
    const isAllowed = await this.validate(options);
    if (!isAllowed) {
      recordEnforceFailure(userId);
      throw new Error(
        `Security Exception: Unauthorized access to ${options.action} on ${options.resourceType}`
      );
    }
  }

  public static async validateWithContext(options: PermissionCheckOptions & { inputText?: string }): Promise<{ allowed: boolean; risk: "low" | "medium" | "high"; reason?: string }> {
    const allowed = await this.validate(options);
    if (!allowed) return { allowed: false, risk: "high", reason: "Permission denied" };

    const isSensitive = SENSITIVE_ACTIONS.some((sa: string) => sa.toLowerCase().includes(options.resourceType));
    if (isSensitive) {
      return { allowed: true, risk: "high", reason: "Sensitive action — requires confirmation" };
    }

    if (options.inputText && detectPromptInjection(options.inputText)) {
      return { allowed: false, risk: "high", reason: "Prompt injection detected" };
    }

    return { allowed: true, risk: "low" };
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

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|commands?|directions?|prompts?)/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|commands?|directions?|prompts?)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|commands?|directions?|prompts?)/i,
  /you\s+are\s+(now|no\s+longer)\s+/i,
  /system\s+prompt/i,
  /new\s+instructions?:\s*/i,
  /override\s+(mode|protocol|instructions)/i,
  /act\s+as\s+(if\s+you\s+are|though\s+you\s+are)\s+/i,
  /your\s+(new|updated|revised)\s+(instructions?|role|persona)/i,
  /output\s+(only|just|exclusively)\s+/i,
  /do\s+not\s+(output|print|include|display)\s+/i,
  /dangerous\s+(action|tool|command|operation)/i,
];

const SECRET_PATTERNS = [
  /(?:api[_-]?key|secret|token|password|private[_-]?key)\s*[=:]\s*['"][^'"]+['"]/i,
  /sk_live_/,
  /sk_test_/,
  /ghp_[a-zA-Z0-9]{36}/,
  /AKIA[0-9A-Z]{16}/,
];

export function detectPromptInjection(input: string): boolean {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      logger.warn(`[SecurityGuard] Prompt injection pattern matched: ${pattern}`);
      return true;
    }
  }
  return false;
}

export function detectSecretLeakage(output: string): boolean {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(output)) {
      logger.error(`[SecurityGuard] Secret leakage detected in output`);
      return true;
    }
  }
  return false;
}
