import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { evaluateConditions } from "@/lib/automations/conditions";
import { createNotification, notifyWorkspaceMembers } from "@/lib/notification-engine";
import type { NotificationType } from "@/lib/notification-types";

// ──────────────────────────────────────────────
//  TYPES
// ──────────────────────────────────────────────

export interface AutomationAction {
  type:
    | "create_task"
    | "update_task"
    | "send_notification"
    | "send_message"
    | "move_task"
    | "add_comment"
    | "update_custom_field"
    | "assign_task"
    | "set_status"
    | "set_priority"
    | "notify_channel"
    | "create_project"
    | "send_email"
    | "generate_report";
  params: Record<string, unknown>;
}

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

// ──────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

async function resolveActorUserId(
  workspaceId: string,
  fallbackUserId?: string
): Promise<string | null> {
  if (fallbackUserId) return fallbackUserId;
  try {
    const owner = await prisma.workspaceMember.findFirst({
      where: { workspaceId, role: { in: ["owner", "admin"] } },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });
    return owner?.userId ?? null;
  } catch {
    return null;
  }
}

async function getActorName(workspaceId: string, userId?: string): Promise<string> {
  if (!userId) return "Someone";
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name || "Someone";
  } catch {
    return "Someone";
  }
}

async function getProjectName(projectId?: string): Promise<string> {
  if (!projectId) return "";
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });
    return project?.name ? ` in "${project.name}"` : "";
  } catch {
    return "";
  }
}

function buildNotificationMessage(
  trigger: string,
  action: AutomationAction,
  context: TriggerContext,
  actorName: string,
  projectContext: string
): string {
  const customMessage = str(
    action.params.message ??
      action.params.content ??
      action.params.value ??
      ""
  );

  if (customMessage) {
    // Replace placeholders in custom message
    return customMessage
      .replace(/\{actor\}/g, actorName)
      .replace(/\{task\}/g, str(context.taskTitle))
      .replace(/\{project\}/g, projectContext.replace(" in \"", "").replace("\"", ""));
  }

  // Default rich messages based on trigger
  const taskRef = context.taskTitle ? `"${context.taskTitle}"` : "a task";

  switch (trigger) {
    case "TASK_COMPLETED":
      return `${actorName} completed ${taskRef}${projectContext}.`;
    case "TASK_CREATED":
      return `${actorName} created ${taskRef}${projectContext}.`;
    case "TASK_STATUS_UPDATED":
      return `${actorName} updated ${taskRef} status to ${str(context.newValue) || "a new status"}${projectContext}.`;
    case "TASK_ASSIGNED":
      return `${actorName} assigned ${taskRef}${projectContext}.`;
    case "TASK_PRIORITY_CHANGED":
      return `${actorName} changed ${taskRef} priority to ${str(context.newValue) || "a new priority"}${projectContext}.`;
    case "DUE_DATE_PASSED":
      return `${taskRef} is past its due date${projectContext}.`;
    case "PROJECT_CREATED":
      return `${actorName} created a new project${projectContext}.`;
    case "SPRINT_STARTED":
      return `A sprint started${projectContext}.`;
    case "SPRINT_COMPLETED":
      return `A sprint was completed${projectContext}.`;
    case "FORM_SUBMITTED":
      return `A form was submitted${projectContext}.`;
    case "DOCUMENT_UPDATED":
      return `${actorName} updated a document${projectContext}.`;
    case "USER_INVITED":
      return `${actorName} invited a new user${projectContext}.`;
    case "MEMBER_ADDED":
      return `A new member joined${projectContext}.`;
    default:
      return `Automation triggered by ${actorName} on ${taskRef}${projectContext}.`;
  }
}

function buildNotificationTitle(trigger: string, action: AutomationAction, context: TriggerContext): string {
  const customTitle = str(action.params.title);
  if (customTitle) return customTitle;

  const titles: Record<string, string> = {
    TASK_COMPLETED: "Task Completed",
    TASK_CREATED: "Task Created",
    TASK_STATUS_UPDATED: "Task Status Updated",
    TASK_ASSIGNED: "Task Assigned",
    TASK_PRIORITY_CHANGED: "Priority Changed",
    DUE_DATE_PASSED: "Overdue Task",
    PROJECT_CREATED: "Project Created",
    SPRINT_STARTED: "Sprint Started",
    SPRINT_COMPLETED: "Sprint Completed",
    FORM_SUBMITTED: "Form Submitted",
    DOCUMENT_UPDATED: "Document Updated",
    USER_INVITED: "User Invited",
    MEMBER_ADDED: "Member Added",
  };
  return titles[trigger] || "Automation Notification";
}

function normalizeActions(
  ruleAction: string,
  ruleActionValue: string | null
): AutomationAction[] {
  if (ruleActionValue) {
    try {
      const parsed = JSON.parse(ruleActionValue);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every((a) => a && typeof a.type === "string")
      ) {
        return parsed as AutomationAction[];
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return [{ type: legacyActionToType(ruleAction), params: parsed as Record<string, unknown> }];
      }
    } catch {
      // fall through to legacy single-action normalization
    }
  }

  // Legacy API-created rules: a single action code + a scalar value.
  const value = ruleActionValue ?? undefined;
  const type: AutomationAction["type"] = legacyActionToType(ruleAction);
  return [{ type, params: value !== undefined ? { value } : {} }];
}

function legacyActionToType(action: string): AutomationAction["type"] {
  switch (action) {
    case "CREATE_TASK":
      return "create_task";
    case "ASSIGN_USER":
    case "SET_ASSIGNEE":
      return "assign_task";
    case "UPDATE_STATUS":
    case "SET_STATUS":
    case "MOVE_TASK":
      return "set_status";
    case "SET_PRIORITY":
      return "set_priority";
    case "SEND_EMAIL":
      return "send_email";
    case "NOTIFY_TEAM":
    case "NOTIFY_CHANNEL":
      return "notify_channel";
    case "CREATE_PROJECT":
      return "create_project";
    case "GENERATE_REPORT":
      return "generate_report";
    case "ADD_COMMENT":
      return "add_comment";
    case "UPDATE_CUSTOM_FIELD":
      return "update_custom_field";
    case "SEND_NOTIFICATION":
    default:
      return "send_notification";
  }
}

const COMPLETION_KEYWORDS = ["done", "complete", "completed", "finished", "approved"];

function isCompletionStatus(status: string): boolean {
  return COMPLETION_KEYWORDS.includes(status.toLowerCase());
}

// ──────────────────────────────────────────────
//  ACTION EXECUTION
// ──────────────────────────────────────────────

async function executeAction(
  action: AutomationAction,
  context: TriggerContext
): Promise<{ ok: boolean; detail?: string }> {
  const { workspaceId } = context;
  const targetTaskId = str(action.params.taskId) || context.taskId || undefined;
  const actorId = (await resolveActorUserId(workspaceId, context.userId)) || "";

  switch (action.type) {
    case "create_task": {
      const title = str(action.params.title || action.params.name || action.params.value);
      if (!title) return { ok: false, detail: "create_task requires a title" };
      if (!context.projectId && !action.params.projectId) {
        return { ok: false, detail: "create_task requires a project" };
      }
      const priority = str(action.params.priority ?? action.params.value ?? "medium");
      const task = await prisma.task.create({
        data: {
          title,
          description: action.params.description ? str(action.params.description) : undefined,
          status: str(action.params.status ?? "todo"),
          priority,
          taskType: str(action.params.taskType ?? "task"),
          dueDate: action.params.dueDate ? new Date(str(action.params.dueDate)) : undefined,
          workspaceId,
          projectId: str(action.params.projectId) || context.projectId!,
          userId: str(action.params.assigneeId || actorId),
          assigneeIds: action.params.assigneeId ? [str(action.params.assigneeId)] : [],
        },
      });
      return { ok: true, detail: `Created task "${task.title}"` };
    }

    case "update_task":
    case "set_status":
    case "move_task": {
      if (!targetTaskId) return { ok: false, detail: `${action.type} requires a target task` };
      const status =
        action.type === "set_status" || action.type === "move_task"
          ? str(action.params.status ?? action.params.columnId ?? action.params.value)
          : action.params.status
            ? str(action.params.status)
            : undefined;

      const data: Record<string, unknown> = {};
      if (status) {
        data.status = status;
        if (isCompletionStatus(status)) data.completedAt = new Date();
        else data.completedAt = null;
      }
      if (action.params.priority) data.priority = str(action.params.priority);
      if (action.params.assigneeId) data.assigneeIds = [str(action.params.assigneeId)];
      if (action.params.description !== undefined) data.description = str(action.params.description);

      if (Object.keys(data).length === 0) return { ok: false, detail: "No fields to update" };

      const task = await prisma.task.findUnique({ where: { id: targetTaskId } });
      if (!task) return { ok: false, detail: "Target task not found" };

      await prisma.task.update({ where: { id: targetTaskId }, data });
      return { ok: true, detail: `Updated task ${targetTaskId}` };
    }

    case "set_priority": {
      if (!targetTaskId) return { ok: false, detail: "set_priority requires a target task" };
      const task = await prisma.task.findUnique({ where: { id: targetTaskId } });
      if (!task) return { ok: false, detail: "Target task not found" };
      const priority = str(action.params.priority ?? action.params.value ?? "medium");
      await prisma.task.update({ where: { id: targetTaskId }, data: { priority } });
      return { ok: true, detail: `Set priority to ${priority}` };
    }

    case "assign_task": {
      if (!targetTaskId) return { ok: false, detail: "assign_task requires a target task" };
      const task = await prisma.task.findUnique({ where: { id: targetTaskId } });
      if (!task) return { ok: false, detail: "Target task not found" };
      const assigneeId = str(action.params.assigneeId ?? action.params.userId ?? action.params.value);
      if (!assigneeId) return { ok: false, detail: "assign_task requires an assignee" };
      const assigneeIds = Array.isArray(task.assigneeIds) && !task.assigneeIds.includes(assigneeId)
        ? [...task.assigneeIds, assigneeId]
        : task.assigneeIds || [];
      await prisma.task.update({ where: { id: targetTaskId }, data: { assigneeIds } });
      return { ok: true, detail: `Assigned ${assigneeId}` };
    }

    case "send_notification": {
      const targetUserId = str(
        action.params.userId || action.params.assigneeId || context.assigneeId || actorId
      );
      if (!targetUserId) return { ok: false, detail: "send_notification requires a recipient" };
      
      const actorName = await getActorName(workspaceId, context.userId);
      const projectContext = await getProjectName(context.projectId);
      const title = buildNotificationTitle(context.trigger || "", action, context);
      const message = buildNotificationMessage(context.trigger || "", action, context, actorName, projectContext);
      
      await createNotification(
        targetUserId,
        workspaceId,
        "reminder" as NotificationType,
        title,
        message,
        { taskId: targetTaskId, projectId: context.projectId, actorId: context.userId, actorName }
      );
      return { ok: true, detail: `Notification sent to ${targetUserId}` };
    }

        case "send_message":
    case "notify_channel": {
      const actorName = await getActorName(workspaceId, context.userId);
      const projectContext = await getProjectName(context.projectId);
      const title = buildNotificationTitle(context.trigger || "", action, context);
      const message = buildNotificationMessage(context.trigger || "", action, context, actorName, projectContext);
      
      // Find team for this project
      let teamId = str(action.params.teamId);
      if (!teamId && context.projectId) {
        try {
          const project = await prisma.project.findUnique({
            where: { id: context.projectId },
            select: { teamId: true, projectTeams: { select: { teamId: true }, take: 1 } },
          });
          teamId = project?.teamId || project?.projectTeams?.[0]?.teamId || "";
        } catch {}
      }

      if (teamId) {
        // Post to team chat channel
        const crypto = await import("crypto");
        const messageId = crypto.randomUUID();
        const now = Date.now();

        const doc = {
          _id: messageId,
          content: message,
          workspaceId,
          projectId: context.projectId || null,
          teamId,
          userId: actorId || "",
          attachment: null,
          reactions: null,
          isPinned: false,
          isEdited: false,
          deletedAt: null,
          replyToId: null,
          createdAt: now,
          updatedAt: now,
        };

        await prisma.$runCommandRaw({
          insert: "chat_messages",
          documents: [doc],
        });

        // Publish to Ably for real-time delivery
        try {
          const { publishToChannel } = await import("@/lib/ably");
          const channelName = `team:${teamId}:chat`;
          const user = await prisma.user.findUnique({
            where: { id: actorId || "" },
            select: { id: true, name: true, imageUrl: true },
          });
          await publishToChannel(channelName, "message", {
            id: messageId,
            content: message,
            workspaceId,
            projectId: context.projectId || null,
            teamId,
            userId: actorId || "",
            attachment: null,
            reactions: null,
            isPinned: false,
            isEdited: false,
            deletedAt: null,
            replyToId: null,
            createdAt: new Date(now),
            updatedAt: new Date(now),
            user: user || { id: actorId || "", name: "System", imageUrl: null },
          });
        } catch (err) {
          logger.warn("[AutomationExecutor] Failed to publish to Ably:", err);
        }

        return { ok: true, detail: `Message posted to team chat` };
      }

      // Fallback: notify all workspace members
      await notifyWorkspaceMembers(
        workspaceId,
        actorId,
        "smart_alert" as NotificationType,
        title,
        message,
        { projectId: context.projectId, actorId: context.userId, actorName }
      );
      return { ok: true, detail: "Workspace members notified" };
    }

    case "send_email": {
      const actorName = await getActorName(workspaceId, context.userId);
      const projectContext = await getProjectName(context.projectId);
      const title = buildNotificationTitle(context.trigger || "", action, context);
      const message = buildNotificationMessage(context.trigger || "", action, context, actorName, projectContext);
      await notifyWorkspaceMembers(
        workspaceId,
        actorId,
        "smart_alert" as NotificationType,
        title,
        message,
        { projectId: context.projectId, actorId: context.userId, actorName }
      );
      return { ok: true, detail: "Email notification sent" };
    }

    case "add_comment": {
      if (!targetTaskId) return { ok: false, detail: "add_comment requires a target task" };
      const content = str(action.params.content ?? action.params.message);
      if (!content) return { ok: false, detail: "add_comment requires content" };
      if (!actorId) return { ok: false, detail: "No actor available for comment" };
      await prisma.comment.create({
        data: { content, userId: actorId, taskId: targetTaskId },
      });
      return { ok: true, detail: "Comment added" };
    }

    case "update_custom_field": {
      if (!targetTaskId) return { ok: false, detail: "update_custom_field requires a target task" };
      const task = await prisma.task.findUnique({ where: { id: targetTaskId } });
      if (!task) return { ok: false, detail: "Target task not found" };
      const fieldKey = str(action.params.fieldKey ?? action.params.field ?? action.params.key);
      if (!fieldKey) return { ok: false, detail: "update_custom_field requires a field key" };
      const current = (task.fieldValues as Record<string, unknown> | null) || {};
      await prisma.task.update({
        where: { id: targetTaskId },
        data: { fieldValues: { ...current, [fieldKey]: action.params.value } as any },
      });
      return { ok: true, detail: `Custom field ${fieldKey} updated` };
    }

    case "create_project": {
      const name = str(action.params.name ?? action.params.title);
      if (!name) return { ok: false, detail: "create_project requires a name" };
      if (!actorId) return { ok: false, detail: "No actor available to create project" };
      const project = await prisma.project.create({
        data: {
          name,
          description: action.params.description ? str(action.params.description) : null,
          workspaceId,
          userId: actorId,
          color: action.params.color ? str(action.params.color) : undefined,
        },
      });
      return { ok: true, detail: `Created project "${project.name}"` };
    }

    case "generate_report":
      return { ok: false, detail: "generate_report is not implemented" };

    default:
      return { ok: false, detail: `Unknown action type` };
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

    const rule = await step.run("load-rule", async () =>
      prisma.automation.findUnique({ where: { id: ruleId } })
    );

    if (!rule || !rule.active) {
      logger.info("[AutomationExecutor] Rule not found or inactive — skipping", { ruleId });
      return { executed: false, reason: "inactive_or_missing" };
    }

    const passesConditions = step.run("evaluate-conditions", async () =>
      evaluateConditions(rule.condition, context as Record<string, unknown>)
    );

    const actions = step.run("normalize-actions", () =>
      normalizeActions(rule.action, rule.actionValue)
    );

    if (!(await passesConditions)) {
      await step.run("log-skipped", async () =>
        prisma.automationLog.create({
          data: {
            automationId: rule.id,
            trigger: triggerType,
            action: rule.action,
            result: "skipped",
            error: "Conditions did not match",
            workspaceId: context.workspaceId,
            metadata: { projectId: context.projectId, context: context as any },
          },
        })
      );
      return { executed: false, reason: "conditions_not_met" };
    }

    const normalizedActions = await actions;

    const results: Array<{ type: string; ok: boolean; detail?: string }> = [];
    let failed = false;

    for (const action of normalizedActions) {
      const result = await step.run(`action-${action.type}`, async () =>
        executeAction(action, context)
      );
      results.push({ type: action.type, ...result });
      if (!result.ok) failed = true;
    }

    await step.run("log-result", async () =>
      prisma.automationLog.create({
        data: {
          automationId: rule.id,
          trigger: triggerType,
          action: rule.action,
          result: failed ? "error" : "success",
          error: failed ? JSON.stringify(results.filter((r) => !r.ok)) : null,
          workspaceId: context.workspaceId,
          metadata: { projectId: context.projectId, results, context: context as any },
        },
      })
    );

    logger.info("[AutomationExecutor] Executed automation rule", {
      ruleId: rule.id,
      triggerType,
      results,
    });

    return { executed: !failed, results };
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
//  Fires DUE_DATE_PASSED for overdue, incomplete tasks
// ──────────────────────────────────────────────

export const dueDatePassedCron = inngest.createFunction(
  { id: "automation-due-date-passed", triggers: [{ cron: "TZ(UTC) 0 * * * *" }] },
  async ({ step }) => {
    const { processAutomations } = await import("@/lib/automations/engine");

    const overdue = await step.run("find-overdue-tasks", async () =>
      prisma.task.findMany({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ["done", "complete", "completed", "finished", "approved"] },
        },
        select: { id: true, workspaceId: true, projectId: true, title: true, assigneeIds: true },
        take: 500,
      })
    );

    for (const task of overdue) {
      await processAutomations(task.workspaceId, "DUE_DATE_PASSED", {
        taskId: task.id,
        projectId: task.projectId,
        taskTitle: task.title,
        assigneeId: task.assigneeIds[0],
      });
    }

    logger.info("[Automation] DUE_DATE_PASSED scan complete", {
      firedCount: overdue.length,
    });
    return { firedCount: overdue.length };
  }
);
