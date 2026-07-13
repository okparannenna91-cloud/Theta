import { type NovaIntent, type DecisionStrategy } from "./decision-framework";
import { categoriesForIntent, type ToolCategory } from "@/lib/ai-tools/registry";
import { logger } from "@/lib/logger";

export type NovaPath = "CHAT" | "ACTION" | "ANALYSIS" | "CONVERSATION";

export interface RouteDecision {
  path: NovaPath;
  toolCategories: ToolCategory[];
  contextDepth: "minimal" | "standard" | "full";
  timeoutMs: number;
  promptSuffix: string;
}

const NEGATION_PATTERNS = [
  /\b(?:don't|do not|never|stop|avoid|cease)\s+(?:create|make|add|delete|remove|destroy|erase|purge|update|edit|modify|change|automate|import|export)\b/i,
  /\b(?:not|n't)\s+(?:to\s+)?(?:create|make|add|delete|remove|destroy|erase|purge|update|edit|modify|change|automate|import|export)\b/i,
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

function isActionIntent(intent: NovaIntent): boolean {
  return ["CREATE", "UPDATE", "DELETE", "AUTOMATE", "IMPORT", "EXPORT"].includes(intent);
}

function isAnalysisIntent(intent: NovaIntent): boolean {
  return ["ANALYZE", "REPORT"].includes(intent);
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

function isConversationalPrompt(prompt: string): boolean {
  if (isNegatedAction(prompt)) return true;
  if (isPurelySocial(prompt)) return true;
  if (involvesWorkspaceData(prompt)) return false;

  const isQuestion = /^(?:what|why|how|when|where|who|is|are|can|could|would|should|does|do|did|has|have|will|shall|may| might)\b/i.test(prompt.trim());
  if (isQuestion) {
    const hasExplicitAction = /\b(?:create|make|add|delete|remove|update|edit|modify|change|automate|import|export)\b/i.test(prompt);
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
      promptSuffix: "\n[CONVERSATION MODE] Respond naturally and conversationally. You do NOT have access to any tools in this mode. Do not attempt to create, modify, or delete any data.",
    };
  } else if (isActionIntent(intent)) {
    decision = {
      path: "ACTION",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "standard",
      timeoutMs: 50000,
      promptSuffix: "",
    };
  } else if (isAnalysisIntent(intent)) {
    decision = {
      path: "ANALYSIS",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "full",
      timeoutMs: 50000,
      promptSuffix: "\n[ANALYSIS MODE] Analyze the available information and provide insights with evidence from the workspace.",
    };
  } else if (intent === "READ" || intent === "SEARCH") {
    decision = {
      path: "CHAT",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "standard",
      timeoutMs: 50000,
      promptSuffix: "\n[CHAT MODE] Use tools to read information when explicitly asked. Do not create, update, or delete anything.",
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
  logger.info("[Nova-Router] Routed request", {
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
