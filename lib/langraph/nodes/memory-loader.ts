import { logger } from "@/lib/logger";

export interface LoadedMemory {
  longTerm: Array<{ key: string; value: string }>;
  shortTerm: Array<{ role: string; content: string }>;
  semanticMatches: Array<{ key: string; content: string; similarity: number }>;
}

export async function loadMemory(
  userId: string, workspaceId: string, conversationId?: string, depth: "lightweight" | "full" = "lightweight",
  userPrompt?: string,
): Promise<LoadedMemory> {
  const result: LoadedMemory = { longTerm: [], shortTerm: [], semanticMatches: [] };
  try {
    if (depth === "full") {
      const { MemorySystem } = await import("@/lib/nova/memory-system");
      const memories = await MemorySystem.getLongTerm(userId, workspaceId);
      result.longTerm = Object.entries(memories).map(([k, v]) => ({ key: k, value: String(v) }));

      // Semantic search for relevant memories based on user prompt
      if (userPrompt) {
        const semanticResults = await MemorySystem.searchLongTerm(userId, workspaceId, userPrompt, 5, 0.4);
        result.semanticMatches = semanticResults.map(m => ({ key: m.key, content: m.content, similarity: m.confidence }));
      }
    } else {
      // Lightweight: still load long-term memories (without semantic search)
      const { MemorySystem } = await import("@/lib/nova/memory-system");
      const memories = await MemorySystem.getLongTerm(userId, workspaceId, 10);
      result.longTerm = Object.entries(memories).map(([k, v]) => ({ key: k, value: String(v) }));
    }
    if (conversationId) {
      const { MemorySystem } = await import("@/lib/nova/memory-system");
      const history = await MemorySystem.getShortTerm(workspaceId, conversationId);
      result.shortTerm = (history as Array<{ role: string; content: string }> || []).slice(-20);
    }
  } catch (error) { logger.warn("[MemoryLoader] Failed:", error); }
  return result;
}
