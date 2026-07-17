export { NovaAgent } from "./nova-agent";
export type { NovaAgentState, NovaRoute, ReasoningContext } from "./nova-agent";
export { routeModel, executeWithProvider } from "./model-router";
export type { RouterConfig, RouterProvider, TaskCategory } from "./model-router";
export { buildLangGraphTools, buildToolByName, getAvailableToolNames, buildLangGraphToolWrapper } from "./tools";
export type { LangGraphToolContext } from "./tools";
export { getLangChainModel, clearModelCache } from "./models";
export { createNovaGraph, runNovaGraph } from "./agent-graph";
export type { NovaGraphInput, NovaGraphOutput } from "./agent-graph";

import type { ReasoningContext } from "./nova-agent";
import { routeModel } from "./model-router";
import type { RouteDecision } from "@/lib/nova/intent-router";
import type { NovaIntent } from "@/lib/nova/constitution/decision-framework";
import { runNovaGraph } from "./agent-graph";
import { logger } from "@/lib/logger";

export interface NovaAgentOptions {
  userId: string;
  workspaceId: string;
  projectId?: string;
  conversationId?: string;
  pageContext?: { path: string; type: string };
  systemPrompt?: string;
  intent: NovaIntent;
  routeDecision: RouteDecision;
  reasoningContext?: ReasoningContext;
}

export interface NovaAgentResult {
  response: string;
  route: string;
  provider: string;
  model: string;
  toolResults: Array<{ toolName: string; result?: unknown; error?: string }>;
  durationMs: number;
}

export async function runNovaAgent(prompt: string, options: NovaAgentOptions): Promise<NovaAgentResult> {
  const start = Date.now();

  logger.info("[LangGraph] Running Nova agent via graph", { workspaceId: options.workspaceId, promptPreview: prompt.substring(0, 80) });

  const routerConfig = routeModel(prompt);

  const result = await runNovaGraph({
    prompt,
    systemPrompt: options.systemPrompt || "You are Nova, the intelligent operating system of Theta.",
    ctx: { userId: options.userId, workspaceId: options.workspaceId, projectId: options.projectId },
    intent: options.intent,
    routeDecision: options.routeDecision,
  });

  return {
    response: result.response,
    route: result.route,
    provider: routerConfig.provider,
    model: routerConfig.model,
    toolResults: result.toolResults,
    durationMs: Date.now() - start,
  };
}


