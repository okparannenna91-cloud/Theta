import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getLangChainModel } from "../models";
import type { ProviderName } from "@/lib/nova/provider-health";
import { logger } from "@/lib/logger";
import type { RouterConfig, RouterProvider } from "../model-router";

const FALLBACK_MODELS: Record<string, { provider: string; model: string }> = {
  gemini: { provider: "gemini", model: "gemini-2.5-flash" },
  cohere: { provider: "cohere", model: "command-a-03-2025" },
  openai: { provider: "openrouter", model: "openai/gpt-4o-mini" },
};

export async function executeWithFallback(
  prompt: string,
  systemPrompt: string,
  primaryConfig: RouterConfig,
): Promise<string> {
  const fallbackOrder = ["gemini", "cohere", "openai"] as const;

  // Try primary
  try {
    logger.info("[ProviderFallback] Trying primary", { provider: primaryConfig.provider, model: primaryConfig.model });
    const model = getLangChainModel(primaryConfig.provider, primaryConfig.model);
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ]);
    return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  } catch (error: any) {
    logger.warn("[ProviderFallback] Primary failed:", error.message);
  }

  // Try fallbacks in parallel
  const { ProviderHealth } = await import("@/lib/nova/provider-health");
  const health = new ProviderHealth();
  const available: { provider: RouterProvider; model: string }[] = [];

  for (const p of fallbackOrder) {
    const fallback = FALLBACK_MODELS[p];
    const envKey = { gemini: "GEMINI_API_KEY", cohere: "COHERE_API_KEY", openai: "OPENAI_API_KEY" }[p];
    const providerName = { gemini: "Gemini", cohere: "Cohere", openai: "OpenAI" }[p];
    if (process.env[envKey] && health.isAvailable(providerName as ProviderName)) {
      available.push({ provider: fallback.provider as RouterProvider, model: fallback.model });
    }
  }

  const results = await Promise.allSettled(
    available.map(async ({ provider, model }) => {
      const chatModel = getLangChainModel(provider, model);
      const response = await chatModel.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt),
      ]);
      return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") return r.value;
  }

  throw new Error("All AI providers failed. Please try again.");
}
