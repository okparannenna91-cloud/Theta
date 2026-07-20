import { logger } from "@/lib/logger";
import { MemorySystem } from "./memory-system";

interface InteractionOutcome {
  prompt: string;
  intent: string;
  toolsUsed: string[];
  success: boolean;
  userFeedback?: "positive" | "negative" | null;
}

/**
 * Auto-learner that extracts patterns from user interactions
 * and saves them to long-term memory for future reference.
 */
export class AutoLearner {
  /**
   * Learn from a completed interaction.
   * Extracts patterns like: user preference for task creation, naming conventions, etc.
   */
  static async learnFromInteraction(
    userId: string,
    workspaceId: string,
    outcome: InteractionOutcome,
  ): Promise<void> {
    try {
      const patterns = this.extractPatterns(outcome);
      if (patterns.length === 0) return;

      for (const pattern of patterns) {
        await MemorySystem.saveLongTerm({
          userId,
          workspaceId,
          key: pattern.key,
          content: pattern.content,
        });
      }

      logger.info("[AutoLearner] Learned from interaction", {
        patternCount: patterns.length,
        intent: outcome.intent,
      });
    } catch (error) {
      logger.warn("[AutoLearner] Failed to learn from interaction:", error);
    }
  }

  /**
   * Extract patterns from an interaction outcome.
   */
  private static extractPatterns(outcome: InteractionOutcome): Array<{ key: string; content: string }> {
    const patterns: Array<{ key: string; content: string }> = [];

    // Learn naming conventions from task creation
    if (outcome.intent === "CREATE" && outcome.success) {
      const namingPattern = this.extractNamingPattern(outcome.prompt);
      if (namingPattern) {
        patterns.push({
          key: "nova:conventions:naming",
          content: namingPattern,
        });
      }
    }

    // Learn from negative feedback — user didn't like the response
    if (outcome.userFeedback === "negative") {
      patterns.push({
        key: "nova:preferences:avoid-pattern",
        content: `User disliked this approach for "${outcome.intent}" intent. Avoid: ${outcome.toolsUsed.join(", ")}`,
      });
    }

    // Learn from positive feedback — user liked the approach
    if (outcome.userFeedback === "positive") {
      patterns.push({
        key: "nova:preferences:prefer-pattern",
        content: `User liked this approach for "${outcome.intent}" intent. Tools: ${outcome.toolsUsed.join(", ")}`,
      });
    }

    // Learn recurring task patterns
    if (outcome.intent === "CREATE" && outcome.toolsUsed.includes("create_task")) {
      patterns.push({
        key: "nova:patterns:task-creation",
        content: `Task created: "${outcome.prompt.substring(0, 100)}"`,
      });
    }

    return patterns;
  }

  /**
   * Extract naming convention from a prompt.
   */
  private static extractNamingPattern(prompt: string): string | null {
    // Look for quoted names — these are user-provided naming conventions
    const quotedNames = prompt.match(/["']([^"']+)["']/g);
    if (quotedNames && quotedNames.length > 0) {
      return `User naming convention: ${quotedNames.join(", ")}`;
    }
    return null;
  }

  /**
   * Learn from a session (batch of interactions).
   */
  static async learnFromSession(
    userId: string,
    workspaceId: string,
    interactions: InteractionOutcome[],
  ): Promise<void> {
    const positiveCount = interactions.filter(i => i.userFeedback === "positive").length;
    const negativeCount = interactions.filter(i => i.userFeedback === "negative").length;

    if (interactions.length >= 3) {
      // Learn session-level patterns
      const intentCounts = new Map<string, number>();
      for (const i of interactions) {
        intentCounts.set(i.intent, (intentCounts.get(i.intent) || 0) + 1);
      }

      const dominantIntent = Array.from(intentCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];

      if (dominantIntent && dominantIntent[1] >= 2) {
        await MemorySystem.saveLongTerm({
          userId,
          workspaceId,
          key: "nova:patterns:session-focus",
          content: `User session focused on ${dominantIntent[0]} operations (${dominantIntent[1]} times)`,
        });
      }
    }

    logger.info("[AutoLearner] Session learning complete", {
      interactions: interactions.length,
      positive: positiveCount,
      negative: negativeCount,
    });
  }
}
