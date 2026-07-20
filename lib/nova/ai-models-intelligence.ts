import { prisma } from "../prisma";

export type TaskComplexity = "SIMPLE" | "REASONING" | "CRITICAL";
export type ModelProvider = "OPENROUTER" | "COHERE" | "OPENAI" | "GEMINI";

export const MODEL_STACK: Array<{ provider: ModelProvider; layer: string; purpose: string; defaultModel?: string }> = [
  { provider: "OPENROUTER", layer: "primary", purpose: "Default entry point", defaultModel: "openrouter/free" },
  { provider: "GEMINI", layer: "secondary", purpose: "Fallback execution", defaultModel: "gemini-2.5-flash" },
  { provider: "COHERE", layer: "emergency", purpose: "Third layer fallback", defaultModel: "command-a-03-2025" },
  { provider: "OPENAI", layer: "ultimate", purpose: "Last resort fallback", defaultModel: "gpt-4o-mini" },
];

export const MODEL_SELECTION_STRATEGIES: Array<{ complexity: TaskComplexity; description: string; recommendedModels: string[] }> = [
  { complexity: "SIMPLE", description: "Summaries, Rewrites", recommendedModels: ["openrouter/free"] },
  { complexity: "REASONING", description: "Sprint planning, Dependency analysis", recommendedModels: ["openrouter/free", "gemini-2.5-flash"] },
  { complexity: "CRITICAL", description: "Executive reports, Risk assessments", recommendedModels: ["openrouter/free", "gpt-4o-mini"] },
];

export function getModelForComplexity(complexity: TaskComplexity): string {
  const strategy = MODEL_SELECTION_STRATEGIES.find(s => s.complexity === complexity);
  return strategy?.recommendedModels[0] ?? "openrouter/free";
}

export interface ActiveModelConfig {
  id: string;
  provider: ModelProvider;
  modelName: string;
  apiKeyRef: string;
  priority: number;
  isEnabled: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
}

export class AiModelsIntelligence {
  public static async getActiveModelStack(workspaceId: string): Promise<ActiveModelConfig[]> {
    
    const configs = await prisma.aiModelConfig.findMany({
      where: { workspaceId, isEnabled: true },
      orderBy: { priority: "asc" },
    });
    return configs.map(c => ({
      id: c.id,
      provider: c.provider as ModelProvider,
      modelName: c.modelName,
      apiKeyRef: c.apiKeyRef,
      priority: c.priority,
      isEnabled: c.isEnabled,
      usageCount: c.usageCount,
      lastUsedAt: c.lastUsedAt,
    }));
  }

  public static async setModelConfig(
    workspaceId: string,
    provider: string,
    modelName: string,
    apiKeyRef: string,
    priority: number
  ): Promise<ActiveModelConfig> {
    
    const config = await prisma.aiModelConfig.upsert({
      where: { workspaceId_provider: { workspaceId, provider } },
      create: { workspaceId, provider, modelName, apiKeyRef, priority },
      update: { modelName, apiKeyRef, priority },
    });
    return {
      id: config.id,
      provider: config.provider as ModelProvider,
      modelName: config.modelName,
      apiKeyRef: config.apiKeyRef,
      priority: config.priority,
      isEnabled: config.isEnabled,
      usageCount: config.usageCount,
      lastUsedAt: config.lastUsedAt,
    };
  }

  public static async toggleProvider(workspaceId: string, provider: string, isEnabled: boolean): Promise<void> {
    
    await prisma.aiModelConfig.updateMany({
      where: { workspaceId, provider },
      data: { isEnabled },
    });
  }

  public static async incrementUsage(workspaceId: string, provider: string): Promise<void> {
    
    await prisma.aiModelConfig.updateMany({
      where: { workspaceId, provider },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  public static getModelStack() {
    return MODEL_STACK;
  }

  public static getSelectionStrategies() {
    return MODEL_SELECTION_STRATEGIES;
  }

  public static getRules() {
    return MODEL_SELECTION_STRATEGIES;
  }
}
