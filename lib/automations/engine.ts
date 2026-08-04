import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { NovaEventBus } from "@/lib/nova/ambient/event-bus";
import { ObservationPipeline } from "@/lib/nova/ambient/observation-pipeline";
import type { WorkspaceEvent, EventType } from "@/lib/nova/ambient/types";
import { evaluateConditions, matchesProjectScope } from "@/lib/automations/conditions";

let _initialized = false;
function ensurePipelineInitialized(): void {
  if (!_initialized) {
    _initialized = true;
    ObservationPipeline.initialize();
  }
}

// ──────────────────────────────────────────────
//  UNIFIED AUTOMATION ENGINE
//  Single entry point for all trigger firing.
//  1) Feeds the Nova ambient observation pipeline.
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

const TRIGGER_TO_EVENT: Record<AutomationTrigger, EventType> = {
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
 * Emit a workspace event to the Nova ambient observation pipeline and dispatch
 * matching automation rules to the Inngest executor for execution.
 */
export async function processAutomations(
  workspaceId: string,
  trigger: AutomationTrigger,
  context: Omit<TriggerContext, "workspaceId"> & { workspaceId?: string },
): Promise<void> {
  ensurePipelineInitialized();
  logger.debug(`[AutomationEngine] Event: ${trigger} workspace=${workspaceId}`);

  const bus = NovaEventBus.getInstance();
  const event: WorkspaceEvent = {
    type: TRIGGER_TO_EVENT[trigger],
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

  await dispatchRules(workspaceId, trigger, context);
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
