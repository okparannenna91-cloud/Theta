import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
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
  const fullContext: TriggerContext = { ...context, workspaceId };

  try {
    logger.info(`[AutomationEngine] Firing trigger=${trigger} for workspace=${workspaceId}`);

    const rules = await prisma.automation.findMany({
      where: {
        workspaceId,
        active: true,
        trigger,
      },
      select: { id: true, name: true },
    });

    // Fire each matching rule as its own Inngest event
    if (rules.length > 0) {
      logger.info(`[AutomationEngine] Found ${rules.length} matching rule(s) for trigger=${trigger}`);

      await Promise.all(
        rules.map((rule) =>
          inngest.send({
            name: "automation/triggered",
            data: {
              ruleId: rule.id,
              triggerType: trigger,
              context: fullContext,
            },
          })
        )
      );
    }

    // Always dispatch to the Nova AI agent for intelligent side-effects
    // (auto-labeling, auto-assignment, sprint briefs, etc.)
    await inngest.send({
      name: "nova/agent-event",
      data: {
        eventType: trigger,
        workspaceId,
        taskId: fullContext.taskId,
        projectId: fullContext.projectId,
        userId: fullContext.userId,
        metadata: {
          taskTitle: fullContext.taskTitle,
          taskStatus: fullContext.taskStatus,
          taskPriority: fullContext.taskPriority,
          assigneeId: fullContext.assigneeId,
          oldValue: fullContext.oldValue,
          newValue: fullContext.newValue,
        },
      },
    });
  } catch (error) {
    logger.error("[AutomationEngine] Error firing automations:", error);
  }
}
