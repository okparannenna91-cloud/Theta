import type { NovaIntent } from "./constitution/execution";

const WRITE_TOOLS = new Set([
  "create_task", "update_task", "delete_task", "breakdown_task",
  "create_dependency", "set_estimation", "log_time",
  "set_task_metadata", "create_epic",
  "create_project", "update_project", "delete_project",
  "update_workspace", "invite_member", "create_client_invite",
  "send_team_announcement", "set_workspace_goal",
  "create_document", "delete_document",
  "create_automation", "create_form",
  "save_conversation", "remember_preference",
  "dispatch_ui_action", "update_board_layout",
]);

const READ_ONLY_INTENTS: NovaIntent[] = ["READ", "SEARCH", "ANALYZE", "REPORT"];

export function isWriteTool(toolName: string): boolean {
  return WRITE_TOOLS.has(toolName);
}

export function shouldBlockWriteTool(toolName: string, intent: NovaIntent): boolean {
  if (!isWriteTool(toolName)) return false;
  return READ_ONLY_INTENTS.includes(intent);
}
