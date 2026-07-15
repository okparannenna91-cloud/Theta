import { redis } from "../redis/client";
import { prisma } from "../prisma";
import { logger } from "../logger";
import { mem0 } from "../mem0";
import { MEMORY_TIERS, MEMORY_TYPES, MEMORY_RULES, MEMORY_USER_CONTROLS, type MemoryType, type MemoryTier } from "./constitution/memory";

export { type MemoryType, type MemoryTier } from "./constitution/memory";
export { MEMORY_TIERS, MEMORY_TYPES, MEMORY_RULES, MEMORY_USER_CONTROLS } from "./constitution/memory";

export interface MemoryPayload {
  userId: string;
  workspaceId: string;
  key: string;
  content: string;
  type?: MemoryType;
}

export interface MemoryInsight {
  type: MemoryType;
  key: string;
  content: string;
  confidence: number;
}

const SHORT_TERM_TTL = 86400;
const SESSION_KEY_PREFIX = "nova:session:";
const MEMORY_KEY_PREFIX = "nova:memory:";

// Nova Prime memory categories
const NOVA_PRIME_MEMORY_KEYS = {
  PLANNING_STYLE: "nova:planning:style",
  CADENCE: "nova:cadence:sprint",
  CONVENTIONS: "nova:conventions:naming",
  PAST_DECISIONS: "nova:decisions:history",
  WORKING_HOURS: "nova:cadence:hours",
  PREFERRED_RESPONSE_LENGTH: "nova:user:response-length",
  TEAM_PREFERENCES: "nova:team:preferences",
};

export class MemorySystem {
  /**
   * Save short-term memory (session context)
   */
  public static async saveShortTerm(workspaceId: string, sessionId: string, message: { role: string; content: string }): Promise<void> {
    try {
      const key = `${SESSION_KEY_PREFIX}${workspaceId}:${sessionId}:history`;
      await redis.rpush(key, JSON.stringify({ ...message, timestamp: new Date().toISOString() }));
      await redis.ltrim(key, -200, -1);
      await redis.expire(key, SHORT_TERM_TTL);
    } catch (error) {
      logger.warn("[MemorySystem] Error saving short-term memory:", error);
    }
  }

  /**
   * Get short-term memory (session context)
   */
  public static async getShortTerm(workspaceId: string, sessionId: string, limit: number = 20): Promise<Array<{ role: string; content: string }>> {
    try {
      const key = `${SESSION_KEY_PREFIX}${workspaceId}:${sessionId}:history`;
      const items = await redis.lrange(key, -limit, -1);
      return items.map((item: string | { role: string; content: string }) => {
        const parsed = typeof item === "string" ? JSON.parse(item) : item;
        return { role: parsed.role, content: parsed.content };
      });
    } catch (error) {
      logger.warn("[MemorySystem] Error retrieving short-term memory:", error);
      return [];
    }
  }

  /**
   * Save long-term memory (persistent preferences and patterns)
   */
  public static async saveLongTerm(payload: MemoryPayload): Promise<void> {
    const { userId, workspaceId, key, content } = payload;
    const trimmedContent = content.slice(0, 10000);
    // TENANT ISOLATION: Scope memory key with workspaceId to prevent cross-workspace collision
    const scopedKey = `${workspaceId}:${key}`;

    try {
      
      await prisma.aiMemory.upsert({
        where: { userId_key: { userId, key: scopedKey } },
        create: { userId, workspaceId, key: scopedKey, content: trimmedContent },
        update: { content: trimmedContent, workspaceId },
      });
    } catch (error) {
      logger.warn("[MemorySystem] Database long-term memory save failed:", error);
    }

    if (process.env.MEM0_API_KEY) {
      try {
        await mem0.add([{ role: "user", content: trimmedContent }], {
          userId,
          metadata: { workspaceId, key },
        });
      } catch (error) {
        logger.warn("[MemorySystem] Mem0 synchronization failed:", error);
      }
    }
  }

  /**
   * Get long-term memory (persistent preferences and patterns)
   */
  public static async getLongTerm(userId: string, workspaceId: string, maxMemories: number = 50): Promise<Record<string, string>> {
    const memories: Record<string, string> = {};

    try {
      
      const where: { userId: string; workspaceId: string } = { userId, workspaceId };
      const records = await prisma.aiMemory.findMany({ where, take: maxMemories, orderBy: { updatedAt: "desc" } });
      // Strip the workspaceId prefix from returned keys for clean API
      const prefix = `${workspaceId}:`;
      for (const rec of records) {
        const originalKey = rec.key.startsWith(prefix) ? rec.key.slice(prefix.length) : rec.key;
        memories[originalKey] = rec.content;
      }
    } catch (error) {
      logger.warn("[MemorySystem] Error fetching long-term memories from DB:", error);
    }

    return memories;
  }

  /**
   * Save Nova Prime specific memory (planning style, cadence, conventions)
   */
  public static async saveNovaPrimeMemory(
    userId: string,
    workspaceId: string,
    type: "PLANNING_STYLE" | "CADENCE" | "CONVENTIONS" | "PAST_DECISIONS",
    content: string
  ): Promise<void> {
    const key = NOVA_PRIME_MEMORY_KEYS[type];
    await this.saveLongTerm({
      userId,
      workspaceId,
      key,
      content,
      type: type as MemoryType,
    });
  }

  /**
   * Get Nova Prime specific memory
   */
  public static async getNovaPrimeMemory(
    userId: string,
    workspaceId: string,
    type: "PLANNING_STYLE" | "CADENCE" | "CONVENTIONS" | "PAST_DECISIONS"
  ): Promise<string | null> {
    const memories = await this.getLongTerm(userId, workspaceId);
    const key = NOVA_PRIME_MEMORY_KEYS[type];
    return memories[key] || null;
  }

  /**
   * Get memory insights for current context
   */
  public static async getMemoryInsights(
    userId: string,
    workspaceId: string
  ): Promise<MemoryInsight[]> {
    const insights: MemoryInsight[] = [];
    const memories = await this.getLongTerm(userId, workspaceId, 20);

    for (const [key, content] of Object.entries(memories)) {
      // Determine memory type from key
      let type: MemoryType = "USER";
      if (key.includes("planning")) type = "PLANNING_STYLE" as MemoryType;
      else if (key.includes("cadence")) type = "CADENCE" as MemoryType;
      else if (key.includes("conventions")) type = "CONVENTIONS" as MemoryType;
      else if (key.includes("decisions")) type = "PAST_DECISIONS" as MemoryType;

      insights.push({
        type,
        key,
        content,
        confidence: 0.8,
      });
    }

    return insights;
  }

  /**
   * Record a past decision for future reference
   */
  public static async recordDecision(
    userId: string,
    workspaceId: string,
    decision: string,
    rationale: string
  ): Promise<void> {
    const existing = await this.getNovaPrimeMemory(userId, workspaceId, "PAST_DECISIONS");
    const history = existing ? JSON.parse(existing) : [];
    
    history.push({
      date: new Date().toISOString(),
      decision,
      rationale,
    });

    // Keep last 50 decisions
    const trimmed = history.slice(-50);
    await this.saveNovaPrimeMemory(userId, workspaceId, "PAST_DECISIONS", JSON.stringify(trimmed));
  }

  /**
   * Get past decisions
   */
  public static async getPastDecisions(
    userId: string,
    workspaceId: string,
    limit: number = 10
  ): Promise<Array<{ date: string; decision: string; rationale: string }>> {
    const existing = await this.getNovaPrimeMemory(userId, workspaceId, "PAST_DECISIONS");
    if (!existing) return [];
    
    const history = JSON.parse(existing);
    return history.slice(-limit);
  }

  public static getMemoryRules() {
    return { tiers: MEMORY_TIERS, types: MEMORY_TYPES, rules: MEMORY_RULES, userControls: MEMORY_USER_CONTROLS };
  }
}
