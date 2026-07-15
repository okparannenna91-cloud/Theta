import { type NovaIntent, type DecisionStrategy } from "./decision-framework";
import { categoriesForIntent, type ToolCategory } from "@/lib/ai-tools/registry";
import { logger } from "@/lib/logger";

export type NovaPath = "CHAT" | "ACTION" | "ANALYSIS" | "CONVERSATION" | "PLANNING" | "ORCHESTRATION";

export interface RouteDecision {
  path: NovaPath;
  toolCategories: ToolCategory[];
  contextDepth: "minimal" | "standard" | "full";
  timeoutMs: number;
  promptSuffix: string;
}

const NEGATION_PATTERNS = [
  /\b(?:don't|do not|never|stop|avoid|cease)\s+(?:create|make|add|delete|remove|destroy|erase|purge|update|edit|modify|change|automate|import|export|plan|orchestrate)\b/i,
  /\b(?:not|n't)\s+(?:to\s+)?(?:create|make|add|delete|remove|destroy|erase|purge|update|edit|modify|change|automate|import|export|plan|orchestrate)\b/i,
];

const WORKSPACE_QUESTION_KEYWORDS = [
  "task", "tasks", "project", "projects", "team", "member", "members",
  "sprint", "deadline", "overdue", "health", "status", "progress",
  "velocity", "backlog", "milestone", "calendar", "schedule", "budget",
  "workload", "risk", "risks", "blocker", "blockers", "report",
  "standup", "brief", "summary", "activity", "completion", "delivery",
  "board", "timeline", "epic", "estimation", "capacity",
];

const SOCIAL_PATTERNS = /^(?:hi|hey|hello|thanks|thank you|bye|goodbye|good morning|good afternoon|good evening|how are you|what'?s up|sup|yo|help)\b/i;

const GOAL_KEYWORDS = [
  "want", "need", "goal", "objective", "target", "aim", "plan to", "trying to",
  "looking to", "hoping to", "want to", "need to",
];

const PLANNING_KEYWORDS = [
  "plan", "strategy", "roadmap", "timeline", "milestone", "phase", "sprint",
  "quarterly", "annual", "launch", "campaign", "initiative",
];

function isActionIntent(intent: NovaIntent): boolean {
  return ["CREATE", "UPDATE", "DELETE", "AUTOMATE", "IMPORT", "EXPORT"].includes(intent);
}

function isAnalysisIntent(intent: NovaIntent): boolean {
  return ["ANALYZE", "REPORT"].includes(intent);
}

function isPlanningIntent(intent: NovaIntent): boolean {
  return ["PLAN", "ORCHESTRATE", "CONSULT"].includes(intent);
}

function involvesWorkspaceData(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return WORKSPACE_QUESTION_KEYWORDS.some(kw => lower.includes(kw));
}

function isPurelySocial(prompt: string): boolean {
  return SOCIAL_PATTERNS.test(prompt.trim());
}

function isNegatedAction(prompt: string): boolean {
  return NEGATION_PATTERNS.some(p => p.test(prompt));
}

function isGoalOriented(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const hasGoalKeyword = GOAL_KEYWORDS.some(kw => lower.includes(kw));
  const hasPlanningKeyword = PLANNING_KEYWORDS.some(kw => lower.includes(kw));
  return hasGoalKeyword || hasPlanningKeyword;
}

function isConversationalPrompt(prompt: string): boolean {
  if (isNegatedAction(prompt)) return true;
  if (isPurelySocial(prompt)) return true;
  if (involvesWorkspaceData(prompt)) return false;
  if (isGoalOriented(prompt)) return false;

  const isQuestion = /^(?:what|why|how|when|where|who|is|are|can|could|would|should|does|do|did|has|have|will|shall|may| might)\b/i.test(prompt.trim());
  if (isQuestion) {
    const hasExplicitAction = /\b(?:create|make|add|delete|remove|update|edit|modify|change|automate|import|export|plan|orchestrate)\b/i.test(prompt);
    return !hasExplicitAction;
  }

  return false;
}

export function routeRequest(
  prompt: string,
  intent: NovaIntent,
  strategy: DecisionStrategy,
): RouteDecision {
  const start = performance.now();

  let decision: RouteDecision;

  if (isConversationalPrompt(prompt)) {
    decision = {
      path: "CONVERSATION",
      toolCategories: [],
      contextDepth: "minimal",
      timeoutMs: 30000,
      promptSuffix: "\n[CONVERSATION MODE] Respond naturally and conversationally. You do NOT have access to any tools in this mode. Do not attempt to create, modify, or delete any data. Sound like a trusted teammate.",
    };
  } else if (isPlanningIntent(intent)) {
    decision = {
      path: "PLANNING",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "full",
      timeoutMs: 60000,
      promptSuffix: "\n[PLANNING MODE] Generate a comprehensive plan with: Objectives, Milestones, Tasks, Subtasks, Dependencies, Risks, Timeline, Success metrics. Think like an experienced project manager. Use workspace context to inform the plan.",
    };
  } else if (isActionIntent(intent)) {
    decision = {
      path: "ACTION",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "standard",
      timeoutMs: 50000,
      promptSuffix: "\n[ACTION MODE] Execute the requested action. Validate permissions, arguments, and dependencies before executing. Provide a clear summary of what was done.",
    };
  } else if (isAnalysisIntent(intent)) {
    decision = {
      path: "ANALYSIS",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "full",
      timeoutMs: 50000,
      promptSuffix: "\n[ANALYSIS MODE] Analyze the available information and provide insights with evidence from the workspace. Surface proactive insights about risks, blockers, and opportunities.",
    };
  } else if (intent === "READ" || intent === "SEARCH") {
    decision = {
      path: "CHAT",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "standard",
      timeoutMs: 50000,
      promptSuffix: "\n[CHAT MODE] Use tools to read information when explicitly asked. Do not create, update, or delete anything. Reference workspace data by name.",
    };
  } else {
    decision = {
      path: "ACTION",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "standard",
      timeoutMs: 50000,
      promptSuffix: "",
    };
  }

  const elapsed = performance.now() - start;
  logger.info("[NovaPrime-Router] Routed request", {
    path: decision.path,
    intent,
    strategy,
    contextDepth: decision.contextDepth,
    toolCount: decision.toolCategories.length,
    timeoutMs: decision.timeoutMs,
    routingLatencyMs: Math.round(elapsed),
  });

  return decision;
}
