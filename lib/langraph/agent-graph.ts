import { Annotation, StateGraph, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { getLangChainModel } from "./models";
import { routeModel, type RouterConfig } from "./model-router";
import { buildLangGraphTools, type LangGraphToolContext } from "./tools";
import { loadWorkspaceContext } from "./nodes/context-loader";
import { loadMemory } from "./nodes/memory-loader";
import { saveConversationMemory } from "./nodes/memory-saver";
import { validateAndSanitize, optimizeResponse, runQualityGate } from "./nodes/output-validator";
import { executeTool } from "./nodes/tool-executor";
import { sanitizeUserInput } from "@/lib/nova/output-validator";
import { routeRequest, type RouteDecision } from "@/lib/nova/intent-router";
import { type NovaIntent } from "@/lib/nova/constitution/execution";
import { ParameterExtractor } from "@/lib/nova/parameter-extractor";
import { ValidationEngine } from "@/lib/nova/validation-engine";
import { ProactiveIntelligenceEngine } from "@/lib/nova/proactive-intelligence";
import { ResponseFormatter } from "@/lib/nova/response-formatter";
import { logger } from "@/lib/logger";

const MAX_TOOL_ITERATIONS = 4;

interface GraphMessage {
  role: string;
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{ name: string; args: Record<string, unknown>; id?: string }>;
}

interface PendingToolCall {
  name: string;
  args: Record<string, unknown>;
  id: string;
}

const AgentState = Annotation.Root({
  messages: Annotation<GraphMessage[]>({
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
  toolResults: Annotation<Array<{ toolName: string; args?: Record<string, unknown>; result?: unknown; error?: string }>>({
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
  pendingToolCalls: Annotation<PendingToolCall[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  loopCount: Annotation<number>({
    reducer: (prev, next) => prev + next,
    default: () => 0,
  }),
  toolRounds: Annotation<number>({
    reducer: (prev, next) => prev + next,
    default: () => 0,
  }),
  toolsExecutedThisPass: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  confirmationRequested: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  shouldReturn: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
});

type AgentStateType = typeof AgentState.State;

// Node 1: classifyIntent — determine route + model
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
    memoryContext = `[FLOW³ LONG-TERM MEMORY]\n${loadedMemory.longTerm.map(m => `- ${m.key}: ${sanitizeUserInput(m.value).substring(0, 200)}`).join("\n")}`;
  }

  let ragContext = "";
  if (process.env.RAG_ENABLED === "true") {
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
  }

  let conversationContext = "";
  if (loadedMemory.shortTerm.length > 0) {
    const recentMessages = loadedMemory.shortTerm.slice(-10);
    const formattedHistory = recentMessages.map(m => {
      const role = m.role === "user" ? "User" : "Flow³";
      const content = sanitizeUserInput(m.content).substring(0, 150);
      return `${role}: ${content}`;
    }).join("\n");
    conversationContext = `[RECENT CONVERSATION]\n${formattedHistory}`;
  }

  logger.info("[Graph] loadContext", { workspaceContextLen: workspaceContext.length, memoryContextLen: memoryContext.length, ragContextLen: ragContext.length });

  return { workspaceContext: (workspaceContext || "") + (ragContext ? "\n\n" + ragContext : ""), memoryContext, conversationContext };
}

// Node 3: evaluateRisk — validate action params, load proactive insights
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

      // Only invalid actions return early (missing/invalid data the agent
      // cannot resolve). Confirmation is handled at tool level (executeTool).
      if (actionValidation && !actionValidation.isValid) {
        shouldReturn = true;
      }
    } catch {
      // Validation engine failure — continue
    }
  }

  let proactiveInsights = null;
  if (state.route === "ANALYSIS" && state.toolContext.workspaceId) {
    try {
      proactiveInsights = await ProactiveIntelligenceEngine.analyzeWorkspace(state.toolContext.workspaceId);
    } catch {
      // Proactive intelligence failure — continue
    }
  }

  logger.info("[Graph] evaluateRisk", { intent: state.intent, shouldReturn, hasValidation: !!actionValidation });

  return { extractedParams, actionValidation, proactiveInsights, shouldReturn };
}

// Node 4: callModel — LLM inference; ACTION routes bind tools and may emit tool calls
async function callModel(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const userContent = state.messages[state.messages.length - 1]?.content || "";
  let model = getLangChainModel(state.routerConfig.provider, state.routerConfig.model);

  // ACTION/ANALYSIS routes bind write+read tools; CHAT binds read-only tools
  // so information queries ("show me overdue tasks") hit the real data
  // instead of relying on injected context. After a confirmation request the
  // model may only write the question (no tools bound).
  const isActionRoute = (state.route === "ACTION" || state.route === "ANALYSIS") && !!state.toolContext.workspaceId && !state.confirmationRequested;
  const isReadRoute = state.route === "CHAT" && !!state.toolContext.workspaceId && !state.confirmationRequested;
  let toolNames: string[] = [];
  if (isActionRoute || isReadRoute) {
    try {
      const { categoriesForIntent } = await import("@/lib/ai-tools/registry");
      const categories = isActionRoute
        ? categoriesForIntent(state.intent)
        : categoriesForIntent("READ").filter((c) => c !== "MEMORY");
      const tools = buildLangGraphTools(state.toolContext, categories);
      toolNames = tools.map((t: any) => t.name || "unknown");
      if (typeof (model as any).bindTools === "function") {
        model = (model as any).bindTools(tools) as typeof model;
      }
    } catch (error) {
      logger.warn("[Graph] callModel — tool binding failed, continuing without tools:", error);
    }
  }

  const basePrompt = `${state.systemPrompt || "You are Flow³, Theta PM's AI copilot. You deeply understand the workspace and you both think and execute."}\nToday's date is ${new Date().toDateString()}.`;
  const systemPrompt = [
    basePrompt,
    state.workspaceContext || "",
    state.memoryContext || "",
    state.conversationContext || "",
    state.routeDecision?.promptSuffix || "",
  ].filter(Boolean).join("\n\n");

  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages.map((m) => {
      if (m.role === "user") return new HumanMessage(m.content);
      if (m.role === "assistant") {
        return m.tool_calls?.length
          ? new AIMessage({ content: m.content, tool_calls: m.tool_calls })
          : new AIMessage(m.content);
      }
      if (m.role === "tool") return new ToolMessage(m.content, m.tool_call_id || "");
      return new HumanMessage(m.content);
    }),
  ];

  const response = await model.invoke(messages, { signal: state.signal });
  let content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  const toolCalls = (response as any)?.tool_calls as Array<{ name: string; args: Record<string, unknown>; id?: string }> | undefined;

  // Safety net: models sometimes return empty content as their final turn
  // after executing tools. Synthesize a short summary from the last result
  // so the user never receives a blank response.
  if (!content.trim() && (!toolCalls || toolCalls.length === 0) && state.toolResults.length > 0) {
    const last = state.toolResults[state.toolResults.length - 1];
    const lastMsg = last.result && typeof last.result === "object"
      ? ((last.result as any).message as string | undefined)
      : undefined;
    content = lastMsg ? `Done. ${lastMsg}` : `Done — executed ${last.toolName}.`;
  }

  logger.info("[Graph] callModel", { contentLength: content.length, toolCalls: toolCalls?.length ?? 0, tools: toolNames.length });

  logger.info("[Graph] callModel", { contentLength: content.length, toolCalls: toolCalls?.length ?? 0, tools: toolNames.length });

  const newMessages: GraphMessage[] = [...state.messages];
  newMessages.push({ role: "assistant", content, tool_calls: toolCalls });

  return {
    // NOTE: the messages reducer APPENDS; only return NEW messages here,
    // never a copy of state.messages (that would duplicate history and
    // break the tool_calls <-> ToolMessage pairing).
    messages: [{ role: "assistant", content, tool_calls: toolCalls }],
    response: content,
    pendingToolCalls: toolCalls?.length
      ? toolCalls.map((tc) => ({ name: tc.name, args: tc.args ?? {}, id: tc.id || `${tc.name}-${Date.now()}` }))
      : [],
    loopCount: toolCalls?.length ? 1 : 0,
    toolsExecutedThisPass: false,
  };
}

// Node 5: toolExecutor — execute pending tool calls, feed results back to the model
async function toolExecutor(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const calls = state.pendingToolCalls;
  if (!calls || calls.length === 0) {
    return {};
  }

  const lastUser = [...state.messages].reverse().find((m) => m.role === "user")?.content || "";
  const toolMessages: GraphMessage[] = [];
  const results: Array<{ toolName: string; args?: Record<string, unknown>; result?: unknown; error?: string }> = [];

  for (const call of calls) {
    const r = await executeTool(state.toolContext, call.name, call.args ?? {}, lastUser);
    results.push({ toolName: call.name, args: call.args ?? {}, result: r.result, error: r.error });
    toolMessages.push({
      role: "tool",
      content: r.success ? JSON.stringify(r.result ?? {}) : `Error: ${r.error}`,
      tool_call_id: call.id,
    });
    if (r.success && typeof r.result === "object" && r.result !== null && (r.result as any).status === "confirmation_required") {
      state.confirmationRequested = true;
    }
  }

  logger.info("[Graph] toolExecutor", { executed: calls.map((c) => c.name), confirmationRequested: state.confirmationRequested });

  return {
    // Only NEW messages — the reducer appends to existing state.
    messages: toolMessages,
    toolResults: results,
    pendingToolCalls: [],
    toolsExecutedThisPass: true,
    toolRounds: 1,
    confirmationRequested: state.confirmationRequested,
  };
}

// Node 6: qualityGate — validate, sanitize, optimize response
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

  logger.info("[Graph] qualityGate", { passed: qgResult.passed, issues: qgResult.issues.length });

  return { response: qgResult.response };
}

// Node 7: saveMemory — persist conversation
async function saveMemoryNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  await saveConversationMemory({
    userId: state.toolContext.userId,
    workspaceId: state.toolContext.workspaceId,
    conversationId: state.toolContext.conversationId,
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
function routeAfterRisk(state: AgentStateType): "returnEarly" | "callModel" {
  return state.shouldReturn ? "returnEarly" : "callModel";
}

function routeAfterModel(state: AgentStateType): "executeTools" | "finalize" {
  // After a confirmation request, the model may only write the question.
  if (state.confirmationRequested) {
    return "finalize";
  }
  return state.pendingToolCalls && state.pendingToolCalls.length > 0 ? "executeTools" : "finalize";
}

function routeAfterTools(state: AgentStateType): "callModel" | "finalize" {
  // A confirmation was requested — one final answering turn so the model
  // writes the confirmation question (tools are unbound in that turn).
  if (state.confirmationRequested) {
    return "callModel";
  }
  // toolRounds counts only tool-EXECUTION rounds (toolExecutor +1 each).
  // Allow MAX_TOOL_ITERATIONS rounds plus one final answering turn so the
  // model can summarize the result of the last round.
  if (state.toolsExecutedThisPass && state.toolRounds < MAX_TOOL_ITERATIONS + 1) {
    return "callModel";
  }
  return "finalize";
}

// Return early node — validation failure response
async function returnEarly(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const response = state.actionValidation
    ? ValidationEngine.generateValidationMessage(state.actionValidation)
    : "I need more information to proceed.";

  return { response, shouldReturn: true };
}

// Format response node
async function formatResponse(state: AgentStateType): Promise<Partial<AgentStateType>> {
  // Safety net: never emit a blank response after tools ran — synthesize a
  // summary from the last tool result.
  let response = state.response;
  if (!response?.trim() && state.toolResults.length > 0) {
    const last = state.toolResults[state.toolResults.length - 1];
    const lastMsg = last.result && typeof last.result === "object"
      ? ((last.result as any).message as string | undefined)
      : undefined;
    response = lastMsg ? `Done. ${lastMsg}` : `Done — executed ${last.toolName}.`;
  }
  if (!response?.trim()) return {};

  try {
    const formatType = state.route === "ACTION" ? "action"
      : state.route === "ANALYSIS" ? "analysis"
      : "conversation";

    const formatted = ResponseFormatter.format(response, formatType, {
      includeConfidence: formatType === "analysis",
      includeProactive: formatType === "analysis" && !!state.proactiveInsights?.topRecommendation,
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
    .addNode("callModel", callModel)
    .addNode("toolExecutor", toolExecutor)
    .addNode("qualityGate", qualityGate)
    .addNode("formatResponse", formatResponse)
    .addNode("saveMemory", saveMemoryNode)
    .addNode("returnEarly", returnEarly)

    // Entry: classifyIntent -> loadContext -> evaluateRisk
    .addEdge("__start__", "classifyIntent")
    .addEdge("classifyIntent", "loadContext")
    .addEdge("loadContext", "evaluateRisk")

    // evaluateRisk -> conditional: returnEarly OR callModel
    .addConditionalEdges("evaluateRisk", routeAfterRisk, {
      returnEarly: "returnEarly",
      callModel: "callModel",
    })

    // returnEarly -> saveMemory -> END
    .addEdge("returnEarly", "saveMemory")
    .addEdge("saveMemory", END)

    // callModel -> conditional: tool calls -> toolExecutor, else finalize
    .addConditionalEdges("callModel", routeAfterModel, {
      executeTools: "toolExecutor",
      finalize: "qualityGate",
    })

    // toolExecutor -> conditional: loop back to callModel with results, else finalize
    .addConditionalEdges("toolExecutor", routeAfterTools, {
      callModel: "callModel",
      finalize: "qualityGate",
    })

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
    pendingToolCalls: [],
    loopCount: 0,
    toolRounds: 0,
    toolsExecutedThisPass: false,
    confirmationRequested: false,
    shouldReturn: false,
  };

  const result = await graph.invoke(initialState);

  return {
    response: result.response,
    route: result.route,
    toolResults: result.toolResults,
  };
}