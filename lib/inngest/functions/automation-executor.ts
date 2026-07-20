import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notification-engine";
import type { NotificationType } from "@/lib/notification-types";
import type { Prisma } from "@prisma/client";

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
//  ACTION EXECUTION
// ──────────────────────────────────────────────

async function executeAction(
  action: AutomationAction,
  context: TriggerContext
): Promise<unknown> {
  switch (action.type) {
    case "create_task": {
      const params = action.params as {
        title?: string;
        description?: string;
        projectId?: string;
        status?: string;
        priority?: string;
        assigneeId?: string;
        dueDate?: string;
      };
      const title = params.title
        ? params.title.replace(/\{task\.title\}/g, context.taskTitle || "")
        : `Automated task from "${context.taskTitle || "trigger"}"`;

      return prisma.task.create({
        data: {
          title,
          description: params.description || null,
          projectId: params.projectId || context.projectId || "",
          workspaceId: context.workspaceId,
          userId: context.userId,
          status: params.status || "todo",
          priority: params.priority || "medium",
          assigneeIds: params.assigneeId ? [params.assigneeId] : [],
          dueDate: params.dueDate ? new Date(params.dueDate) : null,
        },
      });
    }

    case "update_task": {
      if (!context.taskId) throw new Error("No taskId in context for update_task");

      const params = action.params as {
        status?: string;
        priority?: string;
        assigneeId?: string;
        description?: string;
        dueDate?: string;
      };

      const updateData: Record<string, unknown> = {};
      if (params.status) updateData.status = params.status;
      if (params.priority) updateData.priority = params.priority;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.dueDate) updateData.dueDate = new Date(params.dueDate);
      if (params.assigneeId) updateData.assigneeIds = [params.assigneeId];

      return prisma.task.update({
        where: { id: context.taskId },
        data: updateData,
      });
    }

    case "send_notification": {
      const params = action.params as {
        userId?: string;
        title?: string;
        message?: string;
      };

      const targetUserId = params.userId || context.userId;
      const title = params.title || "Automation Alert";
      const message = params.message
        ? params.message.replace(/\{task\.title\}/g, context.taskTitle || "")
        : "An automation rule was triggered.";

      return createNotification(
        targetUserId,
        context.workspaceId,
        "smart_alert" as NotificationType,
        title,
        message
      );
    }

    case "send_message": {
      const params = action.params as {
        channelId?: string;
        content?: string;
        projectId?: string;
      };

      const content = params.content
        ? params.content.replace(/\{task\.title\}/g, context.taskTitle || "")
        : "Automation triggered.";

      return prisma.chatMessage.create({
        data: {
          content,
          userId: context.userId,
          workspaceId: context.workspaceId,
          projectId: params.projectId || context.projectId || null,
        },
      });
    }

    case "move_task": {
      if (!context.taskId) throw new Error("No taskId in context for move_task");

      const params = action.params as {
        boardId?: string;
        columnId?: string;
        status?: string;
      };

      const updateData: Record<string, unknown> = {};
      if (params.boardId) updateData.boardId = params.boardId;
      if (params.columnId) updateData.columnId = params.columnId;
      if (params.status) updateData.status = params.status;

      return prisma.task.update({
        where: { id: context.taskId },
        data: updateData,
      });
    }

    case "add_comment": {
      if (!context.taskId) throw new Error("No taskId in context for add_comment");

      const params = action.params as {
        content?: string;
      };

      const content = params.content
        ? params.content.replace(/\{task\.title\}/g, context.taskTitle || "")
        : "Automated comment.";

      return prisma.comment.create({
        data: {
          content,
          userId: context.userId,
          taskId: context.taskId,
        },
      });
    }

    case "update_custom_field": {
      if (!context.taskId) throw new Error("No taskId in context for update_custom_field");

      const params = action.params as {
        fieldKey?: string;
        value?: unknown;
      };

      const task = await prisma.task.findUnique({ where: { id: context.taskId } });
      if (!task) throw new Error(`Task ${context.taskId} not found`);

      const fieldValues = (task.fieldValues as Record<string, unknown>) || {};
      if (params.fieldKey) {
        fieldValues[params.fieldKey] = params.value;
      }

      return prisma.task.update({
        where: { id: context.taskId },
        data: { fieldValues: fieldValues as Prisma.InputJsonValue },
      });
    }

    default:
      throw new Error(`Unknown action type: ${(action as AutomationAction).type}`);
  }
}

// ──────────────────────────────────────────────
//  AUTOMATION EXECUTION ENGINE (event-driven)
// ──────────────────────────────────────────────

export const executeAutomation = inngest.createFunction(
  { id: "nova-execute-automation", triggers: [{ event: "automation/triggered" }] },
  async ({ event, step }) => {
    const { ruleId, triggerType, context } = event.data as {
      ruleId: string;
      triggerType: string;
      context: TriggerContext;
    };

    logger.info("[AutomationExecutor] Started", { ruleId, triggerType });

    // 1. Load the automation rule
    const rule = await step.run("load-rule", async () => {
      return prisma.automation.findUnique({ where: { id: ruleId } });
    });

    if (!rule || !rule.active) {
      logger.info("[AutomationExecutor] Rule not found or inactive", { ruleId });
      return { executed: false, reason: "rule_disabled" };
    }

    // 2. Evaluate conditions
    const conditionsMet = await step.run("evaluate-conditions", async () => {
      return evaluateConditions(rule.condition, context);
    });

    if (!conditionsMet) {
      logger.info("[AutomationExecutor] Conditions not met", { ruleId });
      return { executed: false, reason: "conditions_not_met" };
    }

    // 3. Execute actions
    const actionResults = await step.run("execute-actions", async () => {
      const action: AutomationAction = {
        type: rule.action as AutomationAction["type"],
        params: rule.actionValue ? JSON.parse(rule.actionValue) : {},
      };

      const results: Array<{
        action: string;
        success: boolean;
        result?: unknown;
        error?: string;
      }> = [];

      try {
        const result = await executeAction(action, context);
        results.push({ action: action.type, success: true, result });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error("[AutomationExecutor] Action failed", {
          ruleId,
          action: action.type,
          error: msg,
        });
        results.push({ action: action.type, success: false, error: msg });
      }

      return results;
    });

    // 4. Log execution to AutomationLog
    await step.run("log-execution", async () => {
      const allSuccess = actionResults.every((r) => r.success);
      await prisma.automationLog.create({
        data: {
          automationId: ruleId,
          trigger: triggerType,
          action: rule.action,
          result: allSuccess ? "success" : "error",
          error: actionResults.find((r) => !r.success)?.error || null,
          metadata: {
            triggerType,
            results: actionResults,
            context,
            executedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          workspaceId: context.workspaceId,
        },
      });
    });

    logger.info("[AutomationExecutor] Completed", { ruleId, results: actionResults });

    return { executed: true, results: actionResults };
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
    logger.info("[Automation] DUE_DATE_PASSED cron started");

    const now = new Date();
    let firedCount = 0;

    // Find all workspaces with active automations using DUE_DATE_PASSED trigger
    const workspacesWithTrigger = await prisma.automation.findMany({
      where: { active: true, trigger: "DUE_DATE_PASSED" },
      select: { workspaceId: true },
      distinct: ["workspaceId"],
    });

    for (const { workspaceId } of workspacesWithTrigger) {
      try {
        // Find overdue, incomplete tasks in this workspace
        const overdueTasks = await prisma.task.findMany({
          where: {
            workspaceId,
            dueDate: { lt: now },
            status: { notIn: ["done", "completed", "cancelled"] },
          },
          select: { id: true, title: true, projectId: true, dueDate: true, priority: true },
          take: 20,
        });

        for (const task of overdueTasks) {
          const { processAutomations } = await import("@/lib/automations/engine");
          await processAutomations(workspaceId, "DUE_DATE_PASSED", {
            taskId: task.id,
            projectId: task.projectId || undefined,
            userId: "system",
            taskTitle: task.title,
            taskPriority: task.priority,
            dueDate: task.dueDate?.toISOString(),
          });
          firedCount++;
        }
      } catch (error: any) {
        logger.warn(`[Automation] DUE_DATE_PASSED failed for workspace ${workspaceId}: ${error.message}`);
      }
    }

    logger.info(`[Automation] DUE_DATE_PASSED cron completed. Fired ${firedCount} trigger(s)`);
    return { firedCount };
  }
);
