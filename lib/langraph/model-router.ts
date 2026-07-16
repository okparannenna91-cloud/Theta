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

export function routeModel(prompt: string): RouterConfig {
  const category = classifyPrompt(prompt);
  const openRouterAvailable = !!process.env.OPENROUTER_API_KEY;
  const openAIAvailable = !!process.env.OPENAI_API_KEY;
  const geminiAvailable = !!process.env.GEMINI_API_KEY;
  const cohereAvailable = !!process.env.COHERE_API_KEY;

  logger.info("[ModelRouter] Classifying prompt", {
    category,
    promptPreview: prompt.substring(0, 80),
  });

  const primaryModel = "openrouter/auto";
  const geminiModel = "gemini-2.5-flash";
  const cohereModel = "command-a-03-2025";
  const openaiModel = "gpt-4o-mini";

  switch (category) {
    case "chat": {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: primaryModel, reason: "Chat routed to OpenRouter" };
      }
      if (geminiAvailable) {
        return { provider: "gemini", model: geminiModel, reason: "Chat via Gemini fallback" };
      }
      if (cohereAvailable) {
        return { provider: "cohere", model: cohereModel, reason: "Chat via Cohere fallback" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: openaiModel, reason: "Chat via OpenAI fallback" };
      }
      return { provider: "openrouter", model: primaryModel, reason: "Default chat route" };
    }

    case "reasoning": {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: primaryModel, reason: "Reasoning task routed to OpenRouter" };
      }
      if (geminiAvailable) {
        return { provider: "gemini", model: geminiModel, reason: "Reasoning via Gemini fallback" };
      }
      if (cohereAvailable) {
        return { provider: "cohere", model: cohereModel, reason: "Reasoning via Cohere fallback" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: openaiModel, reason: "Reasoning via OpenAI fallback" };
      }
      return { provider: "openrouter", model: primaryModel, reason: "Default reasoning route" };
    }

    case "retrieval": {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: primaryModel, reason: "Retrieval routed to OpenRouter" };
      }
      if (geminiAvailable) {
        return { provider: "gemini", model: geminiModel, reason: "Retrieval via Gemini fallback" };
      }
      if (cohereAvailable) {
        return { provider: "cohere", model: cohereModel, reason: "Retrieval via Cohere fallback" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: openaiModel, reason: "Retrieval via OpenAI fallback" };
      }
      return { provider: "openrouter", model: primaryModel, reason: "Default retrieval route" };
    }

    case "action": {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: primaryModel, reason: "Action routed to OpenRouter" };
      }
      if (geminiAvailable) {
        return { provider: "gemini", model: geminiModel, reason: "Action via Gemini fallback" };
      }
      if (cohereAvailable) {
        return { provider: "cohere", model: cohereModel, reason: "Action via Cohere fallback" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: openaiModel, reason: "Action via OpenAI fallback" };
      }
      return { provider: "openrouter", model: primaryModel, reason: "Default action route" };
    }

    case "analysis": {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: primaryModel, reason: "Analysis routed to OpenRouter" };
      }
      if (geminiAvailable) {
        return { provider: "gemini", model: geminiModel, reason: "Analysis via Gemini fallback" };
      }
      if (cohereAvailable) {
        return { provider: "cohere", model: cohereModel, reason: "Analysis via Cohere fallback" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: openaiModel, reason: "Analysis via OpenAI fallback" };
      }
      return { provider: "openrouter", model: primaryModel, reason: "Default analysis route" };
    }

    case "code": {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: primaryModel, reason: "Code routed to OpenRouter" };
      }
      if (geminiAvailable) {
        return { provider: "gemini", model: geminiModel, reason: "Code via Gemini fallback" };
      }
      if (cohereAvailable) {
        return { provider: "cohere", model: cohereModel, reason: "Code via Cohere fallback" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: openaiModel, reason: "Code via OpenAI fallback" };
      }
      return { provider: "openrouter", model: primaryModel, reason: "Default code route" };
    }

    case "creative": {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: primaryModel, reason: "Creative routed to OpenRouter" };
      }
      if (geminiAvailable) {
        return { provider: "gemini", model: geminiModel, reason: "Creative via Gemini fallback" };
      }
      if (cohereAvailable) {
        return { provider: "cohere", model: cohereModel, reason: "Creative via Cohere fallback" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: openaiModel, reason: "Creative via OpenAI fallback" };
      }
      return { provider: "openrouter", model: primaryModel, reason: "Default creative route" };
    }

    default: {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: primaryModel, reason: "Default route" };
      }
      if (geminiAvailable) {
        return { provider: "gemini", model: geminiModel, reason: "Default route via Gemini" };
      }
      if (cohereAvailable) {
        return { provider: "cohere", model: cohereModel, reason: "Default route via Cohere" };
      }
      return { provider: "openai", model: openaiModel, reason: "Default route via OpenAI" };
    }
  }
}

export function getAvailableProviders(): RouterProvider[] {
  const providers: RouterProvider[] = [];
  if (process.env.OPENROUTER_API_KEY) providers.push("openrouter");
  if (process.env.GEMINI_API_KEY) providers.push("gemini");
  if (process.env.COHERE_API_KEY) providers.push("cohere");
  if (process.env.OPENAI_API_KEY) providers.push("openai");
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
