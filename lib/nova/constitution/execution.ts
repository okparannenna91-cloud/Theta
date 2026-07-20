export type ConfirmationLevel = "LOW" | "MEDIUM" | "HIGH";
export type NovaIntent = "CREATE" | "READ" | "UPDATE" | "DELETE" | "ANALYZE" | "SEARCH" | "AUTOMATE" | "REPORT" | "IMPORT" | "EXPORT" | "PLAN" | "ORCHESTRATE" | "CONSULT";
export type ActionPriority = "EXECUTE" | "AUTOMATE" | "ORGANIZE" | "RECOMMEND" | "EXPLAIN";

export interface ExecutionPrinciple {
  name: string;
  description: string;
  details: string[];
}

export const EXECUTION_PRINCIPLES: ExecutionPrinciple[] = [
  { name: "Understand Before Acting", description: "Internally reason about the user's true objective before responding.", details: ["What is the user's real objective?", "Is this a question or action?", "Which tools are required?", "Which workspace/project?", "What permissions apply?"] },
  { name: "User Instructions Are Law", description: "Explicit user values always override inferred values.", details: ["Never overwrite explicit user instructions", "Infer only missing information"] },
  { name: "Goal-Oriented Thinking", description: "Focus on the objective, not the command.", details: ["Think strategically about outcomes", "Recommend comprehensive plans"] },
  { name: "Autonomous Planning", description: "Generate comprehensive plans automatically when goals are described.", details: ["Generate Projects, Milestones, Tasks, Dependencies, Risks, Timeline"] },
  { name: "Tool Orchestration", description: "Think in workflows, not single tools.", details: ["Orchestrate multiple tools automatically", "Think in complete workflows"] },
  { name: "Reliable Execution", description: "Validate everything before executing. Never silently fail.", details: ["Validate Permissions, Workspace, Arguments, Dependencies", "Explain failures clearly"] },
  { name: "Proactive Intelligence", description: "Notice problems and surface useful insights.", details: ["Notice deadline risks, unassigned work, blocked tasks, sprint overload"] },
];

export const CONFIRMATION_RULES: Record<ConfirmationLevel, string> = {
  LOW: "Execute immediately",
  MEDIUM: "Ask one precise clarification",
  HIGH: "Explain ambiguity before acting",
};

export const ACTION_PRIORITY_ORDER: ActionPriority[] = ["EXECUTE", "AUTOMATE", "ORGANIZE", "RECOMMEND", "EXPLAIN"];

const NEGATION_PATTERNS = [/\b(?:don't|do not|never|stop|avoid|cease)\s+(?:create|make|add|delete|remove|update|edit|modify|change|automate|import|export|plan|orchestrate)\b/i];
const QUESTION_PREFIXES = /^(?:what|why|how|when|where|who|is|are|can|could|would|should|does|do|did|has|have|will|shall|may|might)\b/i;
const GOAL_KEYWORDS = ["want", "need", "goal", "objective", "target", "plan to", "trying to", "looking to"];
const PLANNING_KEYWORDS = ["plan", "strategy", "roadmap", "timeline", "milestone", "phase", "sprint", "launch", "campaign"];

export function intentFromString(input: string): NovaIntent {
  const lower = input.toLowerCase();
  const hasWord = (w: string) => new RegExp(`\\b${w}\\b`).test(lower);
  if (NEGATION_PATTERNS.some(p => p.test(input))) return "READ";
  if (hasWord("delete") || hasWord("remove")) return "DELETE";
  if (hasWord("create") || hasWord("make") || hasWord("add")) return "CREATE";
  if (hasWord("update") || hasWord("edit") || hasWord("modify")) return "UPDATE";
  if (hasWord("recommend") || hasWord("suggest") || hasWord("advise")) return "CONSULT";
  const isQuestion = QUESTION_PREFIXES.test(input);
  const hasGoal = GOAL_KEYWORDS.some(kw => lower.includes(kw));
  const hasPlanning = PLANNING_KEYWORDS.some(kw => lower.includes(kw));
  if (hasGoal && hasPlanning) return "PLAN";
  if (hasGoal) return "PLAN";
  if (hasPlanning && !isQuestion) return "PLAN";
  if (hasWord("report") || hasWord("summarize") || hasWord("analyze")) return "REPORT";
  if (hasWord("search") || hasWord("find") || hasWord("lookup")) return "SEARCH";
  if (hasWord("automate") || hasWord("trigger")) return "AUTOMATE";
  if (hasWord("import")) return "IMPORT";
  if (hasWord("export")) return "EXPORT";
  if (isQuestion) return "SEARCH";
  return "READ";
}

export function getConfidenceLevel(input: string, context: { hasWorkspace: boolean; hasProject: boolean; hasTask: boolean; hasTeam: boolean }): "HIGH" | "MEDIUM" | "LOW" {
  const hasExplicitTitle = /\b(?:called|named|titled)\s+["']?[\w\s]+["']?/i.test(input);
  const hasExplicitPriority = /\b(?:priority|high|medium|low|urgent|critical)\b/i.test(input);
  const hasExplicitDate = /\b(?:due|deadline|by|before|until)\s+/i.test(input);
  const hasExplicitAssignee = /\b(?:assign|assigned to|give to)\b/i.test(input);
  const explicitCount = [hasExplicitTitle, hasExplicitPriority, hasExplicitDate, hasExplicitAssignee].filter(Boolean).length;
  const contextCount = [context.hasWorkspace, context.hasProject, context.hasTask, context.hasTeam].filter(Boolean).length;
  if (explicitCount >= 2 && contextCount >= 2) return "HIGH";
  if (explicitCount >= 1 && contextCount >= 1) return "MEDIUM";
  if (contextCount >= 2) return "MEDIUM";
  return "LOW";
}
