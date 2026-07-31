import { logger } from "@/lib/logger";
import { NovaEventBus } from "@/lib/nova/ambient/event-bus";
import { ObservationPipeline } from "@/lib/nova/ambient/observation-pipeline";
import type { WorkspaceEvent, EventType } from "@/lib/nova/ambient/types";

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
//  Now feeds the Nova ambient observation pipeline
//  instead of executing automation rules.
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
 * Emit a workspace event to the Nova ambient observation pipeline.
 * Automation rule execution is permanently disabled — Nova only observes.
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
}
