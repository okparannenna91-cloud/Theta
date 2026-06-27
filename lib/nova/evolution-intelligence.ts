import { prisma } from "../prisma";
import {
  EVOLUTION_MILESTONES,
  LONG_TERM_VISION,
  FUTURE_PRINCIPLES,
  HUMAN_CONTROL_RULE,
  getStageMilestone,
  CURRENT_STAGE,
  type NovaStage,
} from "./config";

export {
  EVOLUTION_MILESTONES,
  LONG_TERM_VISION,
  FUTURE_PRINCIPLES,
  HUMAN_CONTROL_RULE,
  type NovaStage,
} from "./config";

export interface StageProgress {
  stage: NovaStage;
  target: string;
  capabilities: string[];
  achieved: boolean;
  completionPercentage: number;
}

export interface EvolutionAssessment {
  currentStage: NovaStage;
  progress: StageProgress[];
  overallPercentage: number;
  nextMilestone: StageProgress | null;
  recommendation: string;
}

export class EvolutionIntelligence {
  public static assess(currentStage: NovaStage = CURRENT_STAGE): EvolutionAssessment {
    const stages = EVOLUTION_MILESTONES;
    const currentIndex = stages.findIndex(s => s.stage === currentStage);

    const progress: StageProgress[] = stages.map((m, i) => ({
      stage: m.stage,
      target: m.target,
      capabilities: m.capabilities,
      achieved: i < currentIndex,
      completionPercentage: i < currentIndex ? 100 : i === currentIndex ? 45 : 0,
    }));

    const completedCount = progress.filter(p => p.achieved).length;
    const currentProgress = progress.find(p => p.stage === currentStage)?.completionPercentage || 0;
    const overallPercentage = Math.round(
      ((completedCount / stages.length) * 100) + (currentProgress / stages.length)
    );

    const nextMilestone = stages[currentIndex + 1] || null;
    const nextProgress = nextMilestone
      ? { ...nextMilestone, achieved: false, completionPercentage: 0 }
      : null;

    let recommendation = "";
    if (currentStage === "ASSISTANT") {
      recommendation = "Focus on enabling task and project management capabilities to reach OPERATOR stage.";
    } else if (currentStage === "OPERATOR") {
      recommendation = "Build monitoring and risk detection systems to advance to MANAGER stage.";
    } else if (currentStage === "MANAGER") {
      recommendation = "Develop multi-agent orchestration and cross-project visibility for COORDINATOR stage.";
    } else if (currentStage === "COORDINATOR") {
      recommendation = "Enable autonomous execution and strategic planning for WORKFORCE stage.";
    } else {
      recommendation = "The digital workforce stage is the final evolution milestone.";
    }

    return {
      currentStage,
      progress,
      overallPercentage,
      nextMilestone: nextProgress,
      recommendation,
    };
  }

  public static getMilestone(stage: NovaStage): ReturnType<typeof getStageMilestone> {
    return getStageMilestone(stage);
  }

  public static getVision(): string {
    return LONG_TERM_VISION;
  }

  public static getPrinciples(): string[] {
    return FUTURE_PRINCIPLES;
  }

  public static getHumanControlRule(): string {
    return HUMAN_CONTROL_RULE;
  }

  public static async trackFeature(
    workspaceId: string,
    stage: string,
    featureKey: string,
    isEnabled: boolean
  ): Promise<boolean> {
    try {
      
      await prisma.evolutionTracking.upsert({
        where: { workspaceId_featureKey: { workspaceId, featureKey } },
        create: {
          workspaceId,
          stage,
          featureKey,
          isEnabled,
          enabledAt: isEnabled ? new Date() : null,
        },
        update: {
          isEnabled,
          stage,
          enabledAt: isEnabled ? new Date() : undefined,
          disabledAt: isEnabled ? null : new Date(),
        },
      });
      return true;
    } catch (error) {
      console.warn("[EvolutionIntelligence] Failed to track feature:", error);
      return false;
    }
  }

  public static async getFeatureStatus(
    workspaceId: string,
    featureKey: string
  ): Promise<{ isEnabled: boolean; stage: string } | null> {
    try {
      
      const entry = await prisma.evolutionTracking.findUnique({
        where: { workspaceId_featureKey: { workspaceId, featureKey } },
      });
      if (!entry) return null;
      return { isEnabled: entry.isEnabled, stage: entry.stage };
    } catch (error) {
      console.warn("[EvolutionIntelligence] Failed to get feature status:", error);
      return null;
    }
  }

  public static async getStageProgress(
    workspaceId: string
  ): Promise<Array<{ featureKey: string; stage: string; isEnabled: boolean; enabledAt: Date | null }>> {
    try {
      
      return await prisma.evolutionTracking.findMany({
        where: { workspaceId },
        orderBy: [{ isEnabled: "desc" }, { updatedAt: "desc" }],
        select: { featureKey: true, stage: true, isEnabled: true, enabledAt: true },
      });
    } catch (error) {
      console.warn("[EvolutionIntelligence] Failed to get stage progress:", error);
      return [];
    }
  }
}

export const CURRENT_STAGE_VALUE = CURRENT_STAGE;
