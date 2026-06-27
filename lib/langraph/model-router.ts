import { logger } from "@/lib/logger";

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
  const openRouterAvailable = !!process.env.OPENROUTER;
  const openAIAvailable = !!process.env.OPENAI_API_KEY;
  const geminiAvailable = !!process.env.GEMINI_API_KEY;
  const cohereAvailable = !!process.env.COHERE_API_KEY;

  logger.info("[ModelRouter] Classifying prompt", {
    category,
    promptPreview: prompt.substring(0, 80),
  });

  switch (category) {
    case "chat": {
      if (geminiAvailable) {
        return { provider: "gemini", model: "gemini-1.5-flash", reason: "Simple chat routed to Gemini Flash for cost efficiency" };
      }
      if (openRouterAvailable) {
        return { provider: "openrouter", model: "google/gemini-flash-1.5", reason: "Simple chat via OpenRouter (Gemini Flash)" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: "gpt-4o-mini", reason: "Simple chat via OpenAI fallback" };
      }
      return { provider: "openrouter", model: "google/gemini-flash-1.5", reason: "Default chat route" };
    }

    case "reasoning": {
      if (openAIAvailable) {
        return { provider: "openai", model: "gpt-4o", reason: "Reasoning task routed to OpenAI (GPT-4o)" };
      }
      if (openRouterAvailable) {
        return { provider: "openrouter", model: "openai/gpt-4o", reason: "Reasoning task via OpenRouter (GPT-4o)" };
      }
      return { provider: "gemini", model: "gemini-1.5-flash", reason: "Reasoning fallback to Gemini" };
    }

    case "retrieval": {
      if (cohereAvailable) {
        return { provider: "cohere", model: "command-a-03-2025", reason: "Retrieval task routed to Cohere (optimized for RAG)" };
      }
      if (geminiAvailable) {
        return { provider: "gemini", model: "gemini-1.5-flash", reason: "Retrieval fallback to Gemini" };
      }
      return { provider: "openrouter", model: "google/gemini-flash-1.5", reason: "Retrieval via OpenRouter fallback" };
    }

    case "action": {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: "openai/gpt-4o-mini", reason: "Action routed to OpenRouter (GPT-4o-mini)" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: "gpt-4o-mini", reason: "Action via OpenAI fallback" };
      }
      return { provider: "gemini", model: "gemini-1.5-flash", reason: "Action fallback to Gemini" };
    }

    case "analysis": {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: "openai/gpt-4o-mini", reason: "Analysis routed to OpenRouter (GPT-4o-mini)" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: "gpt-4o-mini", reason: "Analysis via OpenAI fallback" };
      }
      return { provider: "gemini", model: "gemini-1.5-flash", reason: "Analysis fallback to Gemini" };
    }

    case "code": {
      if (openAIAvailable) {
        return { provider: "openai", model: "gpt-4o", reason: "Code task routed to OpenAI (GPT-4o)" };
      }
      if (openRouterAvailable) {
        return { provider: "openrouter", model: "openai/gpt-4o", reason: "Code task via OpenRouter (GPT-4o)" };
      }
      return { provider: "gemini", model: "gemini-1.5-flash", reason: "Code fallback to Gemini" };
    }

    case "creative": {
      if (openRouterAvailable) {
        return { provider: "openrouter", model: "openai/gpt-4o-mini", reason: "Creative task via OpenRouter (GPT-4o-mini)" };
      }
      if (openAIAvailable) {
        return { provider: "openai", model: "gpt-4o-mini", reason: "Creative via OpenAI fallback" };
      }
      return { provider: "gemini", model: "gemini-1.5-flash", reason: "Creative fallback to Gemini" };
    }

    default: {
      return { provider: "openrouter", model: "google/gemini-flash-1.5", reason: "Default route" };
    }
  }
}

export function getAvailableProviders(): RouterProvider[] {
  const providers: RouterProvider[] = [];
  if (process.env.OPENROUTER) providers.push("openrouter");
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

  switch (provider) {
    case "openrouter": {
      const { generateWithOpenRouter } = await import("@/lib/openrouter");
      return generateWithOpenRouter(prompt, systemPrompt, undefined, model);
    }
    case "openai": {
      const { generateWithOpenAI } = await import("@/lib/openai");
      const result = await generateWithOpenAI(prompt, systemPrompt);
      return result ?? "";
    }
    case "gemini": {
      const { getModel } = await import("@/lib/gemini");
      const geminiModel = getModel();
      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser Prompt: ${prompt}` }] }],
      });
      return result.response.text();
    }
    case "cohere": {
      const { generateWithCohere } = await import("@/lib/cohere");
      return generateWithCohere(prompt, systemPrompt);
    }
    default: {
      throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
