import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { NovaEventBus } from "./event-bus";
import { ContextCollector } from "./context-collector";
import { PatternDetector } from "./pattern-detection";
import { InterventionScorer } from "./intervention-scorer";
import { LLMReasoner } from "./llm-reasoner";
import { UIDelivery } from "./ui-delivery";
import { WorkspaceMemory } from "./workspace-memory";
import { Scheduler } from "./scheduler";
import { ChatObserver } from "./chat-observer";
import { PersonalityEngine } from "./personality-engine";
import type { WorkspaceEvent, Intervention, DetectedPattern, LLMDecision } from "./types";

const SCORE_BEFORE_LLM_THRESHOLD = 1;

export class ObservationPipeline {
  private static initialized = false;
  private static heartbeatIntervalMs = 600000;
  private static heartbeatTimers = new Map<string, ReturnType<typeof setInterval>>();

  static initialize(options?: { startGlobalHeartbeat?: boolean }): void {
    if (this.initialized) return;
    this.initialized = true;

    const bus = NovaEventBus.getInstance();
    bus.onAny(async (event) => {
      await this.processEvent(event).catch((error: any) => {
        logger.warn("[ObservationPipeline] Event processing failed:", error.message);
      });
    });

    if (options?.startGlobalHeartbeat !== false && typeof globalThis.setInterval !== "undefined") {
      this.startGlobalHeartbeat().catch(() => {});
    }

    logger.info("[ObservationPipeline] Initialized — event-driven + heartbeat mode");
  }

  static async processEvent(event: WorkspaceEvent): Promise<Intervention | null> {
    const start = Date.now();

    if (event.type === "morning" && event.metadata?.briefingType === "morning") {
      return null;
    }

    const context = await ContextCollector.collect(event);

    if (event.type === "chat:message") {
      await this.handleChatEvent(event, context);
      return null;
    }

    if (event.type === "heartbeat") {
      await Scheduler.performHeartbeatScan(event.workspaceId);
      return null;
    }

    if (event.type === "morning") {
      if (await Scheduler.shouldGenerateBriefing(event.workspaceId, "morning")) {
        await Scheduler.generateMorningBriefing(event.workspaceId, event.userId);
      }
      return null;
    }

    if (event.type === "evening") {
      if (await Scheduler.shouldGenerateBriefing(event.workspaceId, "evening")) {
        await Scheduler.generateEndOfDaySummary(event.workspaceId, event.userId);
      }
      return null;
    }

    const patterns = await PatternDetector.detect(context);
    const score = InterventionScorer.score(context, patterns);

    if (score.level === 0) {
      logger.debug("[ObservationPipeline] Level 0 — staying silent", {
        eventType: event.type,
        latencyMs: Date.now() - start,
      });
      return null;
    }

    let decision: LLMDecision;

    if (score.level >= SCORE_BEFORE_LLM_THRESHOLD) {
      decision = await LLMReasoner.reason(context, patterns, score);
    } else {
      decision = {
        shouldSpeak: false,
        level: 0,
        message: "",
        reasoning: "Low-level observation — LLM reasoning skipped.",
        category: "SUMMARY",
        tone: "neutral",
      };
    }

    if (!decision.shouldSpeak) {
      logger.debug("[ObservationPipeline] LLM decided to stay silent", {
        eventType: event.type,
        level: decision.level,
        reasoning: decision.reasoning,
        latencyMs: Date.now() - start,
      });
      return null;
    }

    if (event.userId) {
      await WorkspaceMemory.recordUserActivity(event.userId, event.workspaceId, event.type, "event");
    }

    const intervention: Intervention = {
      id: randomUUID(),
      level: decision.level,
      category: decision.category,
      title: this.buildTitle(patterns, decision),
      message: decision.message,
      workspaceId: event.workspaceId,
      targetUserId: event.userId,
      targetProjectId: event.projectId,
      targetTaskId: event.taskId,
      targetSprintId: event.sprintId,
      patterns,
      score,
      suggestedAction: patterns.length > 0 ? patterns[0].suggestedAction : undefined,
      dismissed: false,
      createdAt: new Date(),
      source: "event",
    };

    await UIDelivery.deliver(intervention);

    logger.info("[ObservationPipeline] Intervention delivered", {
      level: intervention.level,
      category: intervention.category,
      eventType: event.type,
      patternCount: patterns.length,
      latencyMs: Date.now() - start,
    });

    return intervention;
  }

  static async triggerMorningBriefing(workspaceId: string, userId?: string): Promise<void> {
    await Scheduler.generateMorningBriefing(workspaceId, userId);
  }

  static async triggerEveningSummary(workspaceId: string, userId?: string): Promise<void> {
    await Scheduler.generateEndOfDaySummary(workspaceId, userId);
  }

  static startWorkspaceHeartbeat(workspaceId: string): void {
    if (this.heartbeatTimers.has(workspaceId)) return;

    const timer = setInterval(async () => {
      try {
        await this.processEvent({
          type: "heartbeat",
          workspaceId,
          timestamp: new Date(),
          metadata: { scanType: "periodic" },
        });
      } catch (error: any) {
        logger.warn("[ObservationPipeline] Heartbeat failed:", error.message);
      }
    }, this.heartbeatIntervalMs);

    this.heartbeatTimers.set(workspaceId, timer);
  }

  static stopWorkspaceHeartbeat(workspaceId: string): void {
    const timer = this.heartbeatTimers.get(workspaceId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(workspaceId);
    }
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  static setHeartbeatInterval(ms: number): void {
    this.heartbeatIntervalMs = Math.max(30000, Math.min(ms, 3600000));
  }

  private static async handleChatEvent(event: WorkspaceEvent, context: any): Promise<void> {
    if (!event.metadata?.content) return;

    const chatDecision = await ChatObserver.analyzeMessage(event, context);

    if (!chatDecision.shouldParticipate || !chatDecision.suggestedMessage) return;

    const message = PersonalityEngine.enforceVoice(chatDecision.suggestedMessage, 1, "COACHING");

    const channelId = (event.metadata?.channelId as string) || "general";
    await UIDelivery.deliverChatMessage(event.workspaceId, channelId, message);

    logger.info("[ObservationPipeline] Chat participation", {
      workspaceId: event.workspaceId,
      channelId,
      contributionType: chatDecision.contributionType,
      confidence: chatDecision.confidence,
    });
  }

  private static async startGlobalHeartbeat(): Promise<void> {
    const workspaces = await (await import("@/lib/prisma")).prisma.workspace.findMany({
      where: { billingStatus: { not: "canceled" } },
      select: { id: true },
      take: 50,
    });

    for (const ws of workspaces) {
      this.startWorkspaceHeartbeat(ws.id);
    }

    logger.info("[ObservationPipeline] Heartbeat started for", `${workspaces.length} workspace(s)`);
  }

  private static buildTitle(patterns: DetectedPattern[], decision: { category: string }): string {
    if (patterns.length > 0) {
      return patterns[0].title;
    }
    return `Nova observation: ${decision.category.replace(/_/g, " ").toLowerCase()}`;
  }
}
