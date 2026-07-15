import { ACTION_PRIORITY_ORDER, PHILOSOPHIES, type ActionPriority } from "./constitution/philosophy";

export { type ActionPriority } from "./constitution/philosophy";

export interface ResponseContext {
  intent: string;
  confidence: string;
  actionType: string;
  workspaceName?: string;
  projectName?: string;
  taskTitle?: string;
}

export class PhilosophyEngine {
  /**
   * Optimize response for Nova Prime quality
   */
  public static optimizeResponse(response: string, userIntentText: string, context?: ResponseContext): string {
    let cleanResponse = response.trim();

    cleanResponse = this.stripBoilerplate(cleanResponse);
    cleanResponse = this.formatLists(cleanResponse);
    cleanResponse = this.addActionSummary(cleanResponse, userIntentText);
    cleanResponse = this.addContextReferences(cleanResponse, context);
    cleanResponse = this.ensureConfidenceTransparency(cleanResponse, context);

    return cleanResponse;
  }

  /**
   * Strip generic AI boilerplate
   */
  private static stripBoilerplate(text: string): string {
    const leadingPatterns = [
      /^(?:sure|of course|absolutely|certainly|great question|excellent question|that's a great question)[!.]*\s*/i,
      /^(?:i would be happy to|i'?d be happy to)[^.]*\.\s*/i,
      /^(?:here is (?:a |the )?(?:summary|result|answer|output))[^.]*\.\s*/i,
      /^(?:i'll|i will|let me|allow me to)[^.]*\.\s*/i,
      /^(?:no problem|you're welcome|happy to help)[!.]*\s*/i,
    ];

    const trailingPatterns = [
      /let me know if (?:you need|there'?s anything|you have)/i,
      /feel free to (?:reach out|ask|contact|let me know)/i,
      /i'?m (?:here |always )?(?:to help|available|for you)/i,
      /is there anything else (?:i can|i should|you need)/i,
      /don'?t hesitate to (?:ask|reach out|contact)/i,
      /please let me know if you need anything else/i,
      /i hope this helps/i,
    ];

    let result = text.trim();

    // Strip leading boilerplate
    for (const pattern of leadingPatterns) {
      if (pattern.test(result)) {
        result = result.replace(pattern, "").trim();
        break;
      }
    }

    // Strip trailing boilerplate
    const lines = result.split("\n");
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1].trim();
      const matchesTrailing = trailingPatterns.some(pat => pat.test(lastLine));
      if (matchesTrailing && lines.length > 1) {
        lines.pop();
        result = lines.join("\n").trim();
      } else if (matchesTrailing && lines.length === 1) {
        // For single line, only strip the trailing part, keep the rest
        for (const pattern of trailingPatterns) {
          if (pattern.test(lastLine)) {
            const cleaned = lastLine.replace(pattern, "").trim();
            if (cleaned.length > 0) {
              result = cleaned;
            }
            break;
          }
        }
      }
    }

    return result;
  }

  /**
   * Format lists consistently
   */
  private static formatLists(text: string): string {
    const lines = text.split("\n");
    const formatted = lines.map(line => {
      const trimmed = line.trim();

      if (/^[-*]\s/.test(trimmed) && !trimmed.startsWith("  ")) {
        return trimmed.replace(/^[-*]\s+/, "- ");
      }

      if (/^\d+[.)]\s/.test(trimmed)) {
        return trimmed;
      }

      return line;
    });
    return formatted.join("\n");
  }

  /**
   * Add action summary for action intents
   */
  private static addActionSummary(text: string, userIntentText: string): string {
    const actionIntents = ["create", "update", "delete", "add", "remove", "build", "schedule", "plan"];
    const matchesAction = actionIntents.some(intent => userIntentText.toLowerCase().includes(intent));

    if (!matchesAction) return text;

    const hasSummary = /^\*\*(OUTCOME|RESULT|DONE|COMPLETED|STATUS|PLAN):/.test(text);
    if (hasSummary) return text;

    const firstLine = text.split("\n")[0].trim();

    if (firstLine.toLowerCase().includes("success") || firstLine.toLowerCase().includes("created") ||
        firstLine.toLowerCase().includes("deleted") || firstLine.toLowerCase().includes("updated") ||
        firstLine.toLowerCase().includes("plan generated") || firstLine.toLowerCase().includes("workflow completed")) {
      return `**DONE:** ${text}`;
    }

    if (firstLine.toLowerCase().includes("error") || firstLine.toLowerCase().includes("fail")) {
      return `**ERROR:** ${text}`;
    }

    return text;
  }

  /**
   * Add context references to make responses feel personalized
   */
  private static addContextReferences(text: string, context?: ResponseContext): string {
    if (!context) return text;

    // Don't add references if already present
    if (text.includes(context.workspaceName || "") || text.includes(context.projectName || "")) {
      return text;
    }

    // Add context reference at the beginning for action responses
    if (context.actionType === "EXECUTE" && context.workspaceName) {
      const prefix = context.projectName
        ? `In your **${context.projectName}** project`
        : `In your **${context.workspaceName}** workspace`;
      return `${prefix}, ${text.charAt(0).toLowerCase() + text.slice(1)}`;
    }

    return text;
  }

  /**
   * Ensure confidence transparency
   */
  private static ensureConfidenceTransparency(text: string, context?: ResponseContext): string {
    if (!context) return text;

    // Add confidence indicator for low confidence responses
    if (context.confidence === "LOW" && !text.includes("I'm not certain") && !text.includes("I need clarification")) {
      return `${text}\n\n*I want to make sure I understand correctly — could you clarify?*`;
    }

    return text;
  }

  /**
   * Get priority label for display
   */
  public static getPriorityLabel(priority: ActionPriority): string {
    switch (priority) {
      case "EXECUTE": return "Execute the action immediately";
      case "AUTOMATE": return "Set up automation for repeated patterns";
      case "ORGANIZE": return "Organize information for the user";
      case "RECOMMEND": return "Recommend next steps or approaches";
      case "EXPLAIN": return "Provide explanation as last resort";
    }
  }

  /**
   * Generate natural language summary of what was accomplished
   */
  public static generateActionSummary(
    actionType: string,
    toolName: string,
    params: Record<string, unknown>,
    result: unknown
  ): string {
    const paramName = params.title || params.name || params.taskTitle || "item";

    switch (toolName) {
      case "create_task":
        return `I've created **${paramName}**. Would you like me to set a due date or assign it to someone?`;
      case "update_task":
        return `I've updated **${paramName}**. The changes are now saved.`;
      case "delete_task":
        return `I've deleted **${paramName}**. This action cannot be undone.`;
      case "create_project":
        return `I've created the **${paramName}** project. Would you like me to add tasks or milestones?`;
      case "generate_standup":
        return `Here's your standup summary. Let me know if you'd like me to dive deeper into any area.`;
      default:
        return `Done. I've completed the ${toolName.replace(/_/g, " ")} action.`;
    }
  }
}
