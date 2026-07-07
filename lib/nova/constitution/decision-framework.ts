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

const NEGATION_PATTERNS = [
  /\b(?:don't|do not|never|stop|avoid|cease)\s+(?:create|make|add|delete|remove|destroy|erase|purge|update|edit|modify|change|automate|import|export)\b/i,
  /\b(?:not|n't)\s+(?:to\s+)?(?:create|make|add|delete|remove|destroy|erase|purge|update|edit|modify|change|automate|import|export)\b/i,
];

const QUESTION_PREFIXES = /^(?:what|why|how|when|where|who|is|are|can|could|would|should|does|do|did|has|have|will|shall|may|might)\b/i;

export function intentFromString(input: string): NovaIntent {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const hasWord = (w: string) => new RegExp(`\\b${w}\\b`).test(lower);

  const hasNegation = NEGATION_PATTERNS.some(p => p.test(trimmed));
  if (hasNegation) return "READ";

  const isQuestion = QUESTION_PREFIXES.test(trimmed);

  if (hasWord("create") || hasWord("make") || hasWord("add")) return "CREATE";
  if (hasWord("delete") || hasWord("remove") || hasWord("destroy") || hasWord("erase") || hasWord("purge")) return "DELETE";
  if (hasWord("update") || hasWord("edit") || hasWord("modify") || hasWord("change")) return "UPDATE";
  if (hasWord("report") || hasWord("summarize") || hasWord("analyze")) return "REPORT";
  if (hasWord("search") || hasWord("find") || hasWord("lookup")) return "SEARCH";
  if (hasWord("automate") || hasWord("workflow") || hasWord("trigger")) return "AUTOMATE";
  if (hasWord("import")) return "IMPORT";
  if (hasWord("export")) return "EXPORT";
  if (hasWord("read") || hasWord("get") || hasWord("show") || hasWord("list")) return "READ";
  if (isQuestion) return "SEARCH";
  return "READ";
}
