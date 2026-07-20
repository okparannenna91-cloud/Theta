import type { AutomationConfig } from "../ai-tools/types";

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

export type AutomationAction =
  | "create_task"
  | "update_task"
  | "send_notification"
  | "send_message"
  | "move_task"
  | "add_comment"
  | "update_custom_field";

export const TRIGGER_DEFINITIONS = [
  { trigger: "TASK_CREATED", description: "When a task is created" },
  { trigger: "TASK_STATUS_UPDATED", description: "When a task status changes" },
  { trigger: "TASK_COMPLETED", description: "When a task is marked complete" },
  { trigger: "TASK_ASSIGNED", description: "When a task is assigned to someone" },
  { trigger: "TASK_PRIORITY_CHANGED", description: "When a task priority changes" },
  { trigger: "DUE_DATE_PASSED", description: "When a task's due date passes" },
  { trigger: "PROJECT_CREATED", description: "When a project is created" },
  { trigger: "SPRINT_STARTED", description: "When a sprint begins" },
  { trigger: "SPRINT_COMPLETED", description: "When a sprint ends" },
  { trigger: "FORM_SUBMITTED", description: "When a form is submitted" },
  { trigger: "DOCUMENT_UPDATED", description: "When a document is updated" },
  { trigger: "USER_INVITED", description: "When a user is invited" },
  { trigger: "MEMBER_ADDED", description: "When a new member joins" },
];

export const ACTION_DEFINITIONS = [
  { action: "create_task", description: "Create a new task" },
  { action: "update_task", description: "Update an existing task" },
  { action: "send_notification", description: "Send a notification to a user" },
  { action: "send_message", description: "Send a message in a channel" },
  { action: "move_task", description: "Move a task to a different board/column" },
  { action: "add_comment", description: "Add a comment to a task" },
  { action: "update_custom_field", description: "Update a custom field value" },
];

export const AUTOMATION_SAFETY_RULES = [
  "Validate permissions before executing automations",
  "Prevent infinite loops in automation chains",
  "Require approval for high-impact automation actions",
];

export interface AutomatedWorkflow {
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  config: AutomationConfig;
  explanation: string;
}

export class AutomationIntelligence {
  public static translateNL(command: string): AutomatedWorkflow {
    const lower = command.toLowerCase();

    let trigger: AutomationTrigger = "TASK_CREATED";
    let action: AutomationAction = "send_notification";
    const config: AutomationConfig = { notifyRole: "member" };
    let explanation = "Triggered when a task is created to notify team members.";
    let name = `Auto: ${command.substring(0, 40)}`;

    if (lower.includes("completed") || lower.includes("done") || lower.includes("finish")) {
      trigger = "TASK_COMPLETED";
      explanation = "Triggered when a task status transitions to complete.";
    } else if (lower.includes("member added") || lower.includes("join") || lower.includes("invite")) {
      trigger = "MEMBER_ADDED";
      explanation = "Triggered when a new user joins the workspace.";
    } else if (lower.includes("overdue") || lower.includes("late") || lower.includes("due date")) {
      trigger = "DUE_DATE_PASSED";
      explanation = "Triggered when a task's due date passes without completion.";
    } else if (lower.includes("sprint") && (lower.includes("start") || lower.includes("begin"))) {
      trigger = "SPRINT_STARTED";
      explanation = "Triggered when a sprint begins.";
    } else if (lower.includes("sprint") && (lower.includes("complete") || lower.includes("end"))) {
      trigger = "SPRINT_COMPLETED";
      explanation = "Triggered when a sprint ends.";
    } else if (lower.includes("form") && lower.includes("submit")) {
      trigger = "FORM_SUBMITTED";
      explanation = "Triggered when a form response is submitted.";
    } else if (lower.includes("document") && (lower.includes("update") || lower.includes("edit"))) {
      trigger = "DOCUMENT_UPDATED";
      explanation = "Triggered when a document is updated.";
    } else if (lower.includes("project") && lower.includes("create")) {
      trigger = "PROJECT_CREATED";
      explanation = "Triggered when a new project is created.";
    } else if (lower.includes("assign")) {
      trigger = "TASK_ASSIGNED";
      explanation = "Triggered when a task is assigned to someone.";
    } else if (lower.includes("priority")) {
      trigger = "TASK_PRIORITY_CHANGED";
      explanation = "Triggered when a task priority changes.";
    }

    if (lower.includes("assign")) {
      action = "update_task";
      config.assigneeId = lower.includes("qa") ? "QA_ROLE" : "LEAD_ROLE";
    } else if (lower.includes("status") || lower.includes("update status")) {
      action = "update_task";
      config.status = lower.includes("done") ? "done" : lower.includes("progress") ? "in_progress" : "todo";
    } else if (lower.includes("create") && lower.includes("task")) {
      action = "create_task";
    } else if (lower.includes("comment") || lower.includes("note")) {
      action = "add_comment";
    } else if (lower.includes("move") || lower.includes("board")) {
      action = "move_task";
    }

    return { name, trigger, action, config, explanation };
  }

  public static getAvailableTriggers() {
    return TRIGGER_DEFINITIONS;
  }

  public static getAvailableActions() {
    return ACTION_DEFINITIONS;
  }

  public static getSafetyRules() {
    return AUTOMATION_SAFETY_RULES;
  }
}
