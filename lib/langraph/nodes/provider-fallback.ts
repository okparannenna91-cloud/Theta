import { executeWithProvider, type RouterConfig } from "../model-router";
import type { ProviderName } from "@/lib/nova/provider-health";
import { logger } from "@/lib/logger";

export async function executeWithFallback(
  prompt: string,
  systemPrompt: string,
  primaryConfig: RouterConfig,
): Promise<string> {
  const fallbackOrder = ["gemini", "cohere", "openai"] as const;

  // Try primary
  try {
    logger.info("[ProviderFallback] Trying primary", { provider: primaryConfig.provider, model: primaryConfig.model });
    return await executeWithProvider(primaryConfig.provider, primaryConfig.model, systemPrompt, prompt);
  } catch (error: any) {
    logger.warn("[ProviderFallback] Primary failed:", error.message);
  }

  // Try fallbacks in parallel
  const { ProviderHealth } = await import("@/lib/nova/provider-health");
  const health = new ProviderHealth();
  const available: string[] = [];
  for (const p of fallbackOrder) {
    const envKey = { gemini: "GEMINI_API_KEY", cohere: "COHERE_API_KEY", openai: "OPENAI_API_KEY" }[p];
    const providerName = { gemini: "Gemini", cohere: "Cohere", openai: "OpenAI" }[p];
    if (process.env[envKey] && health.isAvailable(providerName as ProviderName)) available.push(p);
  }

  const results = await Promise.allSettled(
    available.map((p) => executeWithProvider(p as any, "", systemPrompt, prompt))
  );

  for (const r of results) {
    if (r.status === "fulfilled") return r.value;
  }

  throw new Error("All AI providers failed. Please try again.");
}
