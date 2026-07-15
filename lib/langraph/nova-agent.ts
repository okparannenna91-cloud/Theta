import { buildLangGraphTools, type LangGraphToolContext } from "./tools";
import { routeModel, type RouterConfig } from "./model-router";
import { routeRequest, type RouteDecision } from "@/lib/nova/intent-router";
import { type NovaIntent, type ConfidenceLevel, type ActionType } from "@/lib/nova/constitution/decision-framework";
import { ParameterExtractor, type ExtractedParameters } from "@/lib/nova/parameter-extractor";
import { ValidationEngine, type ActionValidation } from "@/lib/nova/validation-engine";
import { ProactiveIntelligenceEngine, type InsightSummary } from "@/lib/nova/proactive-intelligence";
import { ResponseFormatter, type ResponseFormat } from "@/lib/nova/response-formatter";
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
import { planAndExecute } from "./nodes/agent-planner";
import { saveConversationMemory } from "./nodes/memory-saver";

export type NovaRoute = "CHAT" | "ACTION" | "ANALYSIS" | "CONVERSATION" | "PLANNING" | "ORCHESTRATION";

export interface ReasoningContext {
  intent: NovaIntent;
  confidence: ConfidenceLevel;
  actionType: ActionType;
  missingInfo: string[];
  suggestedClarification: string | null;
  mentalModel: {
    workspace: { name: string; plan: string; projectCount: number; memberCount: number } | null;
    project: { name: string; taskCount: number; status: string; deadline: string | null } | null;
    task: { title: string; status: string; priority: string; assignee: string | null } | null;
    sprint: { name: string; progress: number; capacity: number } | null;
    team: { memberCount: number; activeMembers: string[] } | null;
    recentActivity: Array<{ title: string; status: string; priority: string }>;
    userRole: string;
    memory: Record<string, string>;
    conversationHistory: Array<{ role: string; content: string }>;
  };
}

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
  reasoningContext?: ReasoningContext;

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

  // Nova Prime fields
  extractedParams?: ExtractedParameters;
  actionValidation?: ActionValidation;
  proactiveInsights?: InsightSummary;
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

      // Step 4.5: Nova Prime - Extract parameters from prompt
      state.extractedParams = ParameterExtractor.extract(state.prompt);

      // Step 4.6: Nova Prime - Validate action before execution (for write actions)
      const writeIntents = ["CREATE", "UPDATE", "DELETE", "AUTOMATE", "IMPORT", "EXPORT"];
      if (writeIntents.includes(state.intent)) {
        try {
          const validationContext = {
            workspaceId: state.workspaceId,
            userId: state.userId,
            userRole: state.reasoningContext?.mentalModel?.userRole || "member",
            existingTaskTitles: [],
            existingProjectNames: [],
            teamMembers: state.reasoningContext?.mentalModel?.team?.activeMembers || [],
          };
          state.actionValidation = ValidationEngine.validateAction(
            state.intent.toLowerCase(),
            {
              title: state.extractedParams.title,
              priority: state.extractedParams.priority,
              dueDate: state.extractedParams.dueDate,
              assignee: state.extractedParams.assignee,
            },
            validationContext
          );

          if (!state.actionValidation.isValid) {
            logger.info("[NovaPrime] Action validation failed", { errors: state.actionValidation.errors });
            return { ...state, response: ValidationEngine.generateValidationMessage(state.actionValidation) };
          }

          if (state.actionValidation.requiresConfirmation) {
            const confirmMsg = ValidationEngine.generateValidationMessage(state.actionValidation);
            logger.info("[NovaPrime] Action requires confirmation", { warnings: state.actionValidation.warnings });
            return { ...state, response: confirmMsg };
          }
        } catch (validationError) {
          logger.warn("[NovaPrime] ValidationEngine failed, continuing:", validationError);
        }
      }

      // Step 4.7: Nova Prime - Proactive intelligence (for ANALYSIS/REPORT/CHAT routes)
      if (["ANALYSIS", "REPORT", "CHAT"].includes(state.route) && state.workspaceId) {
        try {
          state.proactiveInsights = await ProactiveIntelligenceEngine.analyzeWorkspace(state.workspaceId);
        } catch (insightError) {
          logger.warn("[NovaPrime] ProactiveIntelligence failed:", insightError);
        }
      }

      // Step 5: Try direct action fast-path via LangGraph node
      // If fast-path handles it, we still pass results to LLM for natural response
      let toolExecutionResults: Array<{ toolName: string; result?: unknown; error?: string }> = [];
      let fastPathHandled = false;

      if (state.route === "ACTION") {
        const directResult = await tryDirectAction(state.prompt, this.ctx);
        if (directResult.handled) {
          fastPathHandled = true;
          toolExecutionResults = [{ toolName: directResult.actionName || "direct_action", result: directResult.message, error: directResult.error }];
          state.toolResults = toolExecutionResults;
          logger.info("[NovaAgent] Direct action executed", { action: directResult.actionName, durationMs: Date.now() - start });
        }
      }

      // Step 6: Check for multi-step planning
      if (!fastPathHandled) {
        const isMultiStep = /then|and then|steps/i.test(state.prompt);
        if (isMultiStep && state.route === "ACTION") {
          const planResult = await planAndExecute(state.prompt, this.ctx);
          if (planResult.plans.length > 0) {
            fastPathHandled = true;
            toolExecutionResults = planResult.results.flat().map(r => ({ toolName: r.toolName, result: r.result, error: r.error }));
            state.toolResults = toolExecutionResults;
            logger.info("[NovaAgent] Multi-step plan executed", { agents: planResult.plans.length, durationMs: Date.now() - start });
          }
        }
      }

      logger.info("[NovaAgent] Execution plan", { route: state.route, provider: state.routerConfig.provider, model: state.routerConfig.model, contextDepth: route.contextDepth, fastPathHandled });

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

      // Step 7.5: If tools were executed via fast-path, build a prompt that includes tool results
      // so the LLM can generate a natural response instead of using hardcoded templates
      let actionPrompt: string;
      if (fastPathHandled && toolExecutionResults.length > 0) {
        const toolResultSummary = toolExecutionResults.map(r => {
          if (r.error) return `Tool "${r.toolName}" failed: ${r.error}`;
          const data = typeof r.result === "object" && r.result ? r.result : { message: String(r.result) };
          return `Tool "${r.toolName}" result: ${JSON.stringify(data)}`;
        }).join("\n");

        actionPrompt = `${state.prompt}\n\nThe following tools were executed to fulfill your request:\n${toolResultSummary}\n\nUsing the tool results above, generate a natural, concise response to the user. Preserve all factual accuracy from the tool results. Do not invent data that wasn't returned by the tools. Do not reference tool names or internal systems in your response.`;
      } else {
        actionPrompt = state.route === "ACTION"
          ? `${state.prompt}\n\nUse your available capabilities to fulfill this request. Do not reference tool names or internal systems in your response.`
          : state.route === "ANALYSIS"
            ? `${state.prompt}\n\nAnalyze the available information and provide insights with evidence from the workspace.`
            : state.route === "CONVERSATION"
              ? `${state.prompt}\n\n[CONVERSATION] Respond naturally. You have no tools available in this mode.`
              : state.prompt;
      }

      // Step 8: Execute with model provider via LangGraph node
      let text: string;
      try {
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
      } catch (llmError: any) {
        // LLM unavailable — use fallback templates for fast-path results
        if (fastPathHandled && toolExecutionResults.length > 0) {
          logger.warn("[NovaAgent] LLM unavailable, using fallback templates:", llmError.message);
          text = this.generateFallbackResponse(toolExecutionResults, state.prompt);
        } else {
          throw llmError;
        }
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

      // Step 9.5: Nova Prime - Format response with ResponseFormatter
      try {
        const formatType: ResponseFormat = state.route === "ACTION" ? "action"
          : state.route === "ANALYSIS" ? "analysis"
          : state.route === "CONVERSATION" ? "conversation"
          : "conversation";

        const formatted = ResponseFormatter.format(finalResponse, formatType, {
          includeConfidence: !!state.reasoningContext?.confidence,
          confidence: state.reasoningContext?.confidence,
          includeProactive: !!state.proactiveInsights?.topRecommendation,
          proactiveInsights: state.proactiveInsights
            ? ProactiveIntelligenceEngine.formatInsightsForDisplay(state.proactiveInsights)
            : undefined,
          workspaceName: state.reasoningContext?.mentalModel?.workspace?.name,
          projectName: state.reasoningContext?.mentalModel?.project?.name,
        });

        finalResponse = formatted.content;
      } catch (formatError) {
        logger.warn("[NovaPrime] ResponseFormatter failed, using raw response:", formatError);
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

  /**
   * Generate fallback response when LLM is unavailable.
   * Uses concise templates based on tool results.
   */
  private generateFallbackResponse(
    toolResults: Array<{ toolName: string; result?: unknown; error?: string }>,
    userPrompt: string
  ): string {
    const parts: string[] = [];

    for (const r of toolResults) {
      if (r.error) {
        parts.push(`Something went wrong: ${r.error}`);
        continue;
      }

      const data = typeof r.result === "object" && r.result ? r.result as Record<string, unknown> : { message: String(r.result) };
      const message = (data as any).message;

      if (message) {
        parts.push(String(message));
      } else if (data && typeof data === "object") {
        // Extract key fields for a natural summary
        const title = (data as any).title || (data as any).name;
        const status = (data as any).status;
        const priority = (data as any).priority;
        const assignee = (data as any).assignee || (data as any).assigneeId;

        if (title) {
          let summary = title;
          if (status) summary += ` (${status})`;
          if (priority) summary += ` — priority: ${priority}`;
          if (assignee) summary += ` — assigned to ${assignee}`;
          parts.push(summary);
        } else {
          parts.push(JSON.stringify(data));
        }
      } else {
        parts.push("Done.");
      }
    }

    return parts.join("\n\n") || "Done.";
  }
}
