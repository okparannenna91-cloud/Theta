import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";

// ──────────────────────────────────────────────
//  TYPES
// ──────────────────────────────────────────────

interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in";
  value: string | number | boolean;
}

interface AutomationAction {
  type:
    | "create_task"
    | "update_task"
    | "send_notification"
    | "send_message"
    | "move_task"
    | "add_comment"
    | "update_custom_field";
  params: Record<string, unknown>;
}

interface TriggerContext {
  workspaceId: string;
  userId: string;
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

// ──────────────────────────────────────────────
//  CONDITION EVALUATION
// ──────────────────────────────────────────────

function evaluateConditions(
  conditionsRaw: string | null,
  context: TriggerContext
): boolean {
  if (!conditionsRaw) return true;

  let conditions: AutomationCondition[];
  try {
    conditions = JSON.parse(conditionsRaw);
  } catch {
    logger.warn("[AutomationExecutor] Failed to parse conditions JSON");
    return false;
  }

  if (!Array.isArray(conditions) || conditions.length === 0) return true;

  for (const condition of conditions) {
    const fieldValue = context[condition.field];

    switch (condition.operator) {
      case "equals":
        if (String(fieldValue) !== String(condition.value)) return false;
        break;
      case "not_equals":
        if (String(fieldValue) === String(condition.value)) return false;
        break;
      case "contains":
        if (!String(fieldValue).includes(String(condition.value))) return false;
        break;
      case "greater_than":
        if (Number(fieldValue) <= Number(condition.value)) return false;
        break;
      case "less_than":
        if (Number(fieldValue) >= Number(condition.value)) return false;
        break;
      case "in": {
        const values = Array.isArray(condition.value)
          ? condition.value
          : String(condition.value).split(",").map((s) => s.trim());
        if (!values.includes(String(fieldValue))) return false;
        break;
      }
    }
  }

  return true;
}

// ──────────────────────────────────────────────
//  ACTION EXECUTION — DISABLED IN OBSERVATION MODE
// ──────────────────────────────────────────────

async function executeAction(
  action: AutomationAction,
  context: TriggerContext
): Promise<unknown> {
  logger.info("[AutomationExecutor] Action disabled — Nova is in observation mode", { action: action.type });
  return { success: false, message: "Automation actions are disabled while Nova is in observation mode." };
}

// ──────────────────────────────────────────────
//  AUTOMATION EXECUTION ENGINE (event-driven)
// ──────────────────────────────────────────────

export const executeAutomation = inngest.createFunction(
  { id: "nova-execute-automation", triggers: [{ event: "automation/triggered" }] },
  async ({ event, step }) => {
    const { ruleId, triggerType } = event.data as {
      ruleId: string;
      triggerType: string;
      context: TriggerContext;
    };

    logger.info("[AutomationExecutor] Disabled — Nova is in observation mode", { ruleId, triggerType });
    return { executed: false, reason: "observation_mode" };
  }
);

// ──────────────────────────────────────────────
//  HELPER: Trigger a specific automation rule
// ──────────────────────────────────────────────

export async function triggerAutomation(
  ruleId: string,
  triggerType: string,
  context: Record<string, unknown>,
): Promise<void> {
  await inngest.send({
    name: "automation/triggered",
    data: { ruleId, triggerType, context },
  });
}

// ──────────────────────────────────────────────
//  DUE DATE PASSED — hourly cron
//  Fires DUE_DATE_PASSED for any overdue, incomplete tasks
// ──────────────────────────────────────────────

export const dueDatePassedCron = inngest.createFunction(
  { id: "automation-due-date-passed", triggers: [{ cron: "TZ(UTC) 0 * * * *" }] },
  async ({ step }) => {
    logger.info("[Automation] DUE_DATE_PASSED cron — Disabled, Nova is in observation mode");
    return { firedCount: 0 };
  }
);
