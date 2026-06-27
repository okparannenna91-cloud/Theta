import { logger } from "@/lib/logger";

export interface LoadedMemory {
  longTerm: Array<{ key: string; value: string }>;
  shortTerm: Array<{ role: string; content: string }>;
}

export async function loadMemory(
  userId: string, workspaceId: string, conversationId?: string, depth: "lightweight" | "full" = "lightweight",
): Promise<LoadedMemory> {
  const result: LoadedMemory = { longTerm: [], shortTerm: [] };
  try {
    if (depth === "full") {
      const { MemorySystem } = await import("@/lib/nova/memory-system");
      const memories = await MemorySystem.getLongTerm(userId, workspaceId);
      result.longTerm = Object.entries(memories).map(([k, v]) => ({ key: k, value: String(v) }));
    }
    if (conversationId) {
      const { MemorySystem } = await import("@/lib/nova/memory-system");
      const history = await MemorySystem.getShortTerm(conversationId);
      result.shortTerm = (history as Array<{ role: string; content: string }> || []).slice(-20);
    }
  } catch (error) { logger.warn("[MemoryLoader] Failed:", error); }
  return result;
}
