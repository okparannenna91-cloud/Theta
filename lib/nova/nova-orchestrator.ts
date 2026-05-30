import { generateWithOpenRouter } from "../openrouter";
import { generateWithCohere } from "../cohere";
import { generateWithOpenAI } from "../openai";
import { model as geminiModel } from "../gemini";
import { DecisionFramework } from "./decision-framework";
import { PhilosophyEngine } from "./philosophy-engine";

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

    // Append decision execution rules to the system prompt to guide LLM behavior
    const systemPromptAddition = `
[DECISION FRAMEWORK EVALUATION]
- Intent: ${decision.intent}
- Risk Level: ${decision.riskLevel}
- Strategy: ${decision.strategy}
- Priority: Action/Outcome first, then Explanation last. Use concise bold lists.
`;

    const systemPrompt = (options.systemPrompt || this.defaultSystemPrompt) + systemPromptAddition;

    let response = "";

    // 1. Attempt Primary Layer (OpenRouter)
    try {
      if (process.env.OPENROUTER) {
        console.log(`[NovaOrchestrator] Attempting Primary OpenRouter Layer with complexity: ${complexity}`);
        let modelName = "google/gemini-flash-1.5";
        if (complexity === "reasoning" || decision.strategy === "PATH_C_MULTISTEP") {
          modelName = "anthropic/claude-3-5-sonnet";
        } else if (complexity === "critical" || decision.riskLevel === "MEDIUM") {
          modelName = "openai/gpt-4o";
        }
        
        response = await this.executeOpenRouter(prompt, systemPrompt, modelName, options.imageUrl);
      }
    } catch (error) {
      console.warn("[NovaOrchestrator] OpenRouter layer failed. Falling back. Error:", error);
    }

    // 2. Attempt Secondary Layer (Cohere) for text-only
    if (!response && !options.imageUrl) {
      try {
        if (process.env.COHERE_API_KEY) {
          console.log("[NovaOrchestrator] Attempting Secondary Cohere Layer...");
          response = await generateWithCohere(prompt, systemPrompt);
        }
      } catch (error) {
        console.warn("[NovaOrchestrator] Cohere fallback layer failed. Error:", error);
      }
    }

    // 3. Attempt Emergency Layer (OpenAI)
    if (!response) {
      try {
        if (process.env.OPENAI_API_KEY) {
          console.log("[NovaOrchestrator] Attempting Emergency OpenAI Layer...");
          response = (await generateWithOpenAI(prompt, systemPrompt)) ?? "";
        }
      } catch (error) {
        console.warn("[NovaOrchestrator] OpenAI fallback layer failed. Error:", error);
      }
    }

    // 4. Ultimate Native Fallback (Google Gemini API directly)
    if (!response) {
      try {
        if (process.env.GEMINI_API_KEY) {
          console.log("[NovaOrchestrator] Attempting Native Gemini Fallback Layer...");
          const result = await geminiModel.generateContent({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser Prompt: ${prompt}` }] }],
          });
          response = result.response.text();
        }
      } catch (error) {
        console.error("[NovaOrchestrator] All fallback layers failed.", error);
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
    const apiKey = process.env.OPENROUTER;
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://thetapm.site",
        "X-Title": "Nova AI",
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "OpenRouter error");
    }

    return data.choices[0].message.content;
  }
}
