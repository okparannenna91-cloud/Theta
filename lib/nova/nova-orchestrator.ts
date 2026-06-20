import { generateWithOpenRouter } from "../openrouter";
import { generateWithCohere } from "../cohere";
import { generateWithOpenAI } from "../openai";
import { getModel as getGeminiModel } from "../gemini";
import { DecisionFramework, type DecisionResult } from "./decision-framework";
import { PhilosophyEngine } from "./philosophy-engine";
import { OutputValidator } from "./output-validator";
import { logger } from "../logger";
import { ProviderHealth, type ProviderName } from "./provider-health";

export type TaskComplexity = "simple" | "reasoning" | "critical";

export interface OrchestrationOptions {
  complexity?: TaskComplexity;
  imageUrl?: string;
  systemPrompt?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;
const FALLBACK_TIMEOUT_MS = 10000;

const providerHealth = new ProviderHealth();

export class NovaOrchestrator {
  private static defaultSystemPrompt = "You are Nova, the intelligent operating system of Theta.";

  public static async execute(
    prompt: string,
    options: OrchestrationOptions = {}
  ): Promise<string> {
    const complexity = options.complexity || "simple";
    const primaryTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const decision = DecisionFramework.evaluate(prompt);

    if (decision.requiresApproval) {
      return `**ACTION BLOCKED — CONFIRMATION REQUIRED**

Your request has been classified as **HIGH RISK** (${decision.intent.toUpperCase()} action).
Please confirm explicitly if you want to proceed with: "${prompt}".`;
    }

    const systemPrompt = (options.systemPrompt || this.defaultSystemPrompt) + `
[DECISION FRAMEWORK EVALUATION]
- Intent: ${decision.intent}
- Risk Level: ${decision.riskLevel}
- Strategy: ${decision.strategy}
- Priority: Action/Outcome first, then Explanation last. Use concise bold lists.
`;

    async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, label: string, timeoutMs: number): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        logger.warn(`[NovaOrchestrator] ${label} timed out after ${timeoutMs}ms — aborting`);
        controller.abort();
      }, timeoutMs);
      try {
        const result = await fn(controller.signal);
        return result;
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
          throw new Error(`${label} timed out after ${timeoutMs}ms`);
        }
        logger.warn(`[NovaOrchestrator] ${label} failed: ${error?.message || error}`);
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }

    const modelName = this.selectModel(prompt, complexity, decision);

    const primaryProvider: ProviderName = "OpenRouter";
    const fallbackProviders: ProviderName[] = ["Cohere", "OpenAI", "Gemini"];

    if (providerHealth.isDegraded()) {
      logger.warn("[NovaOrchestrator] Operating in degraded mode — limited provider availability");
    }

    let response = "";

    // Phase 1: Try primary provider
    if (process.env.OPENROUTER && providerHealth.isAvailable(primaryProvider)) {
      logger.info(`[NovaOrchestrator] Attempting ${primaryProvider} with model: ${modelName}, complexity: ${complexity}`);
      try {
        response = OutputValidator.validate(await withTimeout(
          (signal) => this.executeOpenRouter(prompt, systemPrompt, modelName, options.imageUrl, signal),
          primaryProvider,
          primaryTimeout
        ));
        providerHealth.recordSuccess(primaryProvider);
      } catch (error: any) {
        providerHealth.recordFailure(primaryProvider);
        logger.warn(`[NovaOrchestrator] ${primaryProvider} failed: ${error.message}.`);
      }
    } else if (process.env.OPENROUTER) {
      logger.warn(`[NovaOrchestrator] Skipping ${primaryProvider} — circuit is ${providerHealth.getState(primaryProvider)}`);
    }

    // Phase 2: Parallel fallback with remaining available providers
    if (!response && !options.imageUrl) {
      const availableFallbacks = fallbackProviders.filter(
        (name) => process.env[this.envKeyForProvider(name)] && providerHealth.isAvailable(name)
      );

      for (const name of fallbackProviders) {
        if (process.env[this.envKeyForProvider(name)] && !providerHealth.isAvailable(name)) {
          logger.warn(`[NovaOrchestrator] Skipping ${name} — circuit is ${providerHealth.getState(name)}`);
        }
      }

      if (availableFallbacks.length > 0) {
        logger.info(`[NovaOrchestrator] Attempting parallel fallback with: ${availableFallbacks.join(", ")}`);
        try {
          response = await Promise.any(
            availableFallbacks.map((name) =>
              withTimeout(
                (signal) => this.executeFallback(name, prompt, systemPrompt, signal),
                name,
                FALLBACK_TIMEOUT_MS
              ).then((result) => {
                providerHealth.recordSuccess(name);
                return OutputValidator.validate(result);
              }).catch((error) => {
                providerHealth.recordFailure(name);
                throw error;
              })
            )
          );
        } catch (error: any) {
          if (error instanceof AggregateError) {
            logger.error(`[NovaOrchestrator] All parallel fallbacks failed`);
          } else {
            logger.error(`[NovaOrchestrator] Fallback error: ${error.message}`);
          }
        }
      }
    }

    if (!response) {
      throw new Error("Nova is temporarily unavailable. Please try again in a moment.");
    }

    return PhilosophyEngine.optimizeResponse(response, decision.intent);
  }

  private static envKeyForProvider(name: ProviderName): string {
    switch (name) {
      case "OpenRouter": return "OPENROUTER";
      case "Cohere": return "COHERE_API_KEY";
      case "OpenAI": return "OPENAI_API_KEY";
      case "Gemini": return "GEMINI_API_KEY";
    }
  }

  private static async executeFallback(
    name: ProviderName,
    prompt: string,
    systemPrompt: string,
    signal?: AbortSignal
  ): Promise<string> {
    switch (name) {
      case "Cohere":
        return generateWithCohere(prompt, systemPrompt, signal);
      case "OpenAI":
        return (await generateWithOpenAI(prompt, systemPrompt, signal)) ?? "";
      case "Gemini": {
        const result = await getGeminiModel().generateContent({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser Prompt: ${prompt}` }] }],
        });
        return result.response.text();
      }
      default:
        throw new Error(`Unknown fallback provider: ${name}`);
    }
  }

  private static async executeOpenRouter(
    prompt: string,
    systemPrompt: string,
    modelName: string,
    imageUrl?: string,
    signal?: AbortSignal
  ): Promise<string> {
    return generateWithOpenRouter(prompt, systemPrompt, imageUrl, modelName, signal);
  }

  private static selectModel(prompt: string, complexity: TaskComplexity, decision: DecisionResult): string {
    const isCodeTask = /\b(code|implement|function|script|algorithm|api|endpoint|migration|refactor|debug)\b/i.test(prompt);
    const isCreativeTask = /\b(write|draft|compose|brainstorm|creative|story|content)\b/i.test(prompt);
    const isAnalysisTask = /\b(analyze|evaluate|compare|assess|review|audit|metrics|insights?)\b/i.test(prompt);
    const isDataTask = /\b(data|export|report|statistics|chart|dashboard|aggregate)\b/i.test(prompt);

    const cheapModel = "google/gemini-flash-1.5";
    const balancedModel = "openai/gpt-4o-mini";
    const powerfulModel = "openai/gpt-4o";
    const reasoningModel = "anthropic/claude-3-5-sonnet";

    if (complexity === "reasoning" || decision.strategy === "PATH_C_MULTISTEP") {
      return reasoningModel;
    }

    if (complexity === "critical" || decision.riskLevel === "MEDIUM") {
      return powerfulModel;
    }

    if (isCodeTask || isAnalysisTask) {
      return balancedModel;
    }

    if (isDataTask || isCreativeTask) {
      return balancedModel;
    }

    return cheapModel;
  }
}
