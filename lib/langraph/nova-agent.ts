import { buildLangGraphTools, type LangGraphToolContext } from "./tools";
import { routeModel, type RouterConfig } from "./model-router";
import { routeRequest } from "@/lib/nova/intent-router";
import { logger } from "@/lib/logger";
import { evaluateDecision } from "./nodes/decision-evaluator";
import { loadWorkspaceContext } from "./nodes/context-loader";
import { loadMemory } from "./nodes/memory-loader";
import { executeWithFallback } from "./nodes/provider-fallback";
import { executeStream } from "./nodes/stream-handler";
import { validateAndSanitize, optimizeResponse } from "./nodes/output-validator";
import { enforcePermission } from "./nodes/security-enforcer";
import { tryDirectAction } from "./nodes/direct-action-router";
import { executeTool } from "./nodes/tool-executor";
import { planAndExecute, formatPlanResponse } from "./nodes/agent-planner";
import { saveConversationMemory } from "./nodes/memory-saver";

export type NovaRoute = "CHAT" | "ACTION" | "ANALYSIS";

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
      // Step 1: Evaluate decision via LangGraph node
      const decision = evaluateDecision(state.prompt);
      if (decision.requiresApproval) {
        return { ...state, route: "CHAT", response: `**ACTION BLOCKED — CONFIRMATION REQUIRED**\n\nYour request has been classified as **HIGH RISK** (${decision.intent} action).\nPlease confirm explicitly if you want to proceed.` };
      }

      // Step 2: Route the request via IntentRouter
      const route = routeRequest(state.prompt, decision.intent as any, decision.strategy as any);
      state.route = route.path;

      // Step 3: Check for multi-step planning (strategy === PATH_C_MULTISTEP)
      const isMultiStep = decision.strategy === "PATH_C_MULTISTEP" || /then|and then|steps/i.test(state.prompt);
      if (isMultiStep && state.route === "ACTION") {
        const planResult = await planAndExecute(state.prompt, this.ctx);
        if (planResult.plans.length > 0) {
          const formatted = formatPlanResponse(planResult, state.prompt);
          logger.info("[NovaAgent] Multi-step plan executed", { agents: planResult.plans.length, durationMs: Date.now() - start });
          return { ...state, response: formatted, toolResults: planResult.results.flat() };
        }
      }

      // Step 4: Enforce base permission via LangGraph node
      await enforcePermission(state.userId, state.workspaceId, "read", "workspace").catch(() => {});

      // Step 5: Try direct action fast-path via LangGraph node
      if (state.route === "ACTION") {
        const directResult = await tryDirectAction(state.prompt, this.ctx);
        if (directResult.handled) {
          logger.info("[NovaAgent] Direct action handled", { action: directResult.actionName, durationMs: Date.now() - start });
          return { ...state, response: directResult.message || directResult.error || "Action completed.", toolResults: [{ toolName: directResult.actionName || "direct_action", result: directResult.message }] };
        }
      }

      // Step 5: Configure model router
      state.routerConfig = routeModel(state.prompt);

      logger.info("[NovaAgent] Execution plan", { route: state.route, provider: state.routerConfig.provider, model: state.routerConfig.model, intent: decision.intent, strategy: decision.strategy, contextDepth: route.contextDepth });

      // Step 6: Load context via LangGraph node
      if (state.workspaceId && route.contextDepth !== "minimal") {
        const loadedContext = await loadWorkspaceContext(state.workspaceId, state.userId, state.projectId, route.contextDepth);
        state.workspaceContext = loadedContext.workspaceContext;

        // Load memories via LangGraph node
        const memoryDepth = route.contextDepth === "full" ? "full" : "lightweight";
        const loadedMemory = await loadMemory(state.userId, state.workspaceId, state.conversationId, memoryDepth);
        if (loadedMemory.longTerm.length > 0) {
          state.memoryContext = `[NOVA LONG-TERM MEMORY]\n${loadedMemory.longTerm.map(m => `- ${m.key}: ${m.value.substring(0, 200)}`).join("\n")}`;
        }
      }

      // Step 7: Build system prompt
      const basePrompt = state.systemPrompt || "You are Nova, the intelligent operating system of Theta.";
      const systemPrompt = [
        basePrompt,
        state.workspaceContext || "",
        state.memoryContext || "",
        `[DECISION FRAMEWORK EVALUATION]\n- Intent: ${decision.intent}\n- Risk Level: ${decision.riskLevel}\n- Strategy: ${decision.strategy}`,
        route.promptSuffix,
      ].filter(Boolean).join("\n\n");

      const actionPrompt = state.route === "ACTION"
        ? `${state.prompt}\n\nAvailable tools: ${buildLangGraphTools(this.ctx).map(t => t.name).join(", ")}\n\nYou MUST call the appropriate tool to fulfill this request.`
        : state.route === "ANALYSIS"
          ? `${state.prompt}\n\nProvide thorough analysis with data, metrics, and actionable recommendations.`
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
      const optimized = optimizeResponse(sanitized, decision.intent);

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
