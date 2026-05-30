import { redis } from "../redis/client";
import { getPrismaClient } from "../prisma";
import { MEMORY_TIERS, MEMORY_TYPES, MEMORY_RULES, MEMORY_USER_CONTROLS, type MemoryType, type MemoryTier } from "./constitution/memory";

export { type MemoryType, type MemoryTier } from "./constitution/memory";
export { MEMORY_TIERS, MEMORY_TYPES, MEMORY_RULES, MEMORY_USER_CONTROLS } from "./constitution/memory";

export interface MemoryPayload {
  userId: string;
  workspaceId?: string;
  key: string;
  content: string;
  type?: MemoryType;
}

const SHORT_TERM_TTL = 86400;
const SESSION_KEY_PREFIX = "nova:session:";
const MEMORY_KEY_PREFIX = "nova:memory:";

export class MemorySystem {
  public static async saveShortTerm(sessionId: string, message: { role: string; content: string }): Promise<void> {
    try {
      const key = `${SESSION_KEY_PREFIX}${sessionId}:history`;
      await redis.rpush(key, JSON.stringify({ ...message, timestamp: new Date().toISOString() }));
      await redis.expire(key, SHORT_TERM_TTL);
    } catch (error) {
      console.warn("[MemorySystem] Error saving short-term memory:", error);
    }
  }

  public static async getShortTerm(sessionId: string, limit: number = 20): Promise<Array<{ role: string; content: string }>> {
    try {
      const key = `${SESSION_KEY_PREFIX}${sessionId}:history`;
      const items = await redis.lrange(key, -limit, -1);
      return items.map((item: any) => {
        const parsed = typeof item === "string" ? JSON.parse(item) : item;
        return { role: parsed.role, content: parsed.content };
      });
    } catch (error) {
      console.warn("[MemorySystem] Error retrieving short-term memory:", error);
      return [];
    }
  }

  public static async saveLongTerm(payload: MemoryPayload): Promise<void> {
    const { userId, workspaceId, key, content } = payload;

    try {
      const db = getPrismaClient(workspaceId);
      await db.aiMemory.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, workspaceId, key, content },
        update: { content, workspaceId },
      });
    } catch (error) {
      console.warn("[MemorySystem] Database long-term memory save failed:", error);
    }

    if (process.env.MEM0_API_KEY) {
      try {
        const { mem0 } = await import("../mem0");
        await mem0.add([{ role: "user", content }], {
          userId,
          metadata: { workspaceId, key },
        });
      } catch (error) {
        console.warn("[MemorySystem] Mem0 synchronization failed:", error);
      }
    }
  }

  public static async getLongTerm(userId: string, workspaceId?: string): Promise<Record<string, string>> {
    const memories: Record<string, string> = {};

    try {
      const db = getPrismaClient(workspaceId);
      const records = await db.aiMemory.findMany({ where: { userId } });
      for (const rec of records) {
        memories[rec.key] = rec.content;
      }
    } catch (error) {
      console.warn("[MemorySystem] Error fetching long-term memories from DB:", error);
    }

    return memories;
  }

  public static getMemoryRules() {
    return { tiers: MEMORY_TIERS, types: MEMORY_TYPES, rules: MEMORY_RULES, userControls: MEMORY_USER_CONTROLS };
  }
}
