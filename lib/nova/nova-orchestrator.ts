import { generateWithOpenRouter } from "../openrouter";
import { generateWithCohere } from "../cohere";
import { generateWithOpenAI } from "../openai";
import { getModel as getGeminiModel } from "../gemini";
import { DecisionFramework, type DecisionResult } from "./decision-framework";
import { PhilosophyEngine } from "./philosophy-engine";
import { OutputValidator } from "./output-validator";
import { logger } from "../logger";

export type TaskComplexity = "simple" | "reasoning" | "critical";

export interface OrchestrationOptions {
  complexity?: TaskComplexity;
  imageUrl?: string;
  systemPrompt?: string;
}

const PROVIDER_TIMEOUT_MS = 25000;

export class NovaOrchestrator {
  private static defaultSystemPrompt = "You are Nova, the intelligent operating system of Theta.";

  public static async execute(
    prompt: string,
    options: OrchestrationOptions = {}
  ): Promise<string> {
    const complexity = options.complexity || "simple";

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

    let response = "";

    async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, label: string): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        logger.warn(`[NovaOrchestrator] ${label} timed out after ${PROVIDER_TIMEOUT_MS}ms — aborting`);
        controller.abort();
      }, PROVIDER_TIMEOUT_MS);
      try {
        const result = await fn(controller.signal);
        return result;
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
          throw new Error(`${label} timed out after ${PROVIDER_TIMEOUT_MS}ms`);
        }
        logger.warn(`[NovaOrchestrator] ${label} failed: ${error?.message || error}`);
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }

    try {
      if (process.env.OPENROUTER) {
        const modelName = this.selectModel(prompt, complexity, decision);
        logger.info(`[NovaOrchestrator] Attempting OpenRouter with model: ${modelName}, complexity: ${complexity}`);
        response = OutputValidator.validate(await withTimeout(
          (signal) => this.executeOpenRouter(prompt, systemPrompt, modelName, options.imageUrl, signal),
          "OpenRouter"
        ));
      }
    } catch (error: any) {
      logger.warn(`[NovaOrchestrator] OpenRouter failed: ${error.message}. Falling back.`);
    }

    if (!response && !options.imageUrl) {
      try {
        if (process.env.COHERE_API_KEY) {
          logger.info("[NovaOrchestrator] Attempting Secondary Cohere Layer...");
          response = OutputValidator.validate(await withTimeout(
            (signal) => generateWithCohere(prompt, systemPrompt, signal),
            "Cohere"
          ));
        }
      } catch (error: any) {
        logger.warn(`[NovaOrchestrator] Cohere fallback failed: ${error.message}`);
      }
    }

    if (!response) {
      try {
        if (process.env.OPENAI_API_KEY) {
          logger.info("[NovaOrchestrator] Attempting Emergency OpenAI Layer...");
          response = OutputValidator.validate(await withTimeout(
            (signal) => generateWithOpenAI(prompt, systemPrompt, signal).then(r => r ?? ""),
            "OpenAI"
          ));
        }
      } catch (error: any) {
        logger.warn(`[NovaOrchestrator] OpenAI fallback failed: ${error.message}`);
      }
    }

    if (!response) {
      try {
        if (process.env.GEMINI_API_KEY) {
          logger.info("[NovaOrchestrator] Attempting Native Gemini Fallback Layer...");
          const result = await withTimeout(
            (signal) => getGeminiModel().generateContent({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser Prompt: ${prompt}` }] }],
            }).then(r => r.response),
            "Gemini"
          );
          response = OutputValidator.validate(result.text());
        }
      } catch (error: any) {
        logger.error(`[NovaOrchestrator] All fallback layers failed: ${error.message}`);
      }
    }

    if (!response) {
      throw new Error("Nova is temporarily unavailable. Please try again in a moment.");
    }

    return PhilosophyEngine.optimizeResponse(response, decision.intent);
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
