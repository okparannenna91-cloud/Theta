import { Annotation, StateGraph, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { getLangChainModel } from "./models";
import { routeModel, type RouterConfig } from "./model-router";
import { buildLangGraphTools, type LangGraphToolContext } from "./tools";
import { executeTool } from "./nodes/tool-executor";
import { loadWorkspaceContext } from "./nodes/context-loader";
import { loadMemory } from "./nodes/memory-loader";
import { saveConversationMemory } from "./nodes/memory-saver";
import { executeWithFallback } from "./nodes/provider-fallback";
import { validateAndSanitize, optimizeResponse, runQualityGate } from "./nodes/output-validator";
import { sanitizeUserInput } from "@/lib/nova/output-validator";
import { routeRequest, type RouteDecision } from "@/lib/nova/intent-router";
import { type NovaIntent } from "@/lib/nova/constitution/execution";
import { ParameterExtractor } from "@/lib/nova/parameter-extractor";
import { ValidationEngine } from "@/lib/nova/validation-engine";
import { ProactiveIntelligenceEngine } from "@/lib/nova/proactive-intelligence";
import { ResponseFormatter } from "@/lib/nova/response-formatter";
import { classifyComplexity, generatePlan, type ExecutionPlan } from "@/lib/nova/multi-step-planner";
import { logger } from "@/lib/logger";

const AgentState = Annotation.Root({
  messages: Annotation<{ role: string; content: string }[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  systemPrompt: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  toolContext: Annotation<LangGraphToolContext>({
    reducer: (_, next) => next,
    default: () => ({ userId: "", workspaceId: "" }),
  }),
  route: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "CHAT",
  }),
  signal: Annotation<AbortSignal | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  intent: Annotation<NovaIntent>({
    reducer: (_, next) => next,
    default: () => "READ",
  }),
  routeDecision: Annotation<RouteDecision | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  routerConfig: Annotation<RouterConfig>({
    reducer: (_, next) => next,
    default: () => ({ provider: "gemini", model: "gemini-2.5-flash", reason: "default", costTier: "low" }),
  }),
  workspaceContext: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  memoryContext: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  conversationContext: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  toolResults: Annotation<Array<{ toolName: string; result?: unknown; error?: string }>>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  response: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  extractedParams: Annotation<ReturnType<typeof ParameterExtractor.extract> | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  actionValidation: Annotation<ReturnType<typeof ValidationEngine.validateAction> | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  proactiveInsights: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  executionPlan: Annotation<ExecutionPlan | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  fastPathHandled: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  shouldReturn: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
});

type AgentStateType = typeof AgentState.State;

// Node 1: classifyIntent — determine intent and route
async function classifyIntent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  const userContent = lastMessage?.content || "";

  const routeDecision = routeRequest(userContent, state.intent ?? "READ");
  const routerConfig = await routeModel(userContent, state.toolContext.workspaceId);

  logger.info("[Graph] classifyIntent", { route: routeDecision.path, contextDepth: routeDecision.contextDepth });

  return {
    route: routeDecision.path,
    routeDecision,
    routerConfig,
  };
}

// Node 2: loadContext — workspace context, memory, conversation history
async function loadContext(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const route = state.routeDecision;
  if (!state.toolContext.workspaceId || !route || route.contextDepth === "minimal") {
    return {};
  }

  const loadedContext = await loadWorkspaceContext(
    state.toolContext.workspaceId,
    state.toolContext.userId,
    undefined,
    route.contextDepth,
  );
  let workspaceContext = loadedContext.workspaceContext ? sanitizeUserInput(loadedContext.workspaceContext) : "";

  const { ContextSystem } = await import("@/lib/nova/context-system");
  const workspaceOverview = await ContextSystem.loadWorkspaceOverview(state.toolContext.workspaceId);
  if (workspaceOverview) {
    workspaceContext = (workspaceContext || "") + "\n\n" + workspaceOverview;
  }

  const memoryDepth = route.contextDepth === "full" ? "full" : "lightweight";
  const loadedMemory = await loadMemory(state.toolContext.userId, state.toolContext.workspaceId, undefined, memoryDepth);

  let memoryContext = "";
  if (loadedMemory.longTerm.length > 0) {
    memoryContext = `[NOVA LONG-TERM MEMORY]\n${loadedMemory.longTerm.map(m => `- ${m.key}: ${sanitizeUserInput(m.value).substring(0, 200)}`).join("\n")}`;
  }

  let ragContext = "";
  try {
    const { RAGPipeline } = await import("@/lib/nova/rag-pipeline");
    const lastMsg = state.messages[state.messages.length - 1];
    const userContent = lastMsg?.content || "";
    const ragResults = await RAGPipeline.getContextForQuery(
      state.toolContext.workspaceId,
      userContent,
      1500,
    );
    if (ragResults) {
      ragContext = `[RELEVANT DOCUMENT CONTEXT]\n${ragResults}`;
    }
  } catch { /* RAG is best-effort */ }

  let conversationContext = "";
  if (loadedMemory.shortTerm.length > 0) {
    const recentMessages = loadedMemory.shortTerm.slice(-10);
    const formattedHistory = recentMessages.map(m => {
      const role = m.role === "user" ? "User" : "Nova";
      const content = sanitizeUserInput(m.content).substring(0, 150);
      return `${role}: ${content}`;
    }).join("\n");
    conversationContext = `[RECENT CONVERSATION]\n${formattedHistory}`;
  }

  logger.info("[Graph] loadContext", { workspaceContextLen: workspaceContext.length, memoryContextLen: memoryContext.length, ragContextLen: ragContext.length });

  return { workspaceContext: (workspaceContext || "") + (ragContext ? "\n\n" + ragContext : ""), memoryContext, conversationContext };
}

// Node 3: loadMemory — merged into loadContext above for efficiency
// (loadMemoryNode removed — was a no-op placeholder)

// Node 4: evaluateRisk — validate action, extract params, load proactive insights
async function evaluateRisk(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const userContent = state.messages[state.messages.length - 1]?.content || "";
  const extractedParams = ParameterExtractor.extract(userContent);

  const writeIntents = ["CREATE", "UPDATE", "DELETE", "AUTOMATE", "IMPORT", "EXPORT"];
  let actionValidation = null;
  let shouldReturn = false;

  if (writeIntents.includes(state.intent)) {
    try {
      const validationContext = {
        workspaceId: state.toolContext.workspaceId,
        userId: state.toolContext.userId,
        userRole: "member",
        existingTaskTitles: [],
        existingProjectNames: [],
        teamMembers: [],
      };
      actionValidation = ValidationEngine.validateAction(
        state.intent.toLowerCase(),
        {
          title: extractedParams?.title,
          priority: extractedParams?.priority,
          dueDate: extractedParams?.dueDate,
          assignee: extractedParams?.assignee,
        },
        validationContext,
      );

      if (!actionValidation.isValid || actionValidation.requiresConfirmation) {
        shouldReturn = true;
      }
    } catch {
      // Validation engine failure — continue
    }
  }

  let proactiveInsights = null;
  if (["ANALYSIS", "REPORT", "CHAT"].includes(state.route) && state.toolContext.workspaceId) {
    try {
      proactiveInsights = await ProactiveIntelligenceEngine.analyzeWorkspace(state.toolContext.workspaceId);
    } catch {
      // Proactive intelligence failure — continue
    }
  }

  logger.info("[Graph] evaluateRisk", { intent: state.intent, shouldReturn, hasValidation: !!actionValidation });

  return { extractedParams, actionValidation, proactiveInsights, shouldReturn };
}

// Node 5: routeToAgent — conditional: simple -> direct LLM, complex -> tool-calling
async function routeToAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (state.route !== "ACTION" || !state.toolContext.workspaceId) {
    return {};
  }

  try {
    const complexity = await classifyComplexity(
      state.messages[state.messages.length - 1]?.content || "",
      state.workspaceContext || "",
    );
    if (complexity.isComplex) {
      const tools = buildLangGraphTools(state.toolContext);
      const toolNames = tools.map((t: any) => t.name || "unknown");
      const plan = await generatePlan(
        state.messages[state.messages.length - 1]?.content || "",
        state.workspaceContext || "",
        toolNames,
      );
      if (plan.needsPlan && plan.steps.length > 0) {
        logger.info("[Graph] routeToAgent — complex plan generated", { steps: plan.steps.length });
        return { executionPlan: plan };
      }
    }
  } catch {
    // Planning failure — continue with simple path
  }

  return {};
}

// Node 6: toolExecutor — execute tools from plan or direct action
async function toolExecutor(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const toolResults: Array<{ toolName: string; result?: unknown; error?: string }> = [];
  let fastPathHandled = false;

  // Execute multi-step plan
  if (state.executionPlan && state.executionPlan.needsPlan && state.executionPlan.steps.length > 0) {
    for (const step of state.executionPlan.steps) {
      if (step.toolHint === "llm") continue;
      try {
        const result = await executeTool(state.toolContext, step.toolHint, step.params);
        toolResults.push({ toolName: step.toolHint, result: result.result, error: result.error });
        logger.info("[Graph] toolExecutor — plan step", { step: step.id, tool: step.toolHint, success: result.success });
      } catch (stepError: any) {
        toolResults.push({ toolName: step.toolHint, error: stepError.message });
      }
    }
    if (toolResults.length > 0) {
      fastPathHandled = true;
    }
  }

  // Try direct action for ACTION route
  if (state.route === "ACTION" && !fastPathHandled) {
    const { tryDirectAction } = await import("./nodes/direct-action-router");
    const directResult = await tryDirectAction(
      state.messages[state.messages.length - 1]?.content || "",
      state.toolContext,
    );
    if (directResult.handled) {
      fastPathHandled = true;
      toolResults.push({ toolName: directResult.actionName || "direct_action", result: directResult.message, error: directResult.error });
      logger.info("[Graph] toolExecutor — direct action", { action: directResult.actionName });
    }
  }

  logger.info("[Graph] toolExecutor", { toolCount: toolResults.length, fastPathHandled });

  return { toolResults, fastPathHandled };
}

// Node 7: qualityGate — validate, sanitize, optimize response
async function qualityGate(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (!state.response) return {};

  const sanitized = validateAndSanitize(state.response);
  const optimized = optimizeResponse(sanitized, state.route);
  const qgResult = runQualityGate(optimized, {
    route: state.route,
    workspaceContext: state.workspaceContext,
    userPrompt: state.messages[state.messages.length - 1]?.content || "",
    conversationHistory: state.memoryContext,
  });

  let finalResponse = qgResult.response;

  // Re-execute any extracted tool calls
  if (qgResult.extractedToolCalls && qgResult.extractedToolCalls.length > 0) {
    const results: string[] = [];
    for (const tc of qgResult.extractedToolCalls) {
      try {
        const result = await executeTool(state.toolContext, tc.tool, tc.params);
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
    if (results.length > 0) {
      finalResponse = results.join("\n\n");
    }
  }

  logger.info("[Graph] qualityGate", { passed: qgResult.passed, issues: qgResult.issues.length });

  return { response: finalResponse };
}

// Node 8: saveMemory — persist conversation
async function saveMemoryNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  await saveConversationMemory({
    userId: state.toolContext.userId,
    workspaceId: state.toolContext.workspaceId,
    conversationId: undefined,
    prompt: state.messages[state.messages.length - 1]?.content || "",
    response: state.response,
    toolResults: state.toolResults,
  }).catch(() => {});

  try {
    const { AutoMemoryExtractor } = await import("@/lib/nova/auto-memory-extractor");
    await AutoMemoryExtractor.extractAndSave(
      state.toolContext.userId,
      state.toolContext.workspaceId,
      state.messages,
    );
  } catch { /* auto-extraction is best-effort */ }

  return {};
}

// Conditional edges
function routeAfterRisk(state: AgentStateType): "returnEarly" | "executeTools" | "callModel" {
  if (state.shouldReturn) {
    return "returnEarly";
  }
  return "executeTools";
}

function routeAfterTools(state: AgentStateType): "callModel" {
  return "callModel";
}

// Return early node — sends validation/confirmation response
async function returnEarly(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const response = state.actionValidation
    ? ValidationEngine.generateValidationMessage(state.actionValidation)
    : "I need more information to proceed.";

  return { response, shouldReturn: true };
}

// Call model node — LLM inference with tool binding
async function callModel(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const userContent = state.messages[state.messages.length - 1]?.content || "";
  const model = getLangChainModel(state.routerConfig.provider, state.routerConfig.model);
  const tools = buildLangGraphTools(state.toolContext);
  const modelWithTools = tools.length > 0 ? (model as any).bindTools(tools) : model;

  // Build system prompt
  const basePrompt = state.systemPrompt || "You are Nova, the intelligent operating system of Theta.";
  const systemPrompt = [
    basePrompt,
    state.workspaceContext || "",
    state.memoryContext || "",
    state.conversationContext || "",
    state.routeDecision?.promptSuffix || "",
  ].filter(Boolean).join("\n\n");

  // Build action prompt
  let actionPrompt = userContent;
  if (state.fastPathHandled && state.toolResults.length > 0) {
    const toolResultSummary = state.toolResults.map(r => {
      if (r.error) return `Tool "${r.toolName}" failed: ${r.error}`;
      const data = typeof r.result === "object" && r.result ? r.result : { message: String(r.result) };
      return `Tool "${r.toolName}" result: ${JSON.stringify(data)}`;
    }).join("\n");
    actionPrompt = `${userContent}\n\nThe following tools were executed to fulfill your request:\n${toolResultSummary}\n\nUsing the tool results above, generate a natural, concise response. Do not reference tool names or internal systems.`;
  } else if (state.route === "ACTION") {
    actionPrompt = `${userContent}\n\nUse your available capabilities to fulfill this request. Do not reference tool names or internal systems.`;
  } else if (state.route === "ANALYSIS") {
    actionPrompt = `${userContent}\n\nAnalyze the available information and provide insights with evidence from the workspace.`;
  }

  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages.map((m) =>
      m.role === "user"
        ? new HumanMessage(m.content)
        : m.role === "assistant"
          ? new AIMessage(m.content)
          : m.role === "tool"
            ? new ToolMessage(m.content, (m as any).tool_call_id || "")
            : new HumanMessage(m.content)
    ),
  ];

  // Override last message with action prompt
  messages[messages.length - 1] = new HumanMessage(actionPrompt);

  const response = await modelWithTools.invoke(messages, { signal: state.signal });
  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  const toolCalls = response.tool_calls || [];

  logger.info("[Graph] callModel", { contentLength: content.length, toolCallsCount: toolCalls.length });

  const newMessages = [...state.messages];
  newMessages.push({ role: "assistant", content });

  if (toolCalls.length > 0) {
    for (const tc of toolCalls) {
      newMessages.push({ role: "assistant", content: JSON.stringify({ tool_call: tc }) } as any);
    }
  }

  return { messages: newMessages, response: content };
}

// Format response node
async function formatResponse(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (!state.response) return {};

  try {
    const formatType = state.route === "ACTION" ? "action"
      : state.route === "ANALYSIS" ? "analysis"
      : "conversation";

    const formatted = ResponseFormatter.format(state.response, formatType, {
      includeConfidence: formatType === "analysis",
      includeProactive: !!state.proactiveInsights?.topRecommendation,
      proactiveInsights: state.proactiveInsights
        ? ProactiveIntelligenceEngine.formatInsightsForDisplay(state.proactiveInsights)
        : undefined,
    });

    return { response: formatted.content };
  } catch {
    return {};
  }
}

// Singleton cached compiled graph
let _compiledGraph: any = null;

// Build the graph (cached singleton)
export function createNovaGraph() {
  if (_compiledGraph) return _compiledGraph;

  const workflow = new StateGraph(AgentState)
    .addNode("classifyIntent", classifyIntent)
    .addNode("loadContext", loadContext)
    .addNode("evaluateRisk", evaluateRisk)
    .addNode("routeToAgent", routeToAgent)
    .addNode("toolExecutor", toolExecutor)
    .addNode("callModel", callModel)
    .addNode("qualityGate", qualityGate)
    .addNode("formatResponse", formatResponse)
    .addNode("saveMemory", saveMemoryNode)
    .addNode("returnEarly", returnEarly)

    // Entry: classifyIntent -> loadContext -> evaluateRisk
    .addEdge("__start__", "classifyIntent")
    .addEdge("classifyIntent", "loadContext")
    .addEdge("loadContext", "evaluateRisk")

    // evaluateRisk -> conditional: returnEarly OR routeToAgent
    .addConditionalEdges("evaluateRisk", routeAfterRisk, {
      returnEarly: "returnEarly",
      executeTools: "routeToAgent",
    })

    // returnEarly -> saveMemory -> END
    .addEdge("returnEarly", "saveMemory")
    .addEdge("saveMemory", END)

    // routeToAgent -> toolExecutor -> callModel
    .addEdge("routeToAgent", "toolExecutor")
    .addEdge("toolExecutor", "callModel")

    // callModel -> qualityGate
    .addEdge("callModel", "qualityGate")

    // qualityGate -> formatResponse -> saveMemory -> END
    .addEdge("qualityGate", "formatResponse")
    .addEdge("formatResponse", "saveMemory")
    .addEdge("saveMemory", END);

  _compiledGraph = workflow.compile();
  return _compiledGraph;
}

// For development hot-reload: invalidate cached graph
export function invalidateGraphCache() {
  _compiledGraph = null;
}

export interface NovaGraphInput {
  prompt: string;
  systemPrompt: string;
  ctx: LangGraphToolContext;
  intent?: NovaIntent;
  routeDecision?: RouteDecision;
  signal?: AbortSignal;
}

export interface NovaGraphOutput {
  response: string;
  route: string;
  toolResults: Array<{ toolName: string; result?: unknown; error?: string }>;
}

export async function runNovaGraph(input: NovaGraphInput): Promise<NovaGraphOutput> {
  const graph = createNovaGraph();

  const initialState: AgentStateType = {
    messages: [{ role: "user", content: input.prompt }],
    systemPrompt: input.systemPrompt,
    toolContext: input.ctx,
    route: "CHAT",
    signal: input.signal,
    intent: input.intent ?? "READ",
    routeDecision: input.routeDecision ?? null,
    routerConfig: await routeModel(input.prompt, input.ctx.workspaceId),
    workspaceContext: "",
    memoryContext: "",
    conversationContext: "",
    toolResults: [],
    response: "",
    extractedParams: undefined,
    actionValidation: null,
    proactiveInsights: null,
    executionPlan: null,
    fastPathHandled: false,
    shouldReturn: false,
  };

  const result = await graph.invoke(initialState);

  return {
    response: result.response,
    route: result.route,
    toolResults: result.toolResults,
  };
}
