import { getPrismaClient } from "../prisma";
import { MODEL_STACK, MODEL_SELECTION_STRATEGIES, MODEL_SELECTION_RULES, getModelForComplexity, type ModelProvider, type TaskComplexity } from "./constitution/ai-models";

export {
  MODEL_STACK,
  MODEL_SELECTION_STRATEGIES,
  MODEL_SELECTION_RULES,
  getModelForComplexity,
  type ModelProvider,
  type TaskComplexity as AiTaskComplexity,
} from "./constitution/ai-models";

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
    const db = getPrismaClient(workspaceId);
    const configs = await db.aiModelConfig.findMany({
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
    const db = getPrismaClient(workspaceId);
    const config = await db.aiModelConfig.upsert({
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
    const db = getPrismaClient(workspaceId);
    await db.aiModelConfig.updateMany({
      where: { workspaceId, provider },
      data: { isEnabled },
    });
  }

  public static async incrementUsage(workspaceId: string, provider: string): Promise<void> {
    const db = getPrismaClient(workspaceId);
    await db.aiModelConfig.updateMany({
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
    return MODEL_SELECTION_RULES;
  }
}
