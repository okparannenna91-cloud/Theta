import { logger } from "@/lib/logger";

export interface SaveMemoryOptions {
  userId: string;
  workspaceId: string;
  conversationId?: string;
  prompt: string;
  response: string;
  toolResults?: Array<{ toolName: string; result?: unknown; error?: string }>;
}

export async function saveConversationMemory(options: SaveMemoryOptions): Promise<void> {
  const { userId, workspaceId, conversationId, prompt, response, toolResults } = options;

  try {
    const { MemorySystem } = await import("@/lib/nova/memory-system");

    // Save short-term memory (conversation history)
    if (conversationId) {
      await MemorySystem.saveShortTerm(workspaceId, conversationId, { role: "user", content: prompt }).catch(() => {});
      await MemorySystem.saveShortTerm(workspaceId, conversationId, { role: "assistant", content: response }).catch(() => {});
    }

    // Save tool results as long-term memory if any tools were executed
    if (toolResults && toolResults.length > 0) {
      for (const tr of toolResults) {
        if (tr.result) {
          const resultStr = typeof tr.result === "string" ? tr.result : JSON.stringify(tr.result);
          await MemorySystem.saveLongTerm({
            userId,
            workspaceId,
            key: `tool:${tr.toolName}:${Date.now()}`,
            content: resultStr.substring(0, 1000),
          }).catch(() => {});
        }
      }
    }

    // Save to Prisma aiConversation if conversationId exists
    if (conversationId) {
      const { prisma } = await import("@/lib/prisma");
      await prisma.aiMessage.create({
        data: {
          conversationId,
          role: "user",
          content: prompt,
        },
      }).catch(() => {});
      await prisma.aiMessage.create({
        data: {
          conversationId,
          role: "assistant",
          content: response,
        },
      }).catch(() => {});
    }
  } catch (error) {
    logger.warn("[MemorySaver] Failed to save memory:", error);
  }
}
