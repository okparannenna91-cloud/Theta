import { type NovaIntent, type DecisionStrategy } from "./decision-framework";
import { categoriesForIntent, type ToolCategory } from "@/lib/ai-tools/registry";
import { logger } from "@/lib/logger";

export type NovaPath = "CHAT" | "ACTION" | "ANALYSIS";

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

function isChatPrompt(prompt: string, intent: NovaIntent, strategy: DecisionStrategy): boolean {
  if (intent !== "READ" && intent !== "SEARCH") return false;
  if (isActionIntent(intent) || isAnalysisIntent(intent)) return false;
  const hasEntityRef = /\b(task|project|member|workspace|document|tool|integration|form|board|sprint|epic|billing|subscription)\b/i.test(prompt);
  return !hasEntityRef;
}

export function routeRequest(
  prompt: string,
  intent: NovaIntent,
  strategy: DecisionStrategy,
): RouteDecision {
  const start = performance.now();

  let decision: RouteDecision;

  if (isActionIntent(intent)) {
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
      toolCategories: ["ANALYSIS", "TASK", "PROJECT", "DOCUMENT", "WORKSPACE", "MEMORY"],
      contextDepth: "full",
      timeoutMs: 50000,
      promptSuffix: "\n[ANALYSIS MODE] Provide thorough analysis with data, metrics, and actionable recommendations. Support your analysis with evidence from the workspace.",
    };
  } else if (isChatPrompt(prompt, intent, strategy)) {
    decision = {
      path: "CHAT",
      toolCategories: ["MEMORY"],
      contextDepth: "minimal",
      timeoutMs: 30000,
      promptSuffix: "\n[CHAT MODE] This is a general conversation. Respond naturally and helpfully. You do not have access to workspace tools in this mode.",
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
