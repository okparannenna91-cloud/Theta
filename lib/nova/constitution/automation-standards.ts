export type AutomationTrigger = "TASK_CREATED" | "TASK_COMPLETED" | "SPRINT_STARTED" | "SPRINT_COMPLETED" | "FORM_SUBMITTED" | "DOCUMENT_UPDATED" | "USER_INVITED" | "TASK_OVERDUE" | "MEMBER_ADDED";
export type AutomationAction = "CREATE_TASK" | "ASSIGN_USER" | "SEND_EMAIL" | "UPDATE_STATUS" | "GENERATE_REPORT" | "NOTIFY_TEAM" | "CREATE_PROJECT" | "SEND_NOTIFICATION" | "NOTIFY_CHANNEL" | "SET_ASSIGNEE";

export interface AutomationTriggerDefinition {
  trigger: AutomationTrigger;
  description: string;
}

export const TRIGGER_DEFINITIONS: AutomationTriggerDefinition[] = [
  { trigger: "TASK_CREATED", description: "When a task is created" },
  { trigger: "TASK_COMPLETED", description: "When a task is marked complete" },
  { trigger: "SPRINT_STARTED", description: "When a sprint begins" },
  { trigger: "SPRINT_COMPLETED", description: "When a sprint ends" },
  { trigger: "FORM_SUBMITTED", description: "When a form is submitted" },
  { trigger: "DOCUMENT_UPDATED", description: "When a document is edited" },
  { trigger: "USER_INVITED", description: "When a user is invited to the workspace" },
  { trigger: "TASK_OVERDUE", description: "When a task passes its due date" },
  { trigger: "MEMBER_ADDED", description: "When a new member joins" },
];

export interface AutomationActionDefinition {
  action: AutomationAction;
  description: string;
}

export const ACTION_DEFINITIONS: AutomationActionDefinition[] = [
  { action: "CREATE_TASK", description: "Create a new task" },
  { action: "ASSIGN_USER", description: "Assign a user to a task" },
  { action: "SEND_EMAIL", description: "Send an email notification" },
  { action: "UPDATE_STATUS", description: "Update task or project status" },
  { action: "GENERATE_REPORT", description: "Generate a report" },
  { action: "NOTIFY_TEAM", description: "Notify the team via notification" },
  { action: "CREATE_PROJECT", description: "Create a new project" },
  { action: "SEND_NOTIFICATION", description: "Send a system notification" },
  { action: "NOTIFY_CHANNEL", description: "Notify a Slack channel" },
  { action: "SET_ASSIGNEE", description: "Set or change task assignee" },
];

export const AUTOMATION_SAFETY_RULES: string[] = [
  "Nova must validate permissions before executing automations",
  "Nova must prevent infinite loops in automation chains",
  "Nova must require approval for high-impact automation actions",
  "Nova must log all automation executions for audit",
];
