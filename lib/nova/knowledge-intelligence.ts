import { prisma } from "../prisma";
import { redis } from "../redis/client";
import { SecurityGuard } from "./security-guard";
import { SearchIntelligence } from "./search-intelligence";
import { KNOWLEDGE_PIPELINE, KNOWLEDGE_CITATION_RULES, KNOWLEDGE_STORAGE_ARCHITECTURE } from "./constitution/knowledge-standards";

export { KNOWLEDGE_PIPELINE, KNOWLEDGE_CITATION_RULES, KNOWLEDGE_STORAGE_ARCHITECTURE } from "./constitution/knowledge-standards";

export interface KnowledgeMeta {
  workspaceId: string;
  userId?: string;
  title: string;
  tags?: string[];
  source?: string;
}

export interface SearchOptions {
  workspaceId: string;
  domain?: string;
  type?: string;
  limit?: number;
}

export class KnowledgeIntelligence {
  public static async ingest(content: string, meta: KnowledgeMeta): Promise<void> {
    const { workspaceId, userId, title, tags, source } = meta;

    if (userId) {
      await SecurityGuard.validate({ userId, workspaceId, action: "write", resourceType: "document" });
    }

    

    const doc = await prisma.document.create({
      data: {
        userId: userId ?? "",
        title,
        content,
        workspaceId,
        tags: tags ?? [],
      },
    });

    try {
      await redis.set(`knowledge:${doc.id}`, JSON.stringify({ title, content, source: source || "manual" }));
    } catch {
      // cache write failure is non-fatal
    }

    if (process.env.MEM0_API_KEY) {
      try {
        const { mem0 } = await import("../mem0");
        await mem0.add([{ role: "user", content }], {
          userId: userId,
          metadata: { workspaceId, docId: doc.id, title },
        });
      } catch (error) {
        console.warn("[KnowledgeIntelligence] Mem0 sync failed:", error);
      }
    }
  }

  public static async search(query: string, options: SearchOptions): Promise<any[]> {
    const scope = SearchIntelligence.parseQuery(query);


    const results = await prisma.document.findMany({
      where: {
        workspaceId: options.workspaceId,
        OR: [
          { content: { contains: query } },
          { title: { contains: query } },
          ...(scope.domain !== "GLOBAL" ? [{ tags: { has: scope.domain.toLowerCase() } }] : []),
        ],
      },
      take: options.limit || 20,
    });

    return results;
  }

  public static async linkEntities(
    workspaceId: string,
    sourceId: string,
    targetIds: string[],
    relation: string
  ): Promise<void> {
    
    // TENANT ISOLATION: Verify source and target entities belong to this workspace
    const [sourceDoc] = await Promise.all([
      prisma.document.findFirst({ where: { id: sourceId, workspaceId }, select: { id: true } }),
      ...targetIds.map(id => prisma.document.findFirst({ where: { id, workspaceId }, select: { id: true } })),
    ]);
    if (!sourceDoc) {
      throw new Error("Entity link failed: source entity not found in this workspace");
    }

    for (const targetId of targetIds) {
      try {
        await prisma.entityLink.create({
          data: { sourceId, targetId, relation },
        });
      } catch (error: any) {
        if (error?.code !== "P2002") {
          throw error;
        }
      }
    }
  }

  public static getPipeline() {
    return KNOWLEDGE_PIPELINE;
  }

  public static getCitationRules() {
    return KNOWLEDGE_CITATION_RULES;
  }

  public static getArchitecture() {
    return KNOWLEDGE_STORAGE_ARCHITECTURE;
  }
}
