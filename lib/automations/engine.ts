import { logger } from "@/lib/logger";

// ──────────────────────────────────────────────
//  UNIFIED AUTOMATION ENGINE
//  Single entry point for all trigger firing.
//  Queries matching rules and fires Inngest events.
//  Execution is handled by automation-executor.ts.
// ──────────────────────────────────────────────

export type AutomationTrigger =
  | "TASK_CREATED"
  | "TASK_STATUS_UPDATED"
  | "TASK_COMPLETED"
  | "TASK_ASSIGNED"
  | "TASK_PRIORITY_CHANGED"
  | "DUE_DATE_PASSED"
  | "PROJECT_CREATED"
  | "SPRINT_STARTED"
  | "SPRINT_COMPLETED"
  | "FORM_SUBMITTED"
  | "DOCUMENT_UPDATED"
  | "USER_INVITED"
  | "MEMBER_ADDED";

export interface TriggerContext {
  workspaceId: string;
  userId?: string;
  taskId?: string;
  projectId?: string;
  taskTitle?: string;
  taskStatus?: string;
  taskPriority?: string;
  assigneeId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  [key: string]: unknown;
}

/**
 * Fire all matching automation rules for a given trigger.
 * Each matching rule gets its own Inngest event for async, retryable execution.
 */
export async function processAutomations(
  workspaceId: string,
  trigger: AutomationTrigger,
  context: Omit<TriggerContext, "workspaceId"> & { workspaceId?: string },
): Promise<void> {
  logger.info(`[AutomationEngine] Disabled — Nova is in observation mode. Trigger=${trigger} workspace=${workspaceId}`);
}
