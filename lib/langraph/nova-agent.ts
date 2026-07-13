import { buildLangGraphTools, type LangGraphToolContext } from "./tools";
import { routeModel, type RouterConfig } from "./model-router";
import { routeRequest, type RouteDecision } from "@/lib/nova/intent-router";
import { type NovaIntent } from "@/lib/nova/constitution/decision-framework";
import { logger } from "@/lib/logger";
import { loadWorkspaceContext } from "./nodes/context-loader";
import { loadMemory } from "./nodes/memory-loader";
import { executeWithFallback } from "./nodes/provider-fallback";
import { executeStream } from "./nodes/stream-handler";
import { validateAndSanitize, optimizeResponse, runQualityGate } from "./nodes/output-validator";
import { sanitizeUserInput, detectRawToolCalls, extractToolCallsFromText } from "@/lib/nova/output-validator";
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
  pageContext?: { path: string; type: string };
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
  conversationContext?: string;
  toolResults: Array<{ toolName: string; result?: unknown; error?: string }>;
  response: string;
  error?: string;
}

export class NovaAgent {
  private ctx: LangGraphToolContext;

  constructor(ctx: LangGraphToolContext) {
    this.ctx = ctx;
  }

  private async reExecuteExtractedToolCalls(toolCalls: Array<{ tool: string; params: Record<string, unknown> }>): Promise<string> {
    const results: string[] = [];
    for (const tc of toolCalls) {
      try {
        const result = await executeTool(this.ctx, tc.tool, tc.params);
        if (result.success) {
          const msg = typeof result.result === "object" && result.result
            ? (result.result as any).message || JSON.stringify(result.result)
            : String(result.result);
          results.push(msg);
        } else {
          results.push(`I couldn't complete that step: ${result.error}`);
        }
      } catch {
        results.push(`Something went wrong with that step.`);
      }
    }
    return results.join("\n\n");
  }

  private runQualityGate(text: string, state: NovaAgentState, route: RouteDecision): { response: string; passed: boolean; issues: string[]; extractedToolCalls?: Array<{ tool: string; params: Record<string, unknown> }> } {
    const sanitized = validateAndSanitize(text);
    const optimized = optimizeResponse(sanitized, state.route);
    return runQualityGate(optimized, {
      route: state.route,
      workspaceContext: state.workspaceContext,
      userPrompt: state.prompt,
      conversationHistory: state.memoryContext,
    });
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

        const { ContextSystem } = await import("@/lib/nova/context-system");
        const workspaceOverview = await ContextSystem.loadWorkspaceOverview(state.workspaceId);
        if (workspaceOverview) {
          state.workspaceContext = (state.workspaceContext || "") + "\n\n" + workspaceOverview;
        }

        const memoryDepth = route.contextDepth === "full" ? "full" : "lightweight";
        const loadedMemory = await loadMemory(state.userId, state.workspaceId, state.conversationId, memoryDepth);
        if (loadedMemory.longTerm.length > 0) {
          state.memoryContext = `[NOVA LONG-TERM MEMORY]\n${loadedMemory.longTerm.map(m => `- ${m.key}: ${sanitizeUserInput(m.value).substring(0, 200)}`).join("\n")}`;
        }

        if (loadedMemory.shortTerm.length > 0) {
          const recentMessages = loadedMemory.shortTerm.slice(-10);
          const formattedHistory = recentMessages.map(m => {
            const role = m.role === "user" ? "User" : "Nova";
            const content = sanitizeUserInput(m.content).substring(0, 150);
            return `${role}: ${content}`;
          }).join("\n");
          state.conversationContext = `[RECENT CONVERSATION]\n${formattedHistory}`;
        }
      }

      // Step 5: Try direct action fast-path via LangGraph node
      if (state.route === "ACTION") {
        const directResult = await tryDirectAction(state.prompt, this.ctx);
        if (directResult.handled) {
          const rawResponse = directResult.message || directResult.error || "Action completed.";
          const qg = this.runQualityGate(rawResponse, state, route);
          logger.info("[NovaAgent] Direct action handled", { action: directResult.actionName, durationMs: Date.now() - start, qualityIssues: qg.issues });
          await saveConversationMemory({
            userId: state.userId,
            workspaceId: state.workspaceId,
            conversationId: state.conversationId,
            prompt: state.prompt,
            response: qg.response,
            toolResults: [{ toolName: directResult.actionName || "direct_action", result: directResult.message }],
          }).catch(() => {});
          return { ...state, response: qg.response, toolResults: [{ toolName: directResult.actionName || "direct_action", result: directResult.message }] };
        }
      }

      // Step 6: Check for multi-step planning
      const isMultiStep = /then|and then|steps/i.test(state.prompt);
      if (isMultiStep && state.route === "ACTION") {
        const planResult = await planAndExecute(state.prompt, this.ctx);
        if (planResult.plans.length > 0) {
          const rawResponse = formatPlanResponse(planResult, state.prompt);
          const qg = this.runQualityGate(rawResponse, state, route);
          logger.info("[NovaAgent] Multi-step plan executed", { agents: planResult.plans.length, durationMs: Date.now() - start, qualityIssues: qg.issues });
          await saveConversationMemory({
            userId: state.userId,
            workspaceId: state.workspaceId,
            conversationId: state.conversationId,
            prompt: state.prompt,
            response: qg.response,
            toolResults: planResult.results.flat(),
          }).catch(() => {});
          return { ...state, response: qg.response, toolResults: planResult.results.flat() };
        }
      }

      logger.info("[NovaAgent] Execution plan", { route: state.route, provider: state.routerConfig.provider, model: state.routerConfig.model, contextDepth: route.contextDepth });

      // Step 7: Build system prompt
      const basePrompt = state.systemPrompt || "You are Nova, the intelligent operating system of Theta.";
      const pageContextSection = state.pageContext
        ? `[CURRENT PAGE: ${state.pageContext.type || "unknown"}] — User is viewing the ${state.pageContext.type || "page"}.`
        : "";
      const systemPrompt = [
        basePrompt,
        state.workspaceContext || "",
        state.memoryContext || "",
        state.conversationContext || "",
        pageContextSection,
        route.promptSuffix,
      ].filter(Boolean).join("\n\n");

      const filteredTools = buildLangGraphTools(this.ctx, route.toolCategories);
      const actionPrompt = state.route === "ACTION"
        ? `${state.prompt}\n\nUse your available capabilities to fulfill this request. Do not reference tool names or internal systems in your response.`
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

      // Step 9: Validate, optimize, and run quality gate via LangGraph nodes
      const qualityGateResult = this.runQualityGate(text, state, route);
      if (!qualityGateResult.passed) {
        logger.info("[NovaAgent] Quality gate revised response", { issues: qualityGateResult.issues });
      }

      let finalResponse = qualityGateResult.response;

      if (qualityGateResult.extractedToolCalls && qualityGateResult.extractedToolCalls.length > 0) {
        logger.info("[NovaAgent] Re-executing extracted tool calls", { count: qualityGateResult.extractedToolCalls.length });
        const reExecuted = await this.reExecuteExtractedToolCalls(qualityGateResult.extractedToolCalls);
        if (reExecuted) {
          finalResponse = reExecuted;
          const reQg = this.runQualityGate(reExecuted, state, route);
          finalResponse = reQg.response;
        }
      }

      // Step 10: Save conversation to memory via LangGraph node
      await saveConversationMemory({
        userId: state.userId,
        workspaceId: state.workspaceId,
        conversationId: state.conversationId,
        prompt: state.prompt,
        response: finalResponse,
        toolResults: state.toolResults,
      }).catch(() => {});

      logger.info("[NovaAgent] Execution complete", { route: state.route, durationMs: Date.now() - start, responseLength: finalResponse.length });

      return { ...state, response: finalResponse };
    } catch (error: any) {
      logger.error("[NovaAgent] Execution failed", { error: error.message, route: state.route, durationMs: Date.now() - start });
      const userMessage = error.message?.includes('timeout') || error.message?.includes('abort')
        ? "This took longer than expected. Try a simpler request, or try again in a moment."
        : error.message?.includes('permission') || error.message?.includes('access')
          ? "I don't have the right permissions for that action."
          : "Something went wrong on my end. Give it another shot — if it keeps happening, I'll look into it.";
      return { ...state, error: error.message, response: userMessage };
    }
  }
}
