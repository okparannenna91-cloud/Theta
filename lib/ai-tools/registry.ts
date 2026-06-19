import type { NovaIntent } from "@/lib/nova/decision-framework";

export type ToolCategory =
  | "TASK"
  | "PROJECT"
  | "WORKSPACE"
  | "DOCUMENT"
  | "ANALYSIS"
  | "WORKFLOW"
  | "INTEGRATION"
  | "MEMORY"
  | "UI"
  | "AGENT";

const TOOL_CATEGORY_MAP: Record<string, ToolCategory> = {
  // — Task CRUD & management —
  list_tasks: "TASK",
  create_task: "TASK",
  update_task: "TASK",
  delete_task: "TASK",
  breakdown_task: "TASK",
  create_dependency: "TASK",
  set_estimation: "TASK",
  log_time: "TASK",
  set_recurring: "TASK",
  set_task_metadata: "TASK",
  create_epic: "TASK",
  create_approval_request: "TASK",
  // — Project CRUD —
  list_projects: "PROJECT",
  create_project: "PROJECT",
  update_project: "PROJECT",
  delete_project: "PROJECT",
  project_health_analysis: "PROJECT",
  create_sprint_board: "PROJECT",
  // — Workspace admin —
  list_workspaces: "WORKSPACE",
  update_workspace: "WORKSPACE",
  list_members: "WORKSPACE",
  invite_member: "WORKSPACE",
  create_client_invite: "WORKSPACE",
  export_workspace_data: "WORKSPACE",
  send_team_announcement: "WORKSPACE",
  set_workspace_goal: "WORKSPACE",
  check_billing_history: "WORKSPACE",
  // — Document CRUD & search —
  create_document: "DOCUMENT",
  read_document: "DOCUMENT",
  delete_document: "DOCUMENT",
  search_workspace: "DOCUMENT",
  list_prompt_templates: "DOCUMENT",
  // — Analysis & reports —
  evaluate_risks: "ANALYSIS",
  get_suggestions: "ANALYSIS",
  generate_daily_brief: "ANALYSIS",
  generate_meeting_prep: "ANALYSIS",
  generate_standup: "ANALYSIS",
  generate_dashboard_config: "ANALYSIS",
  // — Workflow & forms —
  create_automation: "WORKFLOW",
  create_form: "WORKFLOW",
  list_forms: "WORKFLOW",
  get_form_responses: "WORKFLOW",
  browse_templates: "WORKFLOW",
  propose_custom_module: "WORKFLOW",
  // — Integrations —
  list_integrations: "INTEGRATION",
  // — Memory & prefs —
  save_conversation: "MEMORY",
  remember_preference: "MEMORY",
  // — UI actions —
  dispatch_ui_action: "UI",
  update_board_layout: "UI",
  // — Agent orchestration —
  orchestrate_agentic_workflow: "AGENT",
};

export function getToolCategory(toolName: string): ToolCategory | null {
  return TOOL_CATEGORY_MAP[toolName] ?? null;
}

export function filterToolsByCategories(
  tools: Record<string, unknown>,
  categories: ToolCategory[],
): Record<string, unknown> {
  if (categories.length === 0) return tools;
  const result: Record<string, unknown> = {};
  for (const [name, tool] of Object.entries(tools)) {
    const cat = getToolCategory(name);
    if (cat && categories.includes(cat)) {
      result[name] = tool;
    }
  }
  return result;
}

export const ALL_CATEGORIES: ToolCategory[] = [
  "TASK", "PROJECT", "WORKSPACE", "DOCUMENT", "ANALYSIS",
  "WORKFLOW", "INTEGRATION", "MEMORY", "UI", "AGENT",
];

const INTENT_CATEGORY_MAP: Record<NovaIntent, ToolCategory[]> = {
  CREATE: ["TASK", "PROJECT", "DOCUMENT", "WORKFLOW", "MEMORY", "UI"],
  READ: ["TASK", "PROJECT", "DOCUMENT", "WORKSPACE", "INTEGRATION", "ANALYSIS", "MEMORY"],
  UPDATE: ["TASK", "PROJECT", "WORKSPACE", "DOCUMENT", "MEMORY", "UI"],
  DELETE: ["TASK", "PROJECT", "DOCUMENT", "WORKSPACE"],
  ANALYZE: ["ANALYSIS", "TASK", "PROJECT", "DOCUMENT", "WORKSPACE"],
  SEARCH: ["DOCUMENT", "TASK", "PROJECT", "WORKSPACE", "ANALYSIS"],
  AUTOMATE: ["WORKFLOW", "AGENT", "TASK"],
  REPORT: ["ANALYSIS", "WORKSPACE", "TASK", "PROJECT"],
  IMPORT: ["WORKFLOW", "INTEGRATION"],
  EXPORT: ["WORKSPACE", "ANALYSIS"],
};

export function categoriesForIntent(intent: NovaIntent): ToolCategory[] {
  return INTENT_CATEGORY_MAP[intent] ?? ALL_CATEGORIES;
}

export function countToolsByCategory(tools: Record<string, unknown>): Record<ToolCategory, number> {
  const counts: Record<string, number> = {};
  for (const name of Object.keys(tools)) {
    const cat = getToolCategory(name);
    if (cat) counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts as Record<ToolCategory, number>;
}

export const ALL_TOOL_NAMES = Object.keys(TOOL_CATEGORY_MAP);
