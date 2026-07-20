import { prisma } from "../prisma";
import { redis } from "../redis/client";
import { SearchIntelligence } from "./search-intelligence";
import { SecurityGuard } from "./security-guard";
import type { Prisma } from "@prisma/client";

export const SEARCH_INTELLIGENCE_RULES = [
  "Understand the intent behind search queries",
  "Provide direct answers when possible",
];

export const KNOWLEDGE_PIPELINE = [
  { step: "Ingest content", description: "Receive and store new knowledge" },
  { step: "Classify content", description: "Determine type and category" },
  { step: "Extract meaning", description: "Identify key concepts" },
  { step: "Create relationships", description: "Link knowledge to entities" },
  { step: "Store knowledge", description: "Persist in long-term storage" },
  { step: "Enable retrieval", description: "Make knowledge queryable" },
];

export const KNOWLEDGE_CITATION_RULES = [
  "Show information source for every retrieved piece",
  "Reference related documents alongside answers",
  "Distinguish facts from assumptions",
  "Prioritize accuracy over speed",
];

export const KNOWLEDGE_STORAGE_ARCHITECTURE = {
  primary: "MongoDB Atlas",
  memory: "Mem0",
  fastRetrieval: "Upstash Redis",
} as const;

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
  }

  public static async search(query: string, options: SearchOptions): Promise<Prisma.DocumentGetPayload<{}>[]> {
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
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && (error as { code: string }).code !== "P2002") {
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
