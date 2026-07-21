import { logger } from "@/lib/logger";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 64;
const MAX_RESULTS = 5;
const MIN_SIMILARITY = 0.3;

export interface DocumentChunk {
  id: string;
  documentId: string;
  workspaceId: string;
  content: string;
  embedding: number[];
  metadata: {
    title: string;
    type: string;
    chunkIndex: number;
    totalChunks: number;
    createdAt: Date;
  };
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    });
    return response.data[0].embedding;
  } catch (error) {
    logger.warn("[RAG] Embedding generation failed:", error);
    return null;
  }
}

async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.map(t => t.slice(0, 8000)),
    });
    return response.data.map(d => d.embedding);
  } catch (error) {
    logger.warn("[RAG] Batch embedding generation failed:", error);
    return texts.map(() => null);
  }
}

function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    start = end - overlap;
    if (start >= words.length - overlap) break;
  }

  return chunks.length > 0 ? chunks : [text];
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

export class RAGPipeline {
  static async indexDocument(
    documentId: string,
    workspaceId: string,
    title: string,
    content: string,
    type: string = "document"
  ): Promise<number> {
    const chunks = chunkText(content);
    if (chunks.length === 0) return 0;

    const embeddings = await generateEmbeddings(chunks);
    const { prisma } = await import("@/lib/prisma");

    let indexed = 0;
    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings[i];
      if (!embedding) continue;

      try {
        await prisma.documentChunk.upsert({
          where: { id: `${documentId}-chunk-${i}` },
          create: {
            id: `${documentId}-chunk-${i}`,
            documentId,
            workspaceId,
            content: chunks[i],
            embedding: JSON.stringify(embedding),
            chunkIndex: i,
            totalChunks: chunks.length,
            title,
            type,
          },
          update: {
            content: chunks[i],
            embedding: JSON.stringify(embedding),
            totalChunks: chunks.length,
          },
        });
        indexed++;
      } catch (error) {
        logger.warn("[RAG] Failed to index chunk:", error);
      }
    }

    logger.info("[RAG] Indexed document", { documentId, title, chunks: indexed });
    return indexed;
  }

  static async removeDocument(documentId: string): Promise<void> {
    const { prisma } = await import("@/lib/prisma");
    await prisma.documentChunk.deleteMany({ where: { documentId } });
  }

  static async search(
    workspaceId: string,
    query: string,
    options: { maxResults?: number; type?: string; projectId?: string; accessibleProjectIds?: string[] } = {}
  ): Promise<SearchResult[]> {
    const { maxResults = MAX_RESULTS, type, projectId, accessibleProjectIds } = options;

    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) return [];

    const { prisma } = await import("@/lib/prisma");
    const where: any = { workspaceId };
    if (type) where.type = type;

    const chunks = await prisma.documentChunk.findMany({
      where,
      take: 200,
    });

    let filteredChunks = chunks;
    if (projectId) {
      const docIds = await prisma.document.findMany({
        where: { workspaceId, projectId },
        select: { id: true },
      }).then(docs => docs.map(d => d.id));
      filteredChunks = chunks.filter(c => docIds.includes(c.documentId));
    } else if (accessibleProjectIds?.length) {
      const docIds = await prisma.document.findMany({
        where: {
          workspaceId,
          OR: [
            { projectId: null },
            { projectId: { in: accessibleProjectIds } },
          ],
        },
        select: { id: true },
      }).then(docs => docs.map(d => d.id));
      filteredChunks = chunks.filter(c => docIds.includes(c.documentId));
    }

    const scored = filteredChunks
      .map(chunk => {
        const embedding = JSON.parse(chunk.embedding) as number[];
        const score = cosineSimilarity(queryEmbedding, embedding);
        return {
          chunk: {
            id: chunk.id,
            documentId: chunk.documentId,
            workspaceId: chunk.workspaceId,
            content: chunk.content,
            embedding: [],
            metadata: {
              title: chunk.title,
              type: chunk.type,
              chunkIndex: chunk.chunkIndex,
              totalChunks: chunk.totalChunks,
              createdAt: chunk.createdAt,
            },
          },
          score,
        };
      })
      .filter(r => r.score >= MIN_SIMILARITY)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    logger.info("[RAG] Search completed", { query: query.substring(0, 50), results: scored.length });
    return scored;
  }

  static async getContextForQuery(
    workspaceId: string,
    query: string,
    maxTokens: number = 2000
  ): Promise<string> {
    const results = await this.search(workspaceId, query, { maxResults: MAX_RESULTS });
    if (results.length === 0) return "";

    const contextParts: string[] = [];
    let tokenCount = 0;

    for (const result of results) {
      const estimatedTokens = Math.ceil(result.chunk.content.length / 4);
      if (tokenCount + estimatedTokens > maxTokens) break;

      contextParts.push(
        `[${result.chunk.metadata.title}] (relevance: ${Math.round(result.score * 100)}%)\n${result.chunk.content}`
      );
      tokenCount += estimatedTokens;
    }

    return contextParts.join("\n\n---\n\n");
  }
}
