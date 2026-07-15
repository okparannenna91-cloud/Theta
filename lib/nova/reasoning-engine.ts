import { intentFromString, getConfidenceLevel, type NovaIntent, type DecisionStrategy } from "./constitution/decision-framework";
import { DecisionFramework, type DecisionResult } from "./decision-framework";
import { routeRequest, type RouteDecision } from "./intent-router";
import { ContextSystem, type ContextOptions } from "./context-system";
import { MemorySystem } from "./memory-system";
import { logger } from "@/lib/logger";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type ActionType = "ANSWER" | "ASK" | "RECOMMEND" | "EXECUTE" | "PLAN" | "ORCHESTRATE";

export interface MentalModel {
  workspace: { name: string; plan: string; projectCount: number; memberCount: number } | null;
  project: { name: string; taskCount: number; status: string; deadline: string | null } | null;
  task: { title: string; status: string; priority: string; assignee: string | null } | null;
  sprint: { name: string; progress: number; capacity: number } | null;
  team: { memberCount: number; activeMembers: string[] } | null;
  recentActivity: Array<{ title: string; status: string; priority: string }>;
  userRole: string;
  memory: Record<string, string>;
  conversationHistory: Array<{ role: string; content: string }>;
}

export interface ReasoningResult {
  intent: NovaIntent;
  confidence: ConfidenceLevel;
  actionType: ActionType;
  decision: DecisionResult;
  route: RouteDecision;
  mentalModel: MentalModel;
  reasoning: string;
  missingInfo: string[];
  suggestedClarification: string | null;
}

export class ReasoningEngine {
  /**
   * Main reasoning pipeline - think before acting
   */
  public static async reason(
    prompt: string,
    contextOptions: ContextOptions
  ): Promise<ReasoningResult> {
    const startTime = performance.now();

    // Phase 1: Understand objective
    const intent = intentFromString(prompt);

    // Phase 2: Build mental model
    const mentalModel = await this.buildMentalModel(contextOptions);

    // Phase 3: Assess confidence
    const confidence = this.assessConfidence(prompt, mentalModel);

    // Phase 4: Determine action type
    const actionType = this.determineActionType(intent, confidence);

    // Phase 5: Run decision framework
    const decision = DecisionFramework.evaluate(prompt);

    // Phase 6: Route request
    const route = routeRequest(prompt, intent, decision.strategy);

    // Phase 7: Identify missing information
    const missingInfo = this.identifyMissingInfo(prompt, intent, mentalModel);

    // Phase 8: Generate suggested clarification (if needed)
    const suggestedClarification = this.generateClarification(actionType, missingInfo, prompt);

    // Phase 9: Generate reasoning explanation
    const reasoning = this.generateReasoning(intent, confidence, actionType, mentalModel, missingInfo);

    const elapsed = performance.now() - startTime;

    logger.info("[NovaPrime-Reasoning] Completed reasoning pipeline", {
      intent,
      confidence,
      actionType,
      path: route.path,
      reasoningLatencyMs: Math.round(elapsed),
      missingInfoCount: missingInfo.length,
    });

    return {
      intent,
      confidence,
      actionType,
      decision,
      route,
      mentalModel,
      reasoning,
      missingInfo,
      suggestedClarification,
    };
  }

  /**
   * Build complete mental model of workspace
   */
  private static async buildMentalModel(contextOptions: ContextOptions): Promise<MentalModel> {
    try {
      const { structured } = await ContextSystem.getActiveContext(contextOptions);

      // Load memory
      const memory = contextOptions.userId
        ? await MemorySystem.getLongTerm(contextOptions.userId, contextOptions.workspaceId)
        : {};

      // Load conversation history
      const conversationHistory = contextOptions.userId
        ? await MemorySystem.getShortTerm(contextOptions.workspaceId, contextOptions.userId)
        : [];

      return {
        workspace: structured.workspace ? {
          name: structured.workspace.name,
          plan: structured.workspace.plan,
          projectCount: 0, // Will be populated from workspace overview
          memberCount: 0,
        } : null,
        project: structured.project ? {
          name: structured.project.name,
          taskCount: 0,
          status: "active",
          deadline: null,
        } : null,
        task: structured.task ? {
          title: structured.task.title,
          status: structured.task.status,
          priority: structured.task.priority,
          assignee: null,
        } : null,
        sprint: null,
        team: null,
        recentActivity: [],
        userRole: "member",
        memory,
        conversationHistory,
      };
    } catch (error) {
      logger.warn("[NovaPrime-Reasoning] Failed to build mental model:", error);
      return {
        workspace: null,
        project: null,
        task: null,
        sprint: null,
        team: null,
        recentActivity: [],
        userRole: "member",
        memory: {},
        conversationHistory: [],
      };
    }
  }

  /**
   * Assess confidence level based on prompt and mental model
   */
  private static assessConfidence(prompt: string, mentalModel: MentalModel): ConfidenceLevel {
    return getConfidenceLevel(prompt, {
      hasWorkspace: mentalModel.workspace !== null,
      hasProject: mentalModel.project !== null,
      hasTask: mentalModel.task !== null,
      hasTeam: mentalModel.team !== null,
    });
  }

  /**
   * Determine action type based on intent and confidence
   */
  private static determineActionType(intent: NovaIntent, confidence: ConfidenceLevel): ActionType {
    // Low confidence always means ask or recommend
    if (confidence === "LOW") {
      return "ASK";
    }

    switch (intent) {
      case "CREATE":
      case "UPDATE":
      case "DELETE":
      case "AUTOMATE":
      case "IMPORT":
      case "EXPORT":
        return "EXECUTE";
      case "PLAN":
      case "ORCHESTRATE":
        return "PLAN";
      case "CONSULT":
        return "RECOMMEND";
      case "READ":
      case "SEARCH":
      case "ANALYZE":
      case "REPORT":
        return "ANSWER";
      default:
        return "ANSWER";
    }
  }

  /**
   * Identify missing information that may be needed
   */
  private static identifyMissingInfo(
    prompt: string,
    intent: NovaIntent,
    mentalModel: MentalModel
  ): string[] {
    const missing: string[] = [];

    // For creation actions, check what's missing
    if (intent === "CREATE") {
      if (!/\b(?:called|named|titled|title)\b/i.test(prompt)) {
        missing.push("task title");
      }
      if (!/\b(?:priority|high|medium|low|urgent|critical)\b/i.test(prompt)) {
        missing.push("priority");
      }
      if (!/\b(?:due|deadline|by|before|until)\b/i.test(prompt)) {
        missing.push("due date");
      }
      if (!/\b(?:assign|assigned|give to)\b/i.test(prompt)) {
        missing.push("assignee");
      }
    }

    // For project context, check if project exists
    if (intent !== "READ" && intent !== "SEARCH" && !mentalModel.project) {
      missing.push("project context");
    }

    return missing;
  }

  /**
   * Generate clarification question if needed
   */
  private static generateClarification(
    actionType: ActionType,
    missingInfo: string[],
    prompt: string
  ): string | null {
    if (actionType !== "ASK" || missingInfo.length === 0) {
      return null;
    }

    // Only ask for critical missing info
    const criticalMissing = missingInfo.filter(m =>
      m === "task title" || m === "project context"
    );

    if (criticalMissing.length === 0) {
      return null;
    }

    if (criticalMissing.includes("project context")) {
      return "I'd like to help with this, but I need to know which project you're working in. Could you tell me which project this is for?";
    }

    if (criticalMissing.includes("task title")) {
      return "I can create this task for you. What would you like to name it?";
    }

    return null;
  }

  /**
   * Generate human-readable reasoning explanation
   */
  private static generateReasoning(
    intent: NovaIntent,
    confidence: ConfidenceLevel,
    actionType: ActionType,
    mentalModel: MentalModel,
    missingInfo: string[]
  ): string {
    const parts: string[] = [];

    // Intent
    parts.push(`Intent: ${intent}`);

    // Confidence
    parts.push(`Confidence: ${confidence}`);

    // Action type
    parts.push(`Action: ${actionType}`);

    // Context available
    const contextItems: string[] = [];
    if (mentalModel.workspace) contextItems.push(`workspace "${mentalModel.workspace.name}"`);
    if (mentalModel.project) contextItems.push(`project "${mentalModel.project.name}"`);
    if (mentalModel.task) contextItems.push(`task "${mentalModel.task.title}"`);
    if (mentalModel.sprint) contextItems.push(`sprint "${mentalModel.sprint.name}"`);

    if (contextItems.length > 0) {
      parts.push(`Context: ${contextItems.join(", ")}`);
    }

    // Missing info
    if (missingInfo.length > 0) {
      parts.push(`Missing: ${missingInfo.join(", ")}`);
    }

    return parts.join(" | ");
  }
}
