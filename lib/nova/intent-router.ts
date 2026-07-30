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
      promptSuffix: "\n[PLANNING MODE] Generate a comprehensive plan with: Objectives, Milestones, Tasks, Subtasks, Dependencies, Risks, Timeline, Success metrics. Think like an experienced project manager. Use workspace context to inform the plan. Note: You are in observation mode and cannot execute the plan yourself — provide guidance for the user to implement it.",
    };
  } else if (isActionIntent(intent)) {
    decision = {
      path: "ANALYSIS",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "standard",
      timeoutMs: 50000,
      promptSuffix: "\n[OBSERVATION MODE] You are in observation mode and cannot execute workspace actions. Instead of executing the requested action, explain to the user what needs to be done and guide them to use the Theta interface. Provide clear step-by-step instructions if they want to perform the action themselves.",
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
      path: "CHAT",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "standard",
      timeoutMs: 50000,
      promptSuffix: "\n[OBSERVATION MODE] You are in observation mode.",
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
