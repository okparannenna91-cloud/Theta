import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentChunk: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: new Array(1536).fill(0.1) }],
        }),
      },
    })),
  };
});

import { RAGPipeline } from "@/lib/nova/rag-pipeline";

describe("RAGPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("indexDocument", () => {
    it("returns a number for indexDocument call", async () => {
      const result = await RAGPipeline.indexDocument("doc1", "ws1", "Test", "Hello world");
      expect(typeof result).toBe("number");
    });
  });

  describe("removeDocument", () => {
    it("calls deleteMany with documentId", async () => {
      const { prisma } = await import("@/lib/prisma");
      await RAGPipeline.removeDocument("doc1");
      expect(prisma.documentChunk.deleteMany).toHaveBeenCalledWith({
        where: { documentId: "doc1" },
      });
    });
  });

  describe("search", () => {
    it("returns empty array when no chunks", async () => {
      const results = await RAGPipeline.search("ws1", "query");
      expect(results).toEqual([]);
    });
  });

  describe("getContextForQuery", () => {
    it("returns empty string when no results", async () => {
      const context = await RAGPipeline.getContextForQuery("ws1", "query");
      expect(context).toBe("");
    });
  });
});
