import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis/client";
import { logger } from "@/lib/logger";
import type { ObservationContext } from "./types";

const CACHE_PREFIX = "nova:ambient:memory:";
const CACHE_TTL = 3600;
const MAX_DECISIONS = 20;
const MAX_PATTERNS = 15;
const MAX_HISTORY = 50;
const MAX_SITUATIONS = 10;

interface CachedMemory {
  recentDecisions: Array<{ topic: string; decision: string; timestamp: Date }>;
  userPreferences: Record<string, string>;
  workspacePatterns: Array<{ pattern: string; confidence: number; occurrences: number }>;
  recurringIssues: Array<{ issue: string; frequency: string; lastOccurrence: Date }>;
  userHistory: Array<{ action: string; entityType: string; timestamp: Date }>;
  similarPastSituations: Array<{ situation: string; outcome: string; timestamp: Date }>;
}

export class WorkspaceMemory {
  static async retrieve(workspaceId: string, userId?: string): Promise<ObservationContext["memory"]> {
    try {
      const cacheKey = `${CACHE_PREFIX}${workspaceId}${userId ? `:${userId}` : ""}`;
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const [decisions, preferences, patterns, issues, history, situations] = await Promise.all([
        this.getRecentDecisions(workspaceId),
        userId ? this.getUserPreferences(userId, workspaceId) : Promise.resolve({}),
        this.getWorkspacePatterns(workspaceId),
        this.getRecurringIssues(workspaceId),
        userId ? this.getUserHistory(userId, workspaceId) : Promise.resolve([]),
        this.getSimilarPastSituations(workspaceId),
      ]);

      const memory: ObservationContext["memory"] = {
        recentDecisions: decisions,
        userPreferences: preferences,
        workspacePatterns: patterns,
        recurringIssues: issues,
        userHistory: history,
        similarPastSituations: situations,
      };

      await redis.set(cacheKey, JSON.stringify(memory), { ex: CACHE_TTL });

      return memory;
    } catch (error: any) {
      logger.warn("[WorkspaceMemory] Retrieval error:", error.message);
      return undefined;
    }
  }

  static async recordDecision(workspaceId: string, topic: string, decision: string, userId?: string): Promise<void> {
    try {
      await prisma.agentAction.create({
        data: {
          agentId: "nova-ambient",
          workspaceId,
          action: "decision_recorded",
          targetType: "workspace",
          targetId: workspaceId,
          summary: decision,
          metadata: { topic, recordedAt: new Date().toISOString(), userId },
        },
      });

      const cacheKey = `${CACHE_PREFIX}${workspaceId}`;
      await redis.del(cacheKey);
    } catch (error: any) {
      logger.warn("[WorkspaceMemory] Record decision error:", error.message);
    }
  }

  static async recordPattern(workspaceId: string, pattern: string, confidence: number): Promise<void> {
    try {
      const key = `nova:pattern:${workspaceId}:${pattern.replace(/\s+/g, "_").toLowerCase()}`;
      const existing = await redis.get<string>(key);
      const occurrences = existing ? (JSON.parse(existing).occurrences || 0) + 1 : 1;
      await redis.set(key, JSON.stringify({ pattern, occurrences, confidence, lastSeen: new Date().toISOString() }), { ex: 86400 * 30 });

      const cacheKey = `${CACHE_PREFIX}${workspaceId}`;
      await redis.del(cacheKey);
    } catch {
    }
  }

  static async recordUserActivity(userId: string, workspaceId: string, action: string, entityType: string): Promise<void> {
    try {
      const key = `nova:history:${userId}:${workspaceId}`;
      const history = await redis.get<string>(key);
      const entries: Array<{ action: string; entityType: string; timestamp: Date }> = history ? JSON.parse(history) : [];
      entries.unshift({ action, entityType, timestamp: new Date() });
      if (entries.length > MAX_HISTORY) entries.length = MAX_HISTORY;
      await redis.set(key, JSON.stringify(entries), { ex: 86400 * 7 });

      const cacheKey = `${CACHE_PREFIX}${workspaceId}:${userId}`;
      await redis.del(cacheKey);
    } catch {
    }
  }

  static async clearCache(workspaceId: string, userId?: string): Promise<void> {
    const pattern = `${CACHE_PREFIX}${workspaceId}${userId ? `:${userId}` : ":*"}`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  private static async getRecentDecisions(workspaceId: string): Promise<Array<{ topic: string; decision: string; timestamp: Date }>> {
    const actions = await prisma.agentAction.findMany({
      where: { workspaceId, agentId: "nova-ambient", action: "decision_recorded" },
      orderBy: { createdAt: "desc" },
      take: MAX_DECISIONS,
      select: { summary: true, metadata: true, createdAt: true },
    });

    return actions.map((a) => ({
      topic: (a.metadata as any)?.topic || "Unknown",
      decision: a.summary,
      timestamp: a.createdAt,
    }));
  }

  private static async getUserPreferences(userId: string, workspaceId: string): Promise<Record<string, string>> {
    const memories = await prisma.aiMemory.findMany({
      where: { userId, workspaceId },
      select: { key: true, content: true },
      take: 50,
    });

    const prefs: Record<string, string> = {};
    for (const m of memories) {
      prefs[m.key] = m.content;
    }
    return prefs;
  }

  private static async getWorkspacePatterns(workspaceId: string): Promise<Array<{ pattern: string; confidence: number; occurrences: number }>> {
    const keys = await redis.keys(`nova:pattern:${workspaceId}:*`);
    const patterns: Array<{ pattern: string; confidence: number; occurrences: number }> = [];

    for (const key of keys) {
      const data = await redis.get<string>(key);
      if (data) {
        const parsed = JSON.parse(data);
        patterns.push({
          pattern: parsed.pattern,
          confidence: parsed.confidence || 0.5,
          occurrences: parsed.occurrences || 1,
        });
      }
    }

    return patterns.sort((a, b) => b.occurrences - a.occurrences).slice(0, MAX_PATTERNS);
  }

  private static async getRecurringIssues(workspaceId: string): Promise<Array<{ issue: string; frequency: string; lastOccurrence: Date }>> {
    const recentInsights = await prisma.proactiveInsight.findMany({
      where: { workspaceId, severity: { in: ["high", "critical"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { type: true, title: true, createdAt: true },
    });

    const issueCounts = new Map<string, { count: number; lastSeen: Date }>();
    for (const insight of recentInsights) {
      const key = insight.type;
      const existing = issueCounts.get(key) || { count: 0, lastSeen: insight.createdAt };
      existing.count++;
      if (insight.createdAt > existing.lastSeen) existing.lastSeen = insight.createdAt;
      issueCounts.set(key, existing);
    }

    return Array.from(issueCounts.entries())
      .filter(([, v]) => v.count > 1)
      .map(([issue, data]) => ({
        issue,
        frequency: data.count > 5 ? "daily" : data.count > 2 ? "weekly" : "occasional",
        lastOccurrence: data.lastSeen,
      }));
  }

  private static async getUserHistory(userId: string, workspaceId: string): Promise<Array<{ action: string; entityType: string; timestamp: Date }>> {
    const activities = await prisma.activity.findMany({
      where: { userId, workspaceId },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY,
      select: { action: true, entityType: true, createdAt: true },
    });

    return activities.map((a) => ({
      action: a.action,
      entityType: a.entityType,
      timestamp: a.createdAt,
    }));
  }

  private static async getSimilarPastSituations(workspaceId: string): Promise<Array<{ situation: string; outcome: string; timestamp: Date }>> {
    const criticalInsights = await prisma.proactiveInsight.findMany({
      where: { workspaceId, severity: "critical" },
      orderBy: { createdAt: "desc" },
      take: MAX_SITUATIONS,
      select: { title: true, message: true, suggestedAction: true, createdAt: true },
    });

    return criticalInsights.map((i) => ({
      situation: i.title,
      outcome: i.suggestedAction || "No action recorded",
      timestamp: i.createdAt,
    }));
  }
}
