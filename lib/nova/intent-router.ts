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
      promptSuffix: "\n[PLANNING MODE] Generate a comprehensive plan with: Objectives, Milestones, Tasks, Subtasks, Dependencies, Risks, Timeline, Success metrics. Think like an experienced project manager. Use workspace context to inform the plan. Present the plan and offer to execute it after the user confirms.",
    };
  } else if (isActionIntent(intent)) {
    decision = {
      path: "ACTION",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "standard",
      timeoutMs: 50000,
      promptSuffix: "\n[ACTION MODE] Execute this request using the available tools. You MUST call at least one tool before responding: resolve the target entity (project, task, member) with a read/search tool if not already verified, then perform the requested write with the appropriate tool. Never answer from context alone — act on real data. NEVER claim an action succeeded without a successful tool result from the write tool. If the write tool failed, say what failed and what you need. For MEDIUM risk actions (create, update, assign, bulk changes) ask for ONE confirmation before executing. HIGH risk (delete, billing, permissions): never attempt — explain and stop.",
    };
  } else if (isAnalysisIntent(intent)) {
    decision = {
      path: "ANALYSIS",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "full",
      timeoutMs: 50000,
      promptSuffix: "\n[ANALYSIS MODE] Analyze the available information and provide insights with evidence from the workspace. Use the available tools (project_health_analysis, predict_project_risk, search_tasks_and_projects, list_tasks, list_projects, get_team_activity) to gather real data when the workspace context is insufficient. Surface proactive insights about risks, blockers, and opportunities.",
    };
  } else if (intent === "READ" || intent === "SEARCH") {
    decision = {
      path: "CHAT",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "standard",
      timeoutMs: 50000,
      promptSuffix: "\n[CHAT MODE] Use tools to load real workspace data when relevant (search, get tasks, projects, members). You can read and analyze, but do not create, update, or delete anything without asking. Reference workspace data by name.",
    };
  } else {
    decision = {
      path: "CHAT",
      toolCategories: categoriesForIntent(intent),
      contextDepth: "standard",
      timeoutMs: 50000,
      promptSuffix: "\n[CHAT MODE] Be helpful and concise. Use tools to load real workspace data when relevant. Never invent data.",
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
