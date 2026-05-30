export type ContextPriority = 1 | 2 | 3 | 4 | 5 | 6;
export type ContextSource = "CURRENT_TASK" | "CURRENT_DOCUMENT" | "CURRENT_PROJECT" | "CURRENT_SPRINT" | "WORKSPACE" | "HISTORICAL_MEMORY";

export interface ContextSourceDefinition {
  source: ContextSource;
  priority: ContextPriority;
  description: string;
}

export const CONTEXT_PRIORITY_HIERARCHY: ContextSourceDefinition[] = [
  { source: "CURRENT_TASK", priority: 1, description: "Current task assignee, status, priority, dependencies" },
  { source: "CURRENT_DOCUMENT", priority: 2, description: "Current document, related tasks, recent edits" },
  { source: "CURRENT_PROJECT", priority: 3, description: "Project goals, milestones, deadlines, status" },
  { source: "CURRENT_SPRINT", priority: 4, description: "Sprint progress, capacity, risks, blockers" },
  { source: "WORKSPACE", priority: 5, description: "Workspace settings, team structure, installed integrations" },
  { source: "HISTORICAL_MEMORY", priority: 6, description: "User preferences, past behavior, recurring patterns" },
];

export const CONTEXT_RULES: string[] = [
  "Nova must use available context rather than asking for it",
  "Nova must avoid asking redundant questions",
  "Nova must adapt responses to current state",
  "Nova must never ignore active context",
  "Nova must never override user intent",
  "Nova must never use unrelated context",
];

export const CONTEXT_WINDOW_STRATEGY: string[] = [
  "Context should be relevant, not everything",
  "More context is not always better",
  "Only useful context should be loaded",
  "Priority determines what gets included first",
];

export function getContextPriority(source: ContextSource): ContextPriority {
  const definition = CONTEXT_PRIORITY_HIERARCHY.find(c => c.source === source);
  return definition?.priority ?? 5;
}
