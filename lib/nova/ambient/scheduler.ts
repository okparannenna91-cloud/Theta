import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { WorkspaceMemory } from "./workspace-memory";
import { PatternDetector } from "./pattern-detection";
import { InterventionScorer } from "./intervention-scorer";
import { LLMReasoner } from "./llm-reasoner";
import { UIDelivery } from "./ui-delivery";
import { ContextCollector } from "./context-collector";
import type { WorkspaceEvent, ObservationContext, BriefingContext } from "./types";

const BRIEFING_CACHE_TTL = 1800;

export class Scheduler {
  static async generateMorningBriefing(workspaceId: string, userId?: string): Promise<BriefingContext | null> {
    try {
      const event: WorkspaceEvent = {
        type: "morning",
        workspaceId,
        userId,
        timestamp: new Date(),
        metadata: { briefingType: "morning" },
      };

      const context = await ContextCollector.collect(event);

      const memory = await WorkspaceMemory.retrieve(workspaceId, userId);
      context.memory = memory;

      const patterns = await PatternDetector.detect(context);
      const score = InterventionScorer.score(context, patterns);

      if (score.level === 0 && patterns.length === 0) {
        return this.generateQuietBriefing(workspaceId, context, "morning");
      }

      const insights = patterns.map((p) => p.message);
      const risks = patterns.filter((p) => p.severity === "critical" || p.severity === "high").map((p) => p.message);
      const suggestions = patterns
        .filter((p) => p.confidence > 0.7)
        .slice(0, 3)
        .map((p) => p.suggestedAction);

      const briefing: BriefingContext = {
        type: "morning",
        workspaceId,
        userId,
        date: new Date(),
        summary: this.buildMorningSummary(context),
        keyMetrics: this.buildKeyMetrics(context),
        topInsights: insights.slice(0, 3),
        focusAreas: this.buildFocusAreas(context),
        achievements: this.buildAchievements(context),
        risks: risks.slice(0, 3),
        suggestions: suggestions,
      };

      await this.cacheBriefing(workspaceId, userId, briefing);
      await UIDelivery.deliverBriefing(briefing);

      logger.info("[Scheduler] Morning briefing generated", {
        workspaceId,
        patternCount: patterns.length,
        riskCount: risks.length,
      });

      return briefing;
    } catch (error: any) {
      logger.warn("[Scheduler] Morning briefing error:", error.message);
      return null;
    }
  }

  static async generateEndOfDaySummary(workspaceId: string, userId?: string): Promise<BriefingContext | null> {
    try {
      const event: WorkspaceEvent = {
        type: "evening",
        workspaceId,
        userId,
        timestamp: new Date(),
        metadata: { briefingType: "evening" },
      };

      const context = await ContextCollector.collect(event);
      const patterns = await PatternDetector.detect(context);

      const completedToday = await prisma.task.count({
        where: {
          workspaceId,
          completedAt: { gte: new Date(Date.now() - 86400000) },
        },
      });

      const createdToday = await prisma.task.count({
        where: {
          workspaceId,
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
      });

      const briefing: BriefingContext = {
        type: "evening",
        workspaceId,
        userId,
        date: new Date(),
        summary: this.buildEveningSummary(context, completedToday, createdToday),
        keyMetrics: [
          { label: "Completed today", value: completedToday, trend: completedToday > 0 ? "up" : "stable" },
          { label: "Created today", value: createdToday, trend: createdToday > 5 ? "up" : "stable" },
          { label: "Active tasks", value: context.workspace?.taskCount ?? 0, trend: "stable" },
          { label: "Overdue tasks", value: context.workspace ? await prisma.task.count({ where: { workspaceId, dueDate: { lt: new Date() }, status: { notIn: ["done", "completed", "cancelled"] } } }) : 0, trend: "down" },
        ],
        topInsights: patterns.slice(0, 3).map((p) => p.message),
        focusAreas: [],
        achievements: completedToday > 0 ? [`${completedToday} task(s) completed today`] : [],
        risks: patterns.filter((p) => p.severity === "critical" || p.severity === "high").slice(0, 3).map((p) => p.message),
        suggestions: patterns.filter((p) => p.confidence > 0.7).slice(0, 3).map((p) => p.suggestedAction),
      };

      await UIDelivery.deliverBriefing(briefing);

      logger.info("[Scheduler] End-of-day summary generated", {
        workspaceId,
        completedToday,
        createdToday,
      });

      return briefing;
    } catch (error: any) {
      logger.warn("[Scheduler] End-of-day summary error:", error.message);
      return null;
    }
  }

  static async performHeartbeatScan(workspaceId: string): Promise<void> {
    try {
      const event: WorkspaceEvent = {
        type: "heartbeat",
        workspaceId,
        timestamp: new Date(),
        metadata: { scanType: "periodic" },
      };

      const context = await ContextCollector.collect(event);
      const memory = await WorkspaceMemory.retrieve(workspaceId);
      context.memory = memory;

      const patterns = await PatternDetector.detect(context);
      const score = InterventionScorer.score(context, patterns);

      if (score.level === 0) return;

      const decision = await LLMReasoner.reason(context, patterns, score);

      if (!decision.shouldSpeak) return;

      await UIDelivery.deliver({
        id: crypto.randomUUID(),
        level: decision.level,
        category: decision.category,
        title: patterns[0]?.title || "Workspace observation",
        message: decision.message,
        workspaceId,
        patterns,
        score,
        dismissed: false,
        createdAt: new Date(),
        source: "heartbeat",
        suggestedAction: patterns[0]?.suggestedAction,
      });

      logger.debug("[Scheduler] Heartbeat scan complete", {
        workspaceId,
        level: score.level,
        patterns: patterns.length,
      });
    } catch (error: any) {
      logger.warn("[Scheduler] Heartbeat scan error:", error.message);
    }
  }

  static async getLastBriefingTime(workspaceId: string, type: "morning" | "evening"): Promise<Date | null> {
    const key = `nova:briefing:${workspaceId}:${type}`;
    const cached = await import("@/lib/redis/client").then((r) => r.redis.get<string>(key));
    return cached ? new Date(JSON.parse(cached).timestamp) : null;
  }

  static async shouldGenerateBriefing(workspaceId: string, type: "morning" | "evening"): Promise<boolean> {
    const lastTime = await this.getLastBriefingTime(workspaceId, type);
    if (!lastTime) return true;

    const hoursSinceLastBriefing = (Date.now() - lastTime.getTime()) / 3600000;
    return hoursSinceLastBriefing >= 8;
  }

  private static async cacheBriefing(workspaceId: string, userId: string | undefined, briefing: BriefingContext): Promise<void> {
    const key = `nova:briefing:${workspaceId}:${briefing.type}`;
    const { redis } = await import("@/lib/redis/client");
    await redis.set(key, JSON.stringify({ timestamp: briefing.date.toISOString(), briefing }), { ex: BRIEFING_CACHE_TTL });
  }

  private static buildMorningSummary(context: ObservationContext): string {
    const ws = context.workspace;
    const project = context.project;
    const sprint = context.sprint;

    const parts: string[] = [];

    if (sprint) {
      const completion = sprint.totalTasks > 0 ? Math.round((sprint.completedTasks / sprint.totalTasks) * 100) : 0;
      parts.push(`Sprint "${sprint.name}" is ${completion}% complete with ${sprint.remainingDays} day(s) remaining.`);
    }

    if (project) {
      parts.push(`Project "${project.name}" has ${project.taskCount} tasks (${project.completionRate}% complete, ${project.overdueCount} overdue).`);
    }

    if (ws && ws.overdueCount > 0) {
      parts.push(`${ws.overdueCount} task(s) are overdue across the workspace.`);
    }

    return parts.length > 0 ? parts.join(" ") : `Good morning. ${ws?.name || "Workspace"} has ${ws?.taskCount || 0} active tasks.`;
  }

  private static buildEveningSummary(context: ObservationContext, completedToday: number, createdToday: number): string {
    const ws = context.workspace;
    const parts: string[] = [];

    if (completedToday > 0) {
      parts.push(`${completedToday} task(s) were completed today.`);
    }
    if (createdToday > 0) {
      parts.push(`${createdToday} new task(s) were created.`);
    }
    if (completedToday === 0 && createdToday === 0) {
      parts.push("No task activity recorded today.");
    }

    if (ws) {
      parts.push(`${ws.taskCount} active tasks remain.`);
    }

    return parts.join(" ");
  }

  private static buildKeyMetrics(context: ObservationContext): BriefingContext["keyMetrics"] {
    const metrics: BriefingContext["keyMetrics"] = [];

    if (context.workspace) {
      metrics.push({ label: "Active tasks", value: context.workspace.taskCount, trend: "stable" });
      metrics.push({ label: "Projects", value: context.workspace.projectCount, trend: "stable" });
      metrics.push({ label: "Members", value: context.workspace.memberCount, trend: "stable" });
    }
    if (context.project) {
      metrics.push({ label: "Completion rate", value: `${context.project.completionRate}%`, trend: context.project.completionRate > 50 ? "up" : "down" });
    }
    if (context.sprint) {
      const completion = context.sprint.totalTasks > 0 ? Math.round((context.sprint.completedTasks / context.sprint.totalTasks) * 100) : 0;
      metrics.push({ label: "Sprint progress", value: `${completion}%`, trend: completion > 50 ? "up" : "stable" });
      metrics.push({ label: "Days remaining", value: context.sprint.remainingDays, trend: "down" });
    }

    return metrics.slice(0, 5);
  }

  private static buildFocusAreas(context: ObservationContext): string[] {
    const areas: string[] = [];

    if (context.project && context.project.overdueCount > 0) {
      areas.push(`Resolve ${context.project.overdueCount} overdue task(s) in "${context.project.name}"`);
    }
    if (context.project && context.project.blockedCount > 0) {
      areas.push(`Unblock ${context.project.blockedCount} task(s)`);
    }
    if (context.sprint && context.sprint.isAtRisk) {
      areas.push(`Sprint "${context.sprint.name}" needs attention`);
    }

    return areas.slice(0, 3);
  }

  private static buildAchievements(context: ObservationContext): string[] {
    const achievements: string[] = [];

    if (context.project && context.project.completionRate > 80) {
      achievements.push(`Project "${context.project.name}" is nearly complete (${context.project.completionRate}%)`);
    }
    if (context.sprint && context.sprint.completedTasks > 0 && context.sprint.totalTasks > 0) {
      const completion = Math.round((context.sprint.completedTasks / context.sprint.totalTasks) * 100);
      if (completion > 50) {
        achievements.push(`Sprint "${context.sprint.name}" is ${completion}% complete`);
      }
    }

    return achievements;
  }

  private static async generateQuietBriefing(workspaceId: string, context: ObservationContext, type: "morning" | "evening"): Promise<BriefingContext> {
    return {
      type,
      workspaceId,
      date: new Date(),
      summary: "No significant changes detected. Everything is on track.",
      keyMetrics: this.buildKeyMetrics(context),
      topInsights: [],
      focusAreas: [],
      achievements: this.buildAchievements(context),
      risks: [],
      suggestions: [],
    };
  }
}
