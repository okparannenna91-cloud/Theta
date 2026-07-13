export { NovaAgent } from "./nova-agent";
export type { NovaAgentState, NovaRoute } from "./nova-agent";
export { routeModel, executeWithProvider } from "./model-router";
export type { RouterConfig, RouterProvider, TaskCategory } from "./model-router";
export { buildLangGraphTools, buildToolByName, getAvailableToolNames, buildLangGraphToolWrapper } from "./tools";
export type { LangGraphToolContext } from "./tools";

import { NovaAgent } from "./nova-agent";
import { routeModel } from "./model-router";
import type { RouteDecision } from "@/lib/nova/intent-router";
import type { NovaIntent } from "@/lib/nova/constitution/decision-framework";
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
  const agent = new NovaAgent({ userId: options.userId, workspaceId: options.workspaceId, projectId: options.projectId });

  logger.info("[LangGraph] Running Nova agent", { workspaceId: options.workspaceId, promptPreview: prompt.substring(0, 80) });

  const finalState = await agent.execute({
    prompt,
    systemPrompt: options.systemPrompt,
    userId: options.userId,
    workspaceId: options.workspaceId,
    projectId: options.projectId,
    conversationId: options.conversationId,
    pageContext: options.pageContext,
    route: "CHAT",
    intent: options.intent,
    routeDecision: options.routeDecision,
    routerConfig: routeModel(prompt),
    toolResults: [],
    response: "",
  });

  return {
    response: finalState.response,
    route: finalState.route,
    provider: finalState.routerConfig?.provider || "unknown",
    model: finalState.routerConfig?.model || "unknown",
    toolResults: finalState.toolResults,
    durationMs: Date.now() - start,
  };
}


