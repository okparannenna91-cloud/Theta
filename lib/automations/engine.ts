import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { evaluateConditions, matchesProjectScope } from "@/lib/automations/conditions";
import { isNovaEnabled } from "@/lib/nova/config";

let _novaInitialized = false;
async function ensureNovaInitialized(): Promise<void> {
  if (!isNovaEnabled() || _novaInitialized) return;
  const { ObservationPipeline } = await import("@/lib/nova/ambient/observation-pipeline");
  _novaInitialized = true;
  ObservationPipeline.initialize({ startGlobalHeartbeat: false });
  logger.debug("[AutomationEngine] Nova ambient pipeline initialized");
}

// ──────────────────────────────────────────────
//  UNIFIED AUTOMATION ENGINE
//  Single entry point for all trigger firing.
//  1) Optionally feeds the Nova ambient observation pipeline (if enabled).
//  2) Dispatches matching automation rules to the
//     Inngest executor (project-scoped + condition-aware).
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

const TRIGGER_TO_EVENT: Record<AutomationTrigger, string> = {
  TASK_CREATED: "task:created",
  TASK_STATUS_UPDATED: "task:updated",
  TASK_COMPLETED: "task:completed",
  TASK_ASSIGNED: "task:assigned",
  TASK_PRIORITY_CHANGED: "task:updated",
  DUE_DATE_PASSED: "deadline:passed",
  PROJECT_CREATED: "project:created",
  SPRINT_STARTED: "sprint:started",
  SPRINT_COMPLETED: "sprint:updated",
  FORM_SUBMITTED: "comment:created",
  DOCUMENT_UPDATED: "workspace:updated",
  USER_INVITED: "member:joined",
  MEMBER_ADDED: "member:joined",
};

export interface TriggerContext {
  workspaceId: string;
  trigger?: string;
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

async function emitToNova(
  workspaceId: string,
  trigger: AutomationTrigger,
  context: Omit<TriggerContext, "workspaceId"> & { workspaceId?: string },
): Promise<void> {
  if (!isNovaEnabled()) return;
  const { NovaEventBus } = await import("@/lib/nova/ambient/event-bus");
  const bus = NovaEventBus.getInstance();
  const event = {
    type: TRIGGER_TO_EVENT[trigger] as "task:created",
    workspaceId,
    userId: typeof context.userId === "string" ? context.userId : undefined,
    taskId: typeof context.taskId === "string" ? context.taskId : undefined,
    projectId: typeof context.projectId === "string" ? context.projectId : undefined,
    timestamp: new Date(),
    metadata: {
      trigger,
      taskTitle: context.taskTitle,
      taskStatus: context.taskStatus,
      taskPriority: context.taskPriority,
      assigneeId: context.assigneeId,
      oldValue: context.oldValue,
      newValue: context.newValue,
    },
  };
  await bus.emit(event);
}

/**
 * Emit a workspace event to the Nova ambient observation pipeline (if enabled) and dispatch
 * matching automation rules to the Inngest executor for execution.
 */
export async function processAutomations(
  workspaceId: string,
  trigger: AutomationTrigger,
  context: Omit<TriggerContext, "workspaceId"> & { workspaceId?: string },
): Promise<void> {
  await ensureNovaInitialized();
  logger.debug(`[AutomationEngine] Event: ${trigger} workspace=${workspaceId}`);

  await emitToNova(workspaceId, trigger, context);

  await dispatchRules(workspaceId, trigger, { ...context, trigger });
}

async function dispatchRules(
  workspaceId: string,
  trigger: AutomationTrigger,
  context: Omit<TriggerContext, "workspaceId"> & { workspaceId?: string },
): Promise<void> {
  try {
    const rules = await prisma.automation.findMany({
      where: { workspaceId, active: true, trigger },
    });

    const matched: Array<{ id: string }> = [];
    for (const rule of rules) {
      if (!matchesProjectScope(rule.projectId, context.projectId as string | null | undefined)) continue;
      if (!evaluateConditions(rule.condition, context as Record<string, unknown>)) continue;
      matched.push({ id: rule.id });
    }

    if (matched.length === 0) return;

    const { triggerAutomation } = await import("@/lib/inngest/functions/automation-executor");
    await Promise.allSettled(
      matched.map((rule) => triggerAutomation(rule.id, trigger, context))
    );

    logger.info(`[AutomationEngine] Dispatched ${matched.length} rule(s) for ${trigger}`, {
      workspaceId,
      projectId: context.projectId,
    });
  } catch (error) {
    logger.warn("[AutomationEngine] Rule dispatch failed:", error);
  }
}
