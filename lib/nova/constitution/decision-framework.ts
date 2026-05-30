export type NovaIntent = "CREATE" | "READ" | "UPDATE" | "DELETE" | "ANALYZE" | "SEARCH" | "AUTOMATE" | "REPORT" | "IMPORT" | "EXPORT";
export type DecisionStrategy = "PATH_A_IMMEDIATE" | "PATH_B_CONFIRMATION" | "PATH_C_MULTISTEP" | "PATH_D_INFO";

export interface DecisionPhase {
  name: string;
  description: string;
  steps: string[];
}

export const DECISION_PHASES: DecisionPhase[] = [
  {
    name: "Intent Detection",
    description: "Nova must identify what the user wants and what outcome is expected.",
    steps: [
      "Identify what the user wants",
      "Identify what outcome is expected",
      "Determine whether action is required",
    ],
  },
  {
    name: "Context Collection",
    description: "Nova gathers available context from workspace, project, and user sources.",
    steps: [
      "Gather current workspace context",
      "Gather current project context",
      "Gather current sprint context",
      "Gather selected task context",
      "Gather active document context",
      "Gather user permissions",
      "Gather historical activity",
    ],
  },
  {
    name: "Risk Assessment",
    description: "Classify action as Low, Medium, or High risk.",
    steps: [
      "Classify action risk level",
      "Determine approval requirements based on risk",
    ],
  },
  {
    name: "Execution Strategy",
    description: "Choose the appropriate execution path.",
    steps: [
      "Path A: Immediate execution",
      "Path B: Confirmation required",
      "Path C: Multi-step workflow",
      "Path D: Information response",
    ],
  },
  {
    name: "Result Generation",
    description: "Generate results that inform the user what happened.",
    steps: [
      "Explain what happened",
      "Explain what changed",
      "Provide next recommendations",
    ],
  },
];

export const DECISION_PRIORITY_ORDER: string[] = [
  "User goal",
  "Workspace rules",
  "Team preferences",
  "Historical behavior",
  "Default system behavior",
];

export function intentFromString(input: string): NovaIntent {
  const lower = input.toLowerCase();
  if (lower.includes("create") || lower.includes("make") || lower.includes("add")) return "CREATE";
  if (lower.includes("delete") || lower.includes("remove") || lower.includes("destroy")) return "DELETE";
  if (lower.includes("update") || lower.includes("edit") || lower.includes("modify") || lower.includes("change")) return "UPDATE";
  if (lower.includes("report") || lower.includes("summarize") || lower.includes("analyze")) return "REPORT";
  if (lower.includes("search") || lower.includes("find") || lower.includes("lookup")) return "SEARCH";
  if (lower.includes("automate") || lower.includes("workflow") || lower.includes("trigger")) return "AUTOMATE";
  if (lower.includes("import")) return "IMPORT";
  if (lower.includes("export")) return "EXPORT";
  if (lower.includes("read") || lower.includes("get") || lower.includes("show") || lower.includes("list")) return "READ";
  return "READ";
}
