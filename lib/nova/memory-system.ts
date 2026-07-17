import { redis } from "../redis/client";
import { prisma } from "../prisma";
import { logger } from "../logger";
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
  accessCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const SHORT_TERM_TTL = 86400;
const SESSION_KEY_PREFIX = "nova:session:";
const MEMORY_KEY_PREFIX = "nova:memory:";

const NOVA_PRIME_MEMORY_KEYS = {
  PLANNING_STYLE: "nova:planning:style",
  CADENCE: "nova:cadence:sprint",
  CONVENTIONS: "nova:conventions:naming",
  PAST_DECISIONS: "nova:decisions:history",
  WORKING_HOURS: "nova:cadence:hours",
  PREFERRED_RESPONSE_LENGTH: "nova:user:response-length",
  TEAM_PREFERENCES: "nova:team:preferences",
};

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    });
    return response.data[0].embedding;
  } catch (error) {
    logger.warn("[MemorySystem] Embedding generation failed:", error);
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function calculateConfidence(
  createdAt: Date,
  updatedAt: Date,
  accessCount: number,
): number {
  const now = new Date();
  const ageMs = now.getTime() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  const recencyMs = now.getTime() - updatedAt.getTime();
  const recencyDays = recencyMs / (1000 * 60 * 60 * 24);

  const ageFactor = Math.max(0.2, 1 - ageDays / 365);
  const recencyFactor = Math.max(0.3, 1 - recencyDays / 90);
  const frequencyFactor = Math.min(1, 0.5 + accessCount * 0.1);

  return Math.round((ageFactor * 0.3 + recencyFactor * 0.5 + frequencyFactor * 0.2) * 100) / 100;
}

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
    const scopedKey = `${workspaceId}:${key}`;

    const embedding = await generateEmbedding(trimmedContent);
    const embeddingJson = embedding ? JSON.stringify(embedding) : null;

    try {
      await prisma.aiMemory.upsert({
        where: { userId_key: { userId, key: scopedKey } },
        create: { userId, workspaceId, key: scopedKey, content: trimmedContent, embedding: embeddingJson },
        update: { content: trimmedContent, workspaceId, embedding: embeddingJson },
      });
    } catch (error) {
      logger.warn("[MemorySystem] Database long-term memory save failed:", error);
    }
  }

  public static async getLongTerm(userId: string, workspaceId: string, maxMemories: number = 50): Promise<Record<string, string>> {
    const memories: Record<string, string> = {};

    try {
      const where: { userId: string; workspaceId: string } = { userId, workspaceId };
      const records = await prisma.aiMemory.findMany({ where, take: maxMemories, orderBy: { updatedAt: "desc" } });
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

  public static async searchLongTerm(
    userId: string,
    workspaceId: string,
    query: string,
    maxResults: number = 10,
    minSimilarity: number = 0.3,
  ): Promise<MemoryInsight[]> {
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      return this.getMemoryInsights(userId, workspaceId);
    }

    try {
      const where: { userId: string; workspaceId: string } = { userId, workspaceId };
      const records = await prisma.aiMemory.findMany({ where, take: 200 });

      const scored = records
        .filter((r) => r.embedding)
        .map((r) => {
          const embedding = JSON.parse(r.embedding!) as number[];
          const similarity = cosineSimilarity(queryEmbedding, embedding);
          const prefix = `${workspaceId}:`;
          const originalKey = r.key.startsWith(prefix) ? r.key.slice(prefix.length) : r.key;
          return {
            type: this.inferMemoryType(originalKey),
            key: originalKey,
            content: r.content,
            confidence: calculateConfidence(r.createdAt, r.updatedAt, 0),
            similarity,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          };
        })
        .filter((r) => r.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);

      return scored;
    } catch (error) {
      logger.warn("[MemorySystem] Semantic search failed, falling back:", error);
      return this.getMemoryInsights(userId, workspaceId);
    }
  }

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

  public static async getNovaPrimeMemory(
    userId: string,
    workspaceId: string,
    type: "PLANNING_STYLE" | "CADENCE" | "CONVENTIONS" | "PAST_DECISIONS"
  ): Promise<string | null> {
    const memories = await this.getLongTerm(userId, workspaceId);
    const key = NOVA_PRIME_MEMORY_KEYS[type];
    return memories[key] || null;
  }

  public static async getMemoryInsights(
    userId: string,
    workspaceId: string
  ): Promise<MemoryInsight[]> {
    const insights: MemoryInsight[] = [];

    try {
      const where: { userId: string; workspaceId: string } = { userId, workspaceId };
      const records = await prisma.aiMemory.findMany({ where, take: 20, orderBy: { updatedAt: "desc" } });
      const prefix = `${workspaceId}:`;

      for (const rec of records) {
        const originalKey = rec.key.startsWith(prefix) ? rec.key.slice(prefix.length) : rec.key;
        const type = this.inferMemoryType(originalKey);
        insights.push({
          type,
          key: originalKey,
          content: rec.content,
          confidence: calculateConfidence(rec.createdAt, rec.updatedAt, 0),
          accessCount: 0,
          createdAt: rec.createdAt,
          updatedAt: rec.updatedAt,
        });
      }
    } catch (error) {
      logger.warn("[MemorySystem] Error fetching memory insights:", error);
    }

    return insights;
  }

  private static inferMemoryType(key: string): MemoryType {
    if (key.includes("planning")) return "PLANNING_STYLE" as MemoryType;
    if (key.includes("cadence")) return "CADENCE" as MemoryType;
    if (key.includes("conventions")) return "CONVENTIONS" as MemoryType;
    if (key.includes("decisions")) return "PAST_DECISIONS" as MemoryType;
    return "USER" as MemoryType;
  }

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

    const trimmed = history.slice(-50);
    await this.saveNovaPrimeMemory(userId, workspaceId, "PAST_DECISIONS", JSON.stringify(trimmed));
  }

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

  public static async consolidateMemories(
    userId: string,
    workspaceId: string,
  ): Promise<{ merged: number; pruned: number }> {
    let merged = 0;
    let pruned = 0;

    try {
      const where: { userId: string; workspaceId: string } = { userId, workspaceId };
      const records = await prisma.aiMemory.findMany({ where, orderBy: { updatedAt: "desc" } });

      const prefix = `${workspaceId}:`;
      const byKey = new Map<string, typeof records>();
      for (const rec of records) {
        const originalKey = rec.key.startsWith(prefix) ? rec.key.slice(prefix.length) : rec.key;
        const existing = byKey.get(originalKey) || [];
        existing.push(rec);
        byKey.set(originalKey, existing);
      }

      for (const [key, entries] of byKey) {
        if (entries.length <= 1) continue;

        const latest = entries[0];
        const stale = entries.slice(1);

        for (const staleEntry of stale) {
          if (latest.embedding && staleEntry.embedding) {
            const sim = cosineSimilarity(
              JSON.parse(latest.embedding),
              JSON.parse(staleEntry.embedding),
            );
            if (sim > 0.9) {
              await prisma.aiMemory.delete({ where: { id: staleEntry.id } });
              pruned++;
              continue;
            }
          }

          if (!latest.embedding && !staleEntry.embedding) {
            if (latest.content === staleEntry.content) {
              await prisma.aiMemory.delete({ where: { id: staleEntry.id } });
              pruned++;
            }
          }
        }
      }
    } catch (error) {
      logger.warn("[MemorySystem] Consolidation failed:", error);
    }

    logger.info("[MemorySystem] Consolidation complete", { merged, pruned });
    return { merged, pruned };
  }

  public static getMemoryRules() {
    return { tiers: MEMORY_TIERS, types: MEMORY_TYPES, rules: MEMORY_RULES, userControls: MEMORY_USER_CONTROLS };
  }
}
