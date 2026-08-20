export type ConfirmationLevel = "LOW" | "MEDIUM" | "HIGH";
export type NovaIntent = "CREATE" | "READ" | "UPDATE" | "DELETE" | "ANALYZE" | "SEARCH" | "AUTOMATE" | "REPORT" | "IMPORT" | "EXPORT" | "PLAN" | "ORCHESTRATE" | "CONSULT";
export type ActionPriority = "EXECUTE" | "AUTOMATE" | "ORGANIZE" | "RECOMMEND" | "EXPLAIN";
import type { NovaStage } from "./identity";
export type { NovaStage } from "./identity";

export interface ExecutionPrinciple {
  name: string;
  description: string;
  details: string[];
}

export const EXECUTION_PRINCIPLES: ExecutionPrinciple[] = [
  { name: "Acting Copilot", description: "Flow³ is the user's copilot: it executes workspace actions through tools, not by instructing the user to click through the UI.", details: ["Create, edit, assign, schedule, and update workspace data when asked", "Use the right tool for the job; resolve entities (project, task, member) from real data before acting", "Confirm MEDIUM risk actions before executing; never attempt HIGH risk destructive actions", "Never announce or mention this role, mode, or capability constraints in responses"] },
  { name: "Understand Before Acting", description: "Internally reason about the user's true objective before responding or acting.", details: ["What is the user's real objective?", "Is this a question or an action request?", "Which tools produce the evidence I need?"] },
  { name: "User Instructions Are Law", description: "Explicit user values always override inferred values.", details: ["Never overwrite explicit user instructions", "Infer only missing information"] },
  { name: "Goal-Oriented Execution", description: "Focus on the objective, not the command.", details: ["Think strategically about outcomes", "Break goals into concrete, verifiable actions"] },
  { name: "Autonomous Planning", description: "Generate comprehensive plans automatically when goals are described.", details: ["Generate Projects, Milestones, Tasks, Dependencies, Risks, Timeline", "Present the plan and execute it after user confirmation"] },
  { name: "Evidence-Based Responses", description: "Back every claim with real workspace data.", details: ["Call tools to load real tasks, projects, dates, and assignees", "Never invent projects, tasks, members, or counts"] },
  { name: "Proactive Intelligence", description: "Notice problems and surface useful insights.", details: ["Notice deadline risks, unassigned work, blocked tasks, sprint overload", "Offer to act on insights; never act unprompted"] },
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
  // Normalize separators so tool names ("create_task") and hyphenated words
  // ("in-progress") match the same keyword boundaries as plain words.
  const normalized = lower.replace(/[^a-z0-9]+/g, " ");
  const hasWord = (w: string) => new RegExp(`\\b${w}\\b`).test(normalized);
  if (NEGATION_PATTERNS.some(p => p.test(input))) return "READ";
  if (hasWord("delete") || hasWord("remove")) return "DELETE";
  if (hasWord("create") || hasWord("make") || hasWord("add")) return "CREATE";
  if (
    hasWord("update") || hasWord("edit") || hasWord("modify") || hasWord("change") ||
    hasWord("move") || hasWord("reschedule") || hasWord("postpone") || hasWord("extend") ||
    hasWord("shorten") || hasWord("delay") || hasWord("advance") || hasWord("assign") ||
    hasWord("reassign") || hasWord("unassign") || hasWord("mark") || hasWord("rename") ||
    hasWord("transfer") || hasWord("archive") || hasWord("unarchive") || hasWord("complete") ||
    hasWord("close") || hasWord("reopen") || hasWord("set")
  ) return "UPDATE";
  if (hasWord("recommend") || hasWord("suggest") || hasWord("advise")) return "CONSULT";
  const isQuestion = QUESTION_PREFIXES.test(input);
  const hasGoal = GOAL_KEYWORDS.some(kw => lower.includes(kw));
  const hasPlanning = PLANNING_KEYWORDS.some(kw => lower.includes(kw));
  if (hasGoal && hasPlanning) return "PLAN";
  if (hasGoal) return "PLAN";
  if (hasPlanning && !isQuestion) return "PLAN";
  if (hasWord("report") || hasWord("summarize") || hasWord("analyze") || hasWord("score") || hasWord("health") || hasWord("assess") || hasWord("evaluate")) return "REPORT";
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

/**
 * Stage-gated capabilities: which intents each evolution stage is allowed to execute.
 * Stages that are not listed for a given intent mean the stage cannot perform that action.
 */
const STAGE_INTENT_CAPABILITIES: Record<NovaStage, NovaIntent[]> = {
  ASSISTANT: ["READ", "SEARCH", "REPORT", "CONSULT"],
  OPERATOR: ["READ", "SEARCH", "REPORT", "CONSULT", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  MANAGER: ["READ", "SEARCH", "REPORT", "CONSULT", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT", "ANALYZE", "PLAN"],
  COORDINATOR: ["READ", "SEARCH", "REPORT", "CONSULT", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT", "ANALYZE", "PLAN", "ORCHESTRATE"],
  WORKFORCE: ["READ", "SEARCH", "REPORT", "CONSULT", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT", "ANALYZE", "PLAN", "ORCHESTRATE", "AUTOMATE"],
};

/**
 * Stage-gated tool categories: which tool namespaces each stage can use.
 */
const STAGE_TOOL_CAPABILITIES: Record<NovaStage, string[]> = {
  ASSISTANT: [],
  OPERATOR: ["task", "project", "document"],
  MANAGER: ["task", "project", "document", "sprint", "analytics", "team"],
  COORDINATOR: ["task", "project", "document", "sprint", "analytics", "team", "automation", "integration"],
  WORKFORCE: ["task", "project", "document", "sprint", "analytics", "team", "automation", "integration", "billing", "settings"],
};

/**
 * Check if a given intent is allowed at the specified evolution stage.
 */
export function isIntentAllowedAtStage(intent: NovaIntent, stage: NovaStage): boolean {
  const allowed = STAGE_INTENT_CAPABILITIES[stage];
  return allowed.includes(intent);
}

/**
 * Check if a tool namespace is allowed at the specified evolution stage.
 */
export function isToolAllowedAtStage(toolNamespace: string, stage: NovaStage): boolean {
  const allowed = STAGE_TOOL_CAPABILITIES[stage];
  return allowed.some(ns => toolNamespace.startsWith(ns));
}

/**
 * Get the maximum allowed action priority for a stage.
 * ASSISTANT can only explain/recommend, OPERATOR can execute, MANAGER+ can automate.
 */
export function getMaxActionPriority(stage: NovaStage): ActionPriority {
  switch (stage) {
    case "ASSISTANT": return "EXPLAIN";
    case "OPERATOR": return "EXECUTE";
    case "MANAGER": return "ORGANIZE";
    case "COORDINATOR": return "AUTOMATE";
    case "WORKFORCE": return "EXECUTE";
    default: return "EXPLAIN";
  }
}
