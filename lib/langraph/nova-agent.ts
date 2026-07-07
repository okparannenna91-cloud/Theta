import { buildLangGraphTools, type LangGraphToolContext } from "./tools";
import { routeModel, type RouterConfig } from "./model-router";
import { routeRequest, type RouteDecision } from "@/lib/nova/intent-router";
import { type NovaIntent } from "@/lib/nova/constitution/decision-framework";
import { logger } from "@/lib/logger";
import { loadWorkspaceContext } from "./nodes/context-loader";
import { loadMemory } from "./nodes/memory-loader";
import { executeWithFallback } from "./nodes/provider-fallback";
import { executeStream } from "./nodes/stream-handler";
import { validateAndSanitize, optimizeResponse } from "./nodes/output-validator";
import { sanitizeUserInput } from "@/lib/nova/output-validator";
import { enforcePermission } from "./nodes/security-enforcer";
import { tryDirectAction } from "./nodes/direct-action-router";
import { executeTool } from "./nodes/tool-executor";
import { planAndExecute, formatPlanResponse } from "./nodes/agent-planner";
import { saveConversationMemory } from "./nodes/memory-saver";

export type NovaRoute = "CHAT" | "ACTION" | "ANALYSIS" | "CONVERSATION";

export interface NovaAgentState {
  prompt: string;
  systemPrompt?: string;
  userId: string;
  workspaceId: string;
  projectId?: string;
  conversationId?: string;
  shouldStream?: boolean;
  onToken?: (token: string) => void;
  onFinish?: (text: string) => void;
  signal?: AbortSignal;

  // Set during execution
  route: NovaRoute;
  intent: NovaIntent;
  routeDecision: RouteDecision;
  routerConfig: RouterConfig;
  workspaceContext?: string;
  memoryContext?: string;
  toolResults: Array<{ toolName: string; result?: unknown; error?: string }>;
  response: string;
  error?: string;
}

export class NovaAgent {
  private ctx: LangGraphToolContext;

  constructor(ctx: LangGraphToolContext) {
    this.ctx = ctx;
  }

  async execute(state: NovaAgentState): Promise<NovaAgentState> {
    const start = Date.now();
    try {
      // Step 1: Use route decision from upstream (already computed in route.ts).
      // If not provided, compute one from passed intent or default to READ.
      const route = state.routeDecision ?? routeRequest(state.prompt, state.intent ?? "READ", "PATH_B_CONFIRMATION");
      state.route = route.path;

      // Step 2: Enforce base permission via LangGraph node
      await enforcePermission(state.userId, state.workspaceId, "read", "workspace");

      // Step 3: Configure model router
      state.routerConfig = routeModel(state.prompt);

      // Step 4: Load context via LangGraph node (before direct action so tools have context)
      if (state.workspaceId && route.contextDepth !== "minimal") {
        const loadedContext = await loadWorkspaceContext(state.workspaceId, state.userId, state.projectId, route.contextDepth);
        state.workspaceContext = loadedContext.workspaceContext ? sanitizeUserInput(loadedContext.workspaceContext) : "";

        const memoryDepth = route.contextDepth === "full" ? "full" : "lightweight";
        const loadedMemory = await loadMemory(state.userId, state.workspaceId, state.conversationId, memoryDepth);
        if (loadedMemory.longTerm.length > 0) {
          state.memoryContext = `[NOVA LONG-TERM MEMORY]\n${loadedMemory.longTerm.map(m => `- ${m.key}: ${sanitizeUserInput(m.value).substring(0, 200)}`).join("\n")}`;
        }
      }

      // Step 5: Try direct action fast-path via LangGraph node
      if (state.route === "ACTION") {
        const directResult = await tryDirectAction(state.prompt, this.ctx);
        if (directResult.handled) {
          logger.info("[NovaAgent] Direct action handled", { action: directResult.actionName, durationMs: Date.now() - start });
          return { ...state, response: directResult.message || directResult.error || "Action completed.", toolResults: [{ toolName: directResult.actionName || "direct_action", result: directResult.message }] };
        }
      }

      // Step 6: Check for multi-step planning
      const isMultiStep = /then|and then|steps/i.test(state.prompt);
      if (isMultiStep && state.route === "ACTION") {
        const planResult = await planAndExecute(state.prompt, this.ctx);
        if (planResult.plans.length > 0) {
          const formatted = formatPlanResponse(planResult, state.prompt);
          logger.info("[NovaAgent] Multi-step plan executed", { agents: planResult.plans.length, durationMs: Date.now() - start });
          return { ...state, response: formatted, toolResults: planResult.results.flat() };
        }
      }

      logger.info("[NovaAgent] Execution plan", { route: state.route, provider: state.routerConfig.provider, model: state.routerConfig.model, contextDepth: route.contextDepth });

      // Step 7: Build system prompt
      const basePrompt = state.systemPrompt || "You are Nova, the intelligent operating system of Theta.";
      const systemPrompt = [
        basePrompt,
        state.workspaceContext || "",
        state.memoryContext || "",
        route.promptSuffix,
      ].filter(Boolean).join("\n\n");

      const filteredTools = buildLangGraphTools(this.ctx, route.toolCategories);
      const actionPrompt = state.route === "ACTION"
        ? `${state.prompt}\n\nAvailable tools: ${filteredTools.map(t => t.name).join(", ")}\n\nUse tools as needed to fulfill this request.`
        : state.route === "ANALYSIS"
          ? `${state.prompt}\n\nAnalyze the available information and provide insights with evidence from the workspace.`
          : state.route === "CONVERSATION"
            ? `${state.prompt}\n\n[CONVERSATION] Respond naturally. You have no tools available in this mode.`
            : state.prompt;

      // Step 8: Execute with model provider via LangGraph node
      let text: string;
      if (state.shouldStream && state.route !== "ACTION") {
        const streamResult = await executeStream(actionPrompt, systemPrompt, this.ctx, {
          signal: state.signal,
          onToken: state.onToken,
          onFinish: state.onFinish,
        });
        text = streamResult.text;
      } else {
        const rawResult = await executeWithFallback(actionPrompt, systemPrompt, state.routerConfig);
        text = typeof rawResult === "string" ? rawResult : String(rawResult);
      }

      // Step 9: Validate and optimize via LangGraph nodes
      const sanitized = validateAndSanitize(text);
      const optimized = optimizeResponse(sanitized, state.route);

      // Step 10: Save conversation to memory via LangGraph node
      await saveConversationMemory({
        userId: state.userId,
        workspaceId: state.workspaceId,
        conversationId: state.conversationId,
        prompt: state.prompt,
        response: optimized,
        toolResults: state.toolResults,
      }).catch(() => {});

      logger.info("[NovaAgent] Execution complete", { route: state.route, durationMs: Date.now() - start, responseLength: optimized.length });

      return { ...state, response: optimized };
    } catch (error: any) {
      logger.error("[NovaAgent] Execution failed", { error: error.message, route: state.route, durationMs: Date.now() - start });
      return { ...state, error: error.message, response: `I encountered an error processing your request: ${error.message}` };
    }
  }
}
