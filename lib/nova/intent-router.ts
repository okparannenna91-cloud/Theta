import { type NovaIntent } from "./decision-framework";
import { categoriesForIntent, type ToolCategory } from "@/lib/ai-tools/registry";
import { logger } from "@/lib/logger";

export type NovaPath = "CHAT" | "ACTION" | "ANALYSIS" | "PLANNING" | "ORCHESTRATION";

export interface RouteDecision {
  path: NovaPath;
  toolCategories: ToolCategory[];
  contextDepth: "minimal" | "standard" | "full";
  timeoutMs: number;
  promptSuffix: string;
}

function isActionIntent(intent: NovaIntent): boolean {
  return ["CREATE", "UPDATE", "DELETE", "AUTOMATE", "IMPORT", "EXPORT"].includes(intent);
}

function isAnalysisIntent(intent: NovaIntent): boolean {
  return ["ANALYZE", "REPORT"].includes(intent);
}

function isPlanningIntent(intent: NovaIntent): boolean {
  return ["PLAN", "ORCHESTRATE", "CONSULT"].includes(intent);
}

export function routeRequest(
  prompt: string,
  intent: NovaIntent,
): RouteDecision {
  const start = performance.now();

  let decision: RouteDecision;

  if (isPlanningIntent(intent)) {
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
    contextDepth: decision.contextDepth,
    toolCount: decision.toolCategories.length,
    timeoutMs: decision.timeoutMs,
    routingLatencyMs: Math.round(elapsed),
  });

  return decision;
}
