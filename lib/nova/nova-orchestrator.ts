import { generateWithOpenRouter } from "../openrouter";
import { generateWithCohere } from "../cohere";
import { generateWithOpenAI } from "../openai";
import { model as geminiModel } from "../gemini";
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

export class NovaOrchestrator {
  private static defaultSystemPrompt = "You are Nova, the intelligent operating system of Theta.";

  /**
   * Routes a request to the appropriate model provider based on task complexity,
   * falling back sequentially if errors occur. Enforces Sections 1-5 rules.
   */
  public static async execute(
    prompt: string,
    options: OrchestrationOptions = {}
  ): Promise<string> {
    const complexity = options.complexity || "simple";
    
    // Evaluate Decision strategy & risk levels
    const decision = DecisionFramework.evaluate(prompt);
    
    // Core Identity/Philosophy Rule: Intercept and fail high risk requests if not explicitly approved
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

    // 1. Attempt Primary Layer (OpenRouter) with model selected by complexity
    try {
      if (process.env.OPENROUTER) {
        const modelName = this.selectModel(prompt, complexity, decision);
        logger.info(`[NovaOrchestrator] Attempting OpenRouter with model: ${modelName}, complexity: ${complexity}`);
        response = OutputValidator.validate(await this.executeOpenRouter(prompt, systemPrompt, modelName, options.imageUrl));
      }
    } catch (error) {
      logger.warn("[NovaOrchestrator] OpenRouter layer failed. Falling back.", error);
    }

    // 2. Attempt Secondary Layer (Cohere) for text-only
    if (!response && !options.imageUrl) {
      try {
        if (process.env.COHERE_API_KEY) {
          logger.info("[NovaOrchestrator] Attempting Secondary Cohere Layer...");
          response = OutputValidator.validate(await generateWithCohere(prompt, systemPrompt));
        }
      } catch (error) {
        logger.warn("[NovaOrchestrator] Cohere fallback layer failed.", error);
      }
    }

    // 3. Attempt Emergency Layer (OpenAI)
    if (!response) {
      try {
        if (process.env.OPENAI_API_KEY) {
          logger.info("[NovaOrchestrator] Attempting Emergency OpenAI Layer...");
          response = OutputValidator.validate((await generateWithOpenAI(prompt, systemPrompt)) ?? "");
        }
      } catch (error) {
        logger.warn("[NovaOrchestrator] OpenAI fallback layer failed.", error);
      }
    }

    // 4. Ultimate Native Fallback (Google Gemini API directly)
    if (!response) {
      try {
        if (process.env.GEMINI_API_KEY) {
          logger.info("[NovaOrchestrator] Attempting Native Gemini Fallback Layer...");
          const result = await geminiModel.generateContent({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser Prompt: ${prompt}` }] }],
          });
          response = OutputValidator.validate(result.response.text());
        }
      } catch (error) {
        logger.error("[NovaOrchestrator] All fallback layers failed.", error);
      }
    }

    if (!response) {
      throw new Error("Nova failed to execute request. All model providers are currently unavailable.");
    }

    // Optimize output through the Philosophy Engine (Section 2 outcome priority)
    return PhilosophyEngine.optimizeResponse(response, decision.intent);
  }

  private static async executeOpenRouter(
    prompt: string,
    systemPrompt: string,
    modelName: string,
    imageUrl?: string
  ): Promise<string> {
    return generateWithOpenRouter(prompt, systemPrompt, imageUrl, modelName);
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
