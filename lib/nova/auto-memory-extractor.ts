import { logger } from "@/lib/logger";
import { executeWithProvider } from "@/lib/langraph/model-router";

const EXTRACTION_PROMPT = `You are a memory extraction engine. Analyze this conversation and extract any user preferences, decisions, or key information worth remembering long-term.

Conversation:
{conversation}

Extract ONLY clear, explicit information the user shared. Do not infer or assume.

Return a JSON array of memory objects:
[
  {{
    "key": "descriptive-kebab-case-key",
    "content": "The memory content",
    "type": "USER" | "TEAM" | "WORKSPACE" | "BEHAVIORAL" | "CONVENTIONS" | "PAST_DECISIONS"
  }}
]

Types:
- USER: Individual preferences (e.g., "prefers-short-responses", "wants-standup-mondays")
- TEAM: Team conventions (e.g., "team-uses-slack", "sprint-cycles-2-weeks")
- WORKSPACE: Workspace settings (e.g., "project-naming-convention", "default-priority-high")
- BEHAVIORAL: Recurring patterns (e.g., "always-asks-for-summary", "checks-metrics-daily")
- CONVENTIONS: Naming/formatting standards (e.g., "branch-naming-is-ticket-number", "commit-style-conventional")
- PAST_DECISIONS: Decisions with rationale (e.g., "chose-redis-over-memcached")

Return empty array if nothing worth remembering. Return ONLY the JSON array.`;

export class AutoMemoryExtractor {
  private static recentExtractions = new Map<string, number>();
  private static EXTRACTION_COOLDOWN_MS = 60_000;

  static async extractAndSave(
    userId: string,
    workspaceId: string,
    conversation: Array<{ role: string; content: string }>
  ): Promise<number> {
    const cooldownKey = `${userId}:${workspaceId}`;
    const lastExtraction = this.recentExtractions.get(cooldownKey) || 0;
    if (Date.now() - lastExtraction < this.EXTRACTION_COOLDOWN_MS) {
      return 0;
    }

    if (conversation.length < 4) return 0;

    const { MemorySystem } = await import("@/lib/nova/memory-system");
    const existingMemories = await MemorySystem.getLongTerm(userId, workspaceId, 50);
    const existingKeys = new Set(Object.keys(existingMemories));

    const conversationText = conversation
      .slice(-10)
      .map(m => `${m.role === "user" ? "User" : "Nova"}: ${m.content.substring(0, 500)}`)
      .join("\n");

    try {
      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "Extract user memories from conversations. Return ONLY JSON.",
        EXTRACTION_PROMPT.replace("{conversation}", conversationText),
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return 0;

      const extracted = JSON.parse(jsonMatch[0]) as Array<{
        key: string;
        content: string;
        type: string;
      }>;

      let savedCount = 0;
      for (const memory of extracted) {
        if (!memory.key || !memory.content) continue;
        if (existingKeys.has(memory.key)) continue;

        await MemorySystem.saveLongTerm({
          userId,
          workspaceId,
          key: memory.key,
          content: memory.content,
          type: memory.type as any,
        });
        savedCount++;
      }

      this.recentExtractions.set(cooldownKey, Date.now());

      if (savedCount > 0) {
        logger.info("[AutoMemoryExtractor] Extracted memories", {
          userId,
          workspaceId,
          extracted: savedCount,
        });
      }

      return savedCount;
    } catch (error) {
      logger.warn("[AutoMemoryExtractor] Extraction failed:", error);
      return 0;
    }
  }
}
