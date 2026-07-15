export type NovaIntent = "CREATE" | "READ" | "UPDATE" | "DELETE" | "ANALYZE" | "SEARCH" | "AUTOMATE" | "REPORT" | "IMPORT" | "EXPORT" | "PLAN" | "ORCHESTRATE" | "CONSULT";
export type DecisionStrategy = "PATH_A_IMMEDIATE" | "PATH_B_CONFIRMATION" | "PATH_C_MULTISTEP" | "PATH_D_INFO" | "PATH_E_PLANNING" | "PATH_F_ORCHESTRATION";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type ActionType = "ANSWER" | "ASK" | "RECOMMEND" | "EXECUTE" | "PLAN" | "ORCHESTRATE";

export interface DecisionPhase {
  name: string;
  description: string;
  steps: string[];
}

export const DECISION_PHASES: DecisionPhase[] = [
  {
    name: "Phase 1: Understand Objective",
    description: "Determine the user's true objective, not just the literal command.",
    steps: [
      "Identify what the user literally asked for",
      "Determine what the user actually wants to achieve",
      "Distinguish between questions and actions",
      "Identify if this is a goal that requires planning",
    ],
  },
  {
    name: "Phase 2: Build Mental Model",
    description: "Gather complete workspace context before acting.",
    steps: [
      "Load workspace: name, plan, team, projects",
      "Load project: name, tasks, milestones, deadline, status",
      "Load task: title, description, status, priority, assignee, dependencies",
      "Load sprint: capacity, progress, risks",
      "Load team: members, roles, workload",
      "Load permissions: user role, access level",
      "Load memory: preferences, past decisions, conventions",
      "Load conversation: recent context, unresolved items",
    ],
  },
  {
    name: "Phase 3: Assess Confidence",
    description: "Determine confidence level and choose appropriate response strategy.",
    steps: [
      "High confidence: clear intent, all context available → Execute",
      "Medium confidence: minor ambiguity, missing optional info → Ask one question",
      "Low confidence: major ambiguity, conflicting instructions → Explain uncertainty",
      "Never ask unnecessary questions",
    ],
  },
  {
    name: "Phase 4: Risk Assessment",
    description: "Classify action risk and determine approval requirements.",
    steps: [
      "Classify action risk: LOW / MEDIUM / HIGH",
      "LOW: Execute immediately (create task, read status)",
      "MEDIUM: Ask one clarification (bulk edits, ambiguous goals)",
      "HIGH: Explain uncertainty (deletions, billing, irreversible changes)",
      "Check for conflicts, duplicates, invalid dates, missing dependencies",
    ],
  },
  {
    name: "Phase 5: Execution Strategy",
    description: "Choose the appropriate execution path.",
    steps: [
      "PATH_A_IMMEDIATE: Single tool, low risk, execute now",
      "PATH_B_CONFIRMATION: Medium risk, ask one question first",
      "PATH_C_MULTISTEP: Multiple tools needed, orchestrate workflow",
      "PATH_D_INFO: Question, provide answer from context",
      "PATH_E_PLANNING: Goal described, generate comprehensive plan",
      "PATH_F_ORCHESTRATION: Complex goal, multi-phase execution plan",
    ],
  },
  {
    name: "Phase 6: Execute & Summarize",
    description: "Execute the plan and generate natural language summary.",
    steps: [
      "Execute all tools in the workflow",
      "Validate each result",
      "Generate natural language summary of what was accomplished",
      "Reference workspace data by name",
      "Offer next steps or follow-up actions",
      "Identify proactive insights (deadline risks, unassigned work, etc.)",
    ],
  },
];

export const DECISION_PRIORITY_ORDER: string[] = [
  "User's explicit instructions (highest priority)",
  "User's real objective",
  "Workspace rules",
  "Team preferences",
  "Historical behavior",
  "Smart defaults",
  "Default system behavior",
];

const NEGATION_PATTERNS = [
  /\b(?:don't|do not|never|stop|avoid|cease)\s+(?:create|make|add|delete|remove|destroy|erase|purge|update|edit|modify|change|automate|import|export|plan|orchestrate)\b/i,
  /\b(?:not|n't)\s+(?:to\s+)?(?:create|make|add|delete|remove|destroy|erase|purge|update|edit|modify|change|automate|import|export|plan|orchestrate)\b/i,
];

const QUESTION_PREFIXES = /^(?:what|why|how|when|where|who|is|are|can|could|would|should|does|do|did|has|have|will|shall|may|might)\b/i;

const GOAL_KEYWORDS = [
  "want", "need", "goal", "objective", "target", "aim", "plan to", "trying to",
  "looking to", "hoping to", "want to", "need to", "should", "must",
];

const PLANNING_KEYWORDS = [
  "plan", "strategy", "roadmap", "timeline", "milestone", "phase", "sprint",
  "quarterly", "annual", "launch", "campaign", "initiative", "project",
];

export function intentFromString(input: string): NovaIntent {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const hasWord = (w: string) => new RegExp(`\\b${w}\\b`).test(lower);

  const hasNegation = NEGATION_PATTERNS.some(p => p.test(trimmed));
  if (hasNegation) return "READ";

  // Check action intents FIRST (before planning) - explicit actions take priority
  if (hasWord("delete") || hasWord("remove") || hasWord("destroy") || hasWord("erase") || hasWord("purge")) return "DELETE";
  if (hasWord("create") || hasWord("make") || hasWord("add")) return "CREATE";
  if (hasWord("update") || hasWord("edit") || hasWord("modify") || hasWord("change")) return "UPDATE";

  // Check consult/recommendation intents
  if (hasWord("recommend") || hasWord("suggest") || hasWord("advise") || hasWord("consult") || hasWord("opinion")) return "CONSULT";

  const isQuestion = QUESTION_PREFIXES.test(trimmed);
  const hasGoalKeyword = GOAL_KEYWORDS.some(kw => lower.includes(kw));
  const hasPlanningKeyword = PLANNING_KEYWORDS.some(kw => lower.includes(kw));

  // Planning intents (goals and strategies)
  if (hasGoalKeyword && hasPlanningKeyword) return "PLAN";
  if (hasGoalKeyword) return "PLAN";
  if (hasPlanningKeyword && !isQuestion) return "PLAN";

  if (hasWord("orchestrate") || (hasWord("workflow") && hasWord("create"))) return "ORCHESTRATE";

  if (hasWord("report") || hasWord("summarize") || hasWord("analyze")) return "REPORT";
  if (hasWord("search") || hasWord("find") || hasWord("lookup")) return "SEARCH";
  if (hasWord("automate") || hasWord("trigger")) return "AUTOMATE";
  if (hasWord("import")) return "IMPORT";
  if (hasWord("export")) return "EXPORT";
  if (hasWord("read") || hasWord("get") || hasWord("show") || hasWord("list")) return "READ";
  if (isQuestion) return "SEARCH";
  return "READ";
}

export function getConfidenceLevel(input: string, context: { hasWorkspace: boolean; hasProject: boolean; hasTask: boolean; hasTeam: boolean }): "HIGH" | "MEDIUM" | "LOW" {
  const lower = input.toLowerCase();
  const hasExplicitTitle = /\b(?:called|named|titled|title)\s+["']?[\w\s]+["']?/i.test(input);
  const hasExplicitPriority = /\b(?:priority|high|medium|low|urgent|critical)\b/i.test(input);
  const hasExplicitDate = /\b(?:due|deadline|by|before|until)\s+/i.test(input);
  const hasExplicitAssignee = /\b(?:assign|assigned|assigned to|give to)\b/i.test(input);

  const explicitCount = [hasExplicitTitle, hasExplicitPriority, hasExplicitDate, hasExplicitAssignee].filter(Boolean).length;
  const contextCount = [context.hasWorkspace, context.hasProject, context.hasTask, context.hasTeam].filter(Boolean).length;

  // Check for clear action intent (create, update, delete)
  const hasClearAction = /\b(?:create|make|add|delete|remove|update|edit)\b/i.test(input);

  if (explicitCount >= 2 && contextCount >= 2) return "HIGH";
  if (explicitCount >= 1 && contextCount >= 1) return "MEDIUM";
  if (hasClearAction && contextCount >= 1) return "MEDIUM";
  if (contextCount >= 2) return "MEDIUM";
  return "LOW";
}
