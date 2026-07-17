import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { logger } from "@/lib/logger";
import { getLangChainModel } from "./models";

export type RouterProvider = "openrouter" | "openai" | "gemini" | "cohere";

export interface RouterConfig {
  provider: RouterProvider;
  model: string;
  reason: string;
}

export type TaskCategory = "chat" | "reasoning" | "retrieval" | "action" | "analysis" | "creative" | "code";

function classifyPrompt(prompt: string): TaskCategory {
  const lower = prompt.toLowerCase();

  const isCode = /\b(code|implement|function|script|algorithm|api|endpoint|migration|refactor|debug|deploy|write\s+function)\b/i.test(lower);
  const isReasoning = /\b(why|how\s+does|explain\s+why|analyze|compare|evaluate|reason|logic|solve|math|calculate)\b/i.test(lower);
  const isRetrieval = /\b(search|find|look\s+up|retrieve|recall|remember|what\s+is|where\s+is)\b/i.test(lower);
  const isAction = /\b(create|update|delete|add|remove|set|change|mark|complete|list|show)\b/i.test(lower);
  const isAnalysis = /\b(analyze|report|summary|overview|metrics|health|status|insights|trend)\b/i.test(lower);
  const isCreative = /\b(draft|write|compose|brainstorm|creative|story|content|design)\b/i.test(lower);

  if (isCode) return "code";
  if (isReasoning) return "reasoning";
  if (isRetrieval) return "retrieval";
  if (isAction) return "action";
  if (isAnalysis) return "analysis";
  if (isCreative) return "creative";
  return "chat";
}

const CATEGORY_MODEL_MAP: Record<TaskCategory, { provider: RouterProvider; model: string; reason: string }> = {
  chat:      { provider: "gemini",    model: "gemini-2.5-flash",          reason: "Fast chat response" },
  creative:  { provider: "gemini",    model: "gemini-2.5-flash",          reason: "Fast creative response" },
  reasoning: { provider: "openrouter", model: "openai/gpt-4o",            reason: "Strong reasoning" },
  analysis:  { provider: "openrouter", model: "openai/gpt-4o",            reason: "Strong analysis" },
  code:      { provider: "openrouter", model: "anthropic/claude-sonnet-4-20250514", reason: "Best code generation" },
  action:    { provider: "gemini",    model: "gemini-2.5-flash",          reason: "Fast action execution" },
  retrieval: { provider: "gemini",    model: "gemini-2.5-flash",          reason: "Fast information retrieval" },
};

const FALLBACK_CONFIG: RouterConfig = {
  provider: "openrouter",
  model: "openrouter/auto",
  reason: "Fallback: primary provider unavailable",
};

function isProviderAvailable(provider: RouterProvider): boolean {
  switch (provider) {
    case "openrouter": return !!process.env.OPENROUTER_API_KEY;
    case "openai":     return !!process.env.OPENAI_API_KEY;
    case "gemini":     return !!process.env.GEMINI_API_KEY;
    case "cohere":     return !!process.env.COHERE_API_KEY;
    default:           return false;
  }
}

export function routeModel(prompt: string): RouterConfig {
  const category = classifyPrompt(prompt);
  const primary = CATEGORY_MODEL_MAP[category];

  logger.info("[ModelRouter] Classifying prompt", {
    category,
    targetProvider: primary.provider,
    targetModel: primary.model,
    promptPreview: prompt.substring(0, 80),
  });

  if (isProviderAvailable(primary.provider)) {
    return primary;
  }

  logger.warn("[ModelRouter] Primary provider unavailable, falling back", {
    requested: primary.provider,
    fallback: FALLBACK_CONFIG.provider,
  });

  if (isProviderAvailable(FALLBACK_CONFIG.provider)) {
    return FALLBACK_CONFIG;
  }

  for (const provider of ["gemini", "openai", "cohere"] as const) {
    if (isProviderAvailable(provider)) {
      return {
        provider,
        model: CATEGORY_MODEL_MAP[category].model,
        reason: `Fallback: ${primary.provider} unavailable`,
      };
    }
  }

  return FALLBACK_CONFIG;
}

export function getAvailableProviders(): RouterProvider[] {
  const providers: RouterProvider[] = [];
  if (process.env.OPENROUTER_API_KEY) providers.push("openrouter");
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.GEMINI_API_KEY) providers.push("gemini");
  if (process.env.COHERE_API_KEY) providers.push("cohere");
  return providers;
}

export async function executeWithProvider(
  provider: RouterProvider,
  model: string,
  systemPrompt: string,
  prompt: string,
): Promise<string> {
  logger.info("[ModelRouter] Executing with provider", { provider, model });

  const chatModel = getLangChainModel(provider, model);
  const response = await chatModel.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(prompt),
  ]);

  return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
}
