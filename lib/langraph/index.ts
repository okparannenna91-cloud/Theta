export { NovaAgent } from "./nova-agent";
export type { NovaAgentState, NovaRoute } from "./nova-agent";
export { routeModel, executeWithProvider } from "./model-router";
export type { RouterConfig, RouterProvider, TaskCategory } from "./model-router";
export { buildLangGraphTools, buildToolByName, getAvailableToolNames, buildLangGraphToolWrapper, buildAllLangGraphTools } from "./tools";
export type { LangGraphToolContext } from "./tools";

import { NovaAgent } from "./nova-agent";
import { routeModel } from "./model-router";
import { logger } from "@/lib/logger";

export interface NovaAgentOptions {
  userId: string;
  workspaceId: string;
  projectId?: string;
  conversationId?: string;
  systemPrompt?: string;
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
    route: "CHAT",
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

export async function runStreamingNovaAgent(
  prompt: string,
  options: NovaAgentOptions & { onToken?: (token: string) => void; onFinish?: (text: string) => void; signal?: AbortSignal }
): Promise<NovaAgentResult> {
  const start = Date.now();
  const agent = new NovaAgent({ userId: options.userId, workspaceId: options.workspaceId, projectId: options.projectId });

  logger.info("[LangGraph] Running streaming Nova agent", { workspaceId: options.workspaceId, promptPreview: prompt.substring(0, 80) });

  const finalState = await agent.execute({
    prompt,
    systemPrompt: options.systemPrompt,
    userId: options.userId,
    workspaceId: options.workspaceId,
    projectId: options.projectId,
    conversationId: options.conversationId,
    route: "CHAT",
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
