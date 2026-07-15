export type ContextPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type ContextSource = "CURRENT_TASK" | "CURRENT_DOCUMENT" | "CURRENT_PROJECT" | "CURRENT_SPRINT" | "WORKSPACE" | "HISTORICAL_MEMORY" | "CONVERSATION_HISTORY" | "PROACTIVE_INSIGHTS";

export interface ContextSourceDefinition {
  source: ContextSource;
  priority: ContextPriority;
  description: string;
  tokenBudget: number;
}

export const CONTEXT_PRIORITY_HIERARCHY: ContextSourceDefinition[] = [
  { source: "CURRENT_TASK", priority: 1, description: "Current task assignee, status, priority, dependencies", tokenBudget: 500 },
  { source: "CURRENT_DOCUMENT", priority: 2, description: "Current document, related tasks, recent edits", tokenBudget: 400 },
  { source: "CURRENT_PROJECT", priority: 3, description: "Project goals, milestones, deadlines, status", tokenBudget: 400 },
  { source: "CURRENT_SPRINT", priority: 4, description: "Sprint progress, capacity, risks, blockers", tokenBudget: 300 },
  { source: "WORKSPACE", priority: 5, description: "Workspace settings, team structure, installed integrations", tokenBudget: 300 },
  { source: "CONVERSATION_HISTORY", priority: 6, description: "Recent conversation context, unresolved items, decisions made", tokenBudget: 500 },
  { source: "HISTORICAL_MEMORY", priority: 7, description: "User preferences, past behavior, recurring patterns, conventions", tokenBudget: 300 },
];

export const CONTEXT_RULES: string[] = [
  "Nova must use available context rather than asking for it",
  "Nova must avoid asking redundant questions",
  "Nova must adapt responses to current state",
  "Nova must never ignore active context",
  "Nova must never override user intent",
  "Nova must never use unrelated context",
  "Nova must respect token budgets per context source",
  "Nova must prioritize high-priority context when budget is limited",
  "Nova must include conversation history to maintain continuity",
  "Nova must surface proactive insights when context reveals problems",
];

export const CONTEXT_WINDOW_STRATEGY: string[] = [
  "Total context budget: 4000 tokens",
  "Respect per-source token budgets",
  "Priority determines inclusion order when budget is limited",
  "High-priority context always included first",
  "Truncate low-priority context before high-priority context",
  "Include conversation history to maintain continuity",
  "Surface proactive insights when context reveals problems",
  "Never silently drop critical context",
];

export const PROACTIVE_INSIGHT_TYPES: string[] = [
  "DEADLINE_RISK: Tasks approaching deadline with low completion",
  "UNASSIGNED_WORK: Tasks without assignees",
  "BLOCKED_TASKS: Tasks blocked by dependencies or issues",
  "SPRINT_OVERLOAD: Sprint capacity exceeded",
  "DUPLICATE_WORK: Similar tasks that may be redundant",
  "MISSING_DEPENDENCIES: Tasks with missing prerequisite links",
  "STALLED_PROGRESS: Tasks stuck in same status for too long",
  "CAPACITY_IMBALANCE: Team members with uneven workload",
];

export function getContextPriority(source: ContextSource): ContextPriority {
  const definition = CONTEXT_PRIORITY_HIERARCHY.find(c => c.source === source);
  return definition?.priority ?? 5;
}

export function getTokenBudget(source: ContextSource): number {
  const definition = CONTEXT_PRIORITY_HIERARCHY.find(c => c.source === source);
  return definition?.tokenBudget ?? 300;
}
