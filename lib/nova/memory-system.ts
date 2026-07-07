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

const SHORT_TERM_TTL = 86400;
const SESSION_KEY_PREFIX = "nova:session:";
const MEMORY_KEY_PREFIX = "nova:memory:";

export class MemorySystem {
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

  public static getMemoryRules() {
    return { tiers: MEMORY_TIERS, types: MEMORY_TYPES, rules: MEMORY_RULES, userControls: MEMORY_USER_CONTROLS };
  }
}
