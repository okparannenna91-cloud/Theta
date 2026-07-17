import { buildLangGraphTools, type LangGraphToolContext } from "./tools";
import { routeModel, type RouterConfig } from "./model-router";
import { routeRequest, type RouteDecision } from "@/lib/nova/intent-router";
import { type NovaIntent, type ConfidenceLevel, type ActionType } from "@/lib/nova/constitution/decision-framework";
import { ParameterExtractor, type ExtractedParameters } from "@/lib/nova/parameter-extractor";
import { ValidationEngine, type ActionValidation } from "@/lib/nova/validation-engine";
import { ProactiveIntelligenceEngine, type InsightSummary } from "@/lib/nova/proactive-intelligence";
import { ResponseFormatter, type ResponseFormat } from "@/lib/nova/response-formatter";
import { classifyComplexity, generatePlan, summarizePlan, type ExecutionPlan } from "@/lib/nova/multi-step-planner";
import { logger } from "@/lib/logger";
import { loadWorkspaceContext } from "./nodes/context-loader";
import { loadMemory } from "./nodes/memory-loader";
import { executeWithFallback } from "./nodes/provider-fallback";
import { executeStream } from "./nodes/stream-handler";
import { validateAndSanitize, optimizeResponse, runQualityGate } from "./nodes/output-validator";
import { sanitizeUserInput } from "@/lib/nova/output-validator";
import { enforcePermission } from "./nodes/security-enforcer";
import { tryDirectAction } from "./nodes/direct-action-router";
import { executeTool } from "./nodes/tool-executor";
import { saveConversationMemory } from "./nodes/memory-saver";
import { getLangChainModel } from "./models";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

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

  extractedParams?: ExtractedParameters;
  actionValidation?: ActionValidation;
  proactiveInsights?: InsightSummary;
}

export class NovaAgent {
  private ctx: LangGraphToolContext;

  constructor(ctx: LangGraphToolContext) {
    this.ctx = ctx;
  }

  private async executeWithLangChainAgent(
    prompt: string,
    systemPrompt: string,
    routerConfig: RouterConfig,
    options?: { signal?: AbortSignal; onToken?: (token: string) => void; onFinish?: (text: string) => void },
  ): Promise<{ text: string; toolResults: Array<{ toolName: string; result?: unknown; error?: string }> }> {
    const model = getLangChainModel(routerConfig.provider, routerConfig.model);
    const tools = buildLangGraphTools(this.ctx);
    // bindTools is on all concrete model classes but not on BaseChatModel type
    const modelWithTools = tools.length > 0 ? (model as any).bindTools(tools) : model;

    const messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ];

    const toolResults: Array<{ toolName: string; result?: unknown; error?: string }> = [];
    const MAX_ITERATIONS = 5;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (options?.signal?.aborted) throw new Error("Aborted");

      const response = await modelWithTools.invoke(messages, {
        signal: options?.signal,
      });

      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      const toolCalls = response.tool_calls || [];

      if (toolCalls.length === 0) {
        logger.info("[NovaAgent] LangChain agent completed", { iterations: i + 1, responseLength: content.length });
        return { text: content, toolResults };
      }

      logger.info("[NovaAgent] LangChain agent calling tools", {
        iteration: i + 1,
        tools: toolCalls.map((tc: { name: string }) => tc.name),
      });

      messages.push(new AIMessage({ content: content || "", tool_calls: toolCalls }));

      for (const tc of toolCalls) {
        const result = await executeTool(this.ctx, tc.name, tc.args as Record<string, unknown>);
        const toolOutput = result.success
          ? (typeof result.result === "object" && result.result
              ? (result.result as any).message || JSON.stringify(result.result)
              : String(result.result))
          : `Error: ${result.error}`;

        toolResults.push({ toolName: tc.name, result: result.result, error: result.error });
        messages.push(new ToolMessage(toolOutput, tc.id!));
      }
    }

    const lastAssistant = messages.filter((m): m is AIMessage => m instanceof AIMessage).pop();
    return { text: lastAssistant?.content as string || "", toolResults };
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
      const route = state.routeDecision ?? routeRequest(state.prompt, state.intent ?? "READ", "PATH_B_CONFIRMATION");
      state.route = route.path;

      await enforcePermission(state.userId, state.workspaceId, "read", "workspace");

      state.routerConfig = routeModel(state.prompt);

      if (state.workspaceId && route.contextDepth !== "minimal") {
        await this.loadContext(state, route);
      }

      state.extractedParams = ParameterExtractor.extract(state.prompt);

      const writeIntents = ["CREATE", "UPDATE", "DELETE", "AUTOMATE", "IMPORT", "EXPORT"];
      if (writeIntents.includes(state.intent)) {
        const shouldReturn = await this.validateAction(state);
        if (shouldReturn) return state;
      }

      if (["ANALYSIS", "REPORT", "CHAT"].includes(state.route) && state.workspaceId) {
        await this.loadProactiveInsights(state);
      }

      const executionPlan = await this.planIfComplex(state);

      const { toolExecutionResults, fastPathHandled } = await this.executeTools(state, executionPlan);

      const systemPrompt = this.buildSystemPrompt(state, route);
      const actionPrompt = this.buildActionPrompt(state, toolExecutionResults, fastPathHandled);

      const text = await this.callLLM(state, actionPrompt, systemPrompt, toolExecutionResults, fastPathHandled);

      let finalResponse = await this.runQualityChecks(text, state, route);

      finalResponse = this.formatResponse(finalResponse, state);

      await this.saveMemory(state, finalResponse);

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

  private async loadContext(state: NovaAgentState, route: RouteDecision): Promise<void> {
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

  private async validateAction(state: NovaAgentState): Promise<boolean> {
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
          title: state.extractedParams?.title,
          priority: state.extractedParams?.priority,
          dueDate: state.extractedParams?.dueDate,
          assignee: state.extractedParams?.assignee,
        },
        validationContext
      );

      if (!state.actionValidation.isValid) {
        logger.info("[NovaPrime] Action validation failed", { errors: state.actionValidation.errors });
        state.response = ValidationEngine.generateValidationMessage(state.actionValidation);
        return true;
      }

      if (state.actionValidation.requiresConfirmation) {
        state.response = ValidationEngine.generateValidationMessage(state.actionValidation);
        logger.info("[NovaPrime] Action requires confirmation", { warnings: state.actionValidation.warnings });
        return true;
      }
    } catch (validationError) {
      logger.warn("[NovaPrime] ValidationEngine failed, continuing:", validationError);
    }
    return false;
  }

  private async loadProactiveInsights(state: NovaAgentState): Promise<void> {
    try {
      state.proactiveInsights = await ProactiveIntelligenceEngine.analyzeWorkspace(state.workspaceId);
    } catch (insightError) {
      logger.warn("[NovaPrime] ProactiveIntelligence failed:", insightError);
    }
  }

  private async planIfComplex(state: NovaAgentState): Promise<ExecutionPlan | null> {
    if (state.route !== "ACTION" || !state.workspaceId) return null;

    try {
      const complexity = await classifyComplexity(state.prompt, state.workspaceContext || "");
      if (complexity.isComplex) {
        const tools = buildLangGraphTools(this.ctx);
        const toolNames = tools.map((t: any) => t.name || "unknown");
        const plan = await generatePlan(state.prompt, state.workspaceContext || "", toolNames);
        if (plan.needsPlan && plan.steps.length > 0) {
          logger.info("[MultiStepPlanner] Complex request detected", {
            steps: plan.steps.length,
            reasoning: plan.reasoning,
          });
          return plan;
        }
      }
    } catch (planError) {
      logger.warn("[MultiStepPlanner] Planning failed, continuing with normal flow:", planError);
    }
    return null;
  }

  private async executeTools(
    state: NovaAgentState,
    executionPlan: ExecutionPlan | null,
  ): Promise<{ toolExecutionResults: Array<{ toolName: string; result?: unknown; error?: string }>; fastPathHandled: boolean }> {
    let toolExecutionResults: Array<{ toolName: string; result?: unknown; error?: string }> = [];
    let fastPathHandled = false;

    if (executionPlan && executionPlan.needsPlan && executionPlan.steps.length > 0) {
      logger.info("[NovaAgent] Executing multi-step plan", { steps: executionPlan.steps.length });
      for (const step of executionPlan.steps) {
        if (step.toolHint === "llm") continue;

        try {
          const result = await executeTool(this.ctx, step.toolHint, step.params);
          const toolOutput = result.success
            ? (typeof result.result === "object" && result.result
                ? (result.result as any).message || JSON.stringify(result.result)
                : String(result.result))
            : `Error: ${result.error}`;

          toolExecutionResults.push({ toolName: step.toolHint, result: result.result, error: result.error });
          logger.info("[MultiStepPlanner] Step executed", { step: step.id, tool: step.toolHint, success: result.success });
        } catch (stepError: any) {
          toolExecutionResults.push({ toolName: step.toolHint, error: stepError.message });
          logger.warn("[MultiStepPlanner] Step failed", { step: step.id, tool: step.toolHint, error: stepError.message });
        }
      }
      if (toolExecutionResults.length > 0) {
        fastPathHandled = true;
        state.toolResults = toolExecutionResults;
      }
    }

    if (state.route === "ACTION" && !fastPathHandled) {
      const directResult = await tryDirectAction(state.prompt, this.ctx);
      if (directResult.handled) {
        fastPathHandled = true;
        toolExecutionResults = [{ toolName: directResult.actionName || "direct_action", result: directResult.message, error: directResult.error }];
        state.toolResults = toolExecutionResults;
        logger.info("[NovaAgent] Direct action executed", { action: directResult.actionName });
      }
    }

    return { toolExecutionResults, fastPathHandled };
  }

  private buildSystemPrompt(state: NovaAgentState, route: RouteDecision): string {
    const basePrompt = state.systemPrompt || "You are Nova, the intelligent operating system of Theta.";
    const pageContextSection = state.pageContext
      ? `[CURRENT PAGE: ${state.pageContext.type || "unknown"}] — User is viewing the ${state.pageContext.type || "page"}.`
      : "";

    return [
      basePrompt,
      state.workspaceContext || "",
      state.memoryContext || "",
      state.conversationContext || "",
      pageContextSection,
      route.promptSuffix,
    ].filter(Boolean).join("\n\n");
  }

  private buildActionPrompt(
    state: NovaAgentState,
    toolExecutionResults: Array<{ toolName: string; result?: unknown; error?: string }>,
    fastPathHandled: boolean,
  ): string {
    if (fastPathHandled && toolExecutionResults.length > 0) {
      const toolResultSummary = toolExecutionResults.map(r => {
        if (r.error) return `Tool "${r.toolName}" failed: ${r.error}`;
        const data = typeof r.result === "object" && r.result ? r.result : { message: String(r.result) };
        return `Tool "${r.toolName}" result: ${JSON.stringify(data)}`;
      }).join("\n");

      return `${state.prompt}\n\nThe following tools were executed to fulfill your request:\n${toolResultSummary}\n\nUsing the tool results above, generate a natural, concise response to the user. Preserve all factual accuracy from the tool results. Do not invent data that wasn't returned by the tools. Do not reference tool names or internal systems in your response.`;
    }

    if (state.route === "ACTION") {
      return `${state.prompt}\n\nUse your available capabilities to fulfill this request. Do not reference tool names or internal systems in your response.`;
    }
    if (state.route === "ANALYSIS") {
      return `${state.prompt}\n\nAnalyze the available information and provide insights with evidence from the workspace.`;
    }
    if (state.route === "CONVERSATION") {
      return `${state.prompt}\n\n[CONVERSATION] Respond naturally. You have no tools available in this mode.`;
    }
    return state.prompt;
  }

  private async callLLM(
    state: NovaAgentState,
    actionPrompt: string,
    systemPrompt: string,
    toolExecutionResults: Array<{ toolName: string; result?: unknown; error?: string }>,
    fastPathHandled: boolean,
  ): Promise<string> {
    try {
      if (fastPathHandled && toolExecutionResults.length > 0) {
        if (state.shouldStream && state.route !== "ACTION") {
          const streamResult = await executeStream(actionPrompt, systemPrompt, this.ctx, {
            signal: state.signal,
            onToken: state.onToken,
            onFinish: state.onFinish,
          });
          return streamResult.text;
        } else {
          const rawResult = await executeWithFallback(actionPrompt, systemPrompt, state.routerConfig);
          return typeof rawResult === "string" ? rawResult : String(rawResult);
        }
      } else {
        const agentResult = await this.executeWithLangChainAgent(
          actionPrompt,
          systemPrompt,
          state.routerConfig,
          { signal: state.signal, onToken: state.onToken, onFinish: state.onFinish },
        );
        if (agentResult.toolResults.length > 0) {
          state.toolResults = agentResult.toolResults;
        }
        return agentResult.text;
      }
    } catch (llmError: any) {
      if (fastPathHandled && toolExecutionResults.length > 0) {
        logger.warn("[NovaAgent] LLM unavailable, using fallback templates:", llmError.message);
        return this.generateFallbackResponse(toolExecutionResults, state.prompt);
      }
      throw llmError;
    }
  }

  private async runQualityChecks(text: string, state: NovaAgentState, route: RouteDecision): Promise<string> {
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

    return finalResponse;
  }

  private formatResponse(finalResponse: string, state: NovaAgentState): string {
    try {
      const formatType: ResponseFormat = state.route === "ACTION" ? "action"
        : state.route === "ANALYSIS" ? "analysis"
        : state.route === "CONVERSATION" ? "conversation"
        : "conversation";

      const confidenceWorthyFormats: ResponseFormat[] = ["analysis", "plan"];
      const includeConfidence = confidenceWorthyFormats.includes(formatType)
        && !!state.reasoningContext?.confidence;

      const formatted = ResponseFormatter.format(finalResponse, formatType, {
        includeConfidence,
        confidence: includeConfidence ? state.reasoningContext?.confidence : undefined,
        includeProactive: !!state.proactiveInsights?.topRecommendation,
        proactiveInsights: state.proactiveInsights
          ? ProactiveIntelligenceEngine.formatInsightsForDisplay(state.proactiveInsights)
          : undefined,
        workspaceName: state.reasoningContext?.mentalModel?.workspace?.name,
        projectName: state.reasoningContext?.mentalModel?.project?.name,
      });

      return formatted.content;
    } catch (formatError) {
      logger.warn("[NovaPrime] ResponseFormatter failed, using raw response:", formatError);
      return finalResponse;
    }
  }

  private async saveMemory(state: NovaAgentState, finalResponse: string): Promise<void> {
    await saveConversationMemory({
      userId: state.userId,
      workspaceId: state.workspaceId,
      conversationId: state.conversationId,
      prompt: state.prompt,
      response: finalResponse,
      toolResults: state.toolResults,
    }).catch(() => {});
  }

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
