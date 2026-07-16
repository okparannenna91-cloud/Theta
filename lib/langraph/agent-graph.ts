import { Annotation, StateGraph, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { getLangChainModel } from "./models";
import { routeModel } from "./model-router";
import { buildLangGraphTools, type LangGraphToolContext } from "./tools";
import { executeTool } from "./nodes/tool-executor";
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
});

type AgentStateType = typeof AgentState.State;

async function callModel(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  const userContent = lastMessage?.content || "";

  const routerConfig = routeModel(userContent);
  const model = getLangChainModel(routerConfig.provider, routerConfig.model);

  const tools = buildLangGraphTools(state.toolContext);
  // bindTools is on all concrete model classes but not on BaseChatModel type
  const modelWithTools = tools.length > 0 ? (model as any).bindTools(tools) : model;

  const messages = [
    new SystemMessage(state.systemPrompt),
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

  const response = await modelWithTools.invoke(messages, {
    signal: state.signal,
  });

  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const toolCalls = response.tool_calls || [];

    logger.info("[LangGraphAgent] Model response", {
      contentLength: content.length,
      toolCallsCount: toolCalls.length,
      toolCalls: toolCalls.map((tc: { name: string }) => tc.name),
    });

  const newMessages = [...state.messages];
  newMessages.push({ role: "assistant", content });

  if (toolCalls.length > 0) {
    for (const tc of toolCalls) {
      newMessages.push({
        role: "assistant",
        content: JSON.stringify({ tool_call: tc }),
      } as any);
    }
  }

  return { messages: newMessages };
}

async function executeTools(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  if (!lastMessage?.content?.includes("tool_call")) {
    return {};
  }

  let toolCall;
  try {
    const parsed = JSON.parse(lastMessage.content);
    toolCall = parsed.tool_call;
  } catch {
    return {};
  }

  if (!toolCall?.name) return {};

  logger.info("[LangGraphAgent] Executing tool", { tool: toolCall.name });

  const result = await executeTool(state.toolContext, toolCall.name, toolCall.arguments || {});

  const toolResult = result.success
    ? JSON.stringify(result.result)
    : `Error: ${result.error}`;

  const newMessages = [
    ...state.messages,
    {
      role: "tool" as const,
      content: toolResult,
      tool_call_id: toolCall.id || "",
    } as any,
  ];

  return { messages: newMessages };
}

function shouldContinue(state: AgentStateType): "tools" | typeof END {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage?.content?.includes("tool_call")) {
    return "tools";
  }
  return END;
}

export function createNovaGraph() {
  const workflow = new StateGraph(AgentState)
    .addNode("agent", callModel)
    .addNode("tools", executeTools)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      [END]: END,
    })
    .addEdge("tools", "agent");

  return workflow.compile();
}

export interface NovaGraphInput {
  prompt: string;
  systemPrompt: string;
  ctx: LangGraphToolContext;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
}

export interface NovaGraphOutput {
  response: string;
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
  };

  const result = await graph.invoke(initialState);

  const lastMessage = result.messages[result.messages.length - 1];
  const response = lastMessage?.content || "";

  const toolResults: Array<{ toolName: string; result?: unknown; error?: string }> = [];
  for (const msg of result.messages) {
    if (msg.content?.includes("tool_call")) {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.tool_call?.name) {
          toolResults.push({ toolName: parsed.tool_call.name, result: parsed.tool_call });
        }
      } catch {}
    }
  }

  return { response, toolResults };
}
