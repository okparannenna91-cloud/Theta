import { ACTION_PRIORITY_ORDER, PHILOSOPHIES, type ActionPriority } from "./constitution/philosophy";

export { type ActionPriority } from "./constitution/philosophy";

export class PhilosophyEngine {
  public static optimizeResponse(response: string, userIntentText: string): string {
    let cleanResponse = response.trim();

    cleanResponse = this.stripBoilerplate(cleanResponse);
    cleanResponse = this.formatLists(cleanResponse);
    cleanResponse = this.addActionSummary(cleanResponse, userIntentText);

    return cleanResponse;
  }

  private static stripBoilerplate(text: string): string {
    const leadingPatterns = [
      /^(?:sure|of course|absolutely|certainly|great question|excellent question|that's a great question)[!.]*\s*/i,
      /^(?:i would be happy to|i'?d be happy to)[^.]*\.\s*/i,
      /^(?:here is (?:a |the )?(?:summary|result|answer|output))[^.]*\.\s*/i,
    ];

    const trailingPatterns = [
      /let me know if (?:you need|there'?s anything|you have)/i,
      /feel free to (?:reach out|ask|contact|let me know)/i,
      /i'?m (?:here |always )?(?:to help|available|for you)/i,
      /is there anything else (?:i can|i should|you need)/i,
      /don'?t hesitate to (?:ask|reach out|contact)/i,
    ];

    const lines = text.split("\n");
    if (lines.length > 1) {
      const firstLine = lines[0].trim();
      const matchesLeading = leadingPatterns.some(pat => pat.test(firstLine));
      if (matchesLeading) {
        lines.shift();
      }

      const lastLine = lines[lines.length - 1].trim();
      const matchesTrailing = trailingPatterns.some(pat => pat.test(lastLine));
      if (matchesTrailing && lines.length > 1) {
        lines.pop();
      }
    }

    return lines.join("\n").trim();
  }

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

  private static addActionSummary(text: string, userIntentText: string): string {
    const actionIntents = ["create", "update", "delete", "add", "remove", "build", "schedule"];
    const matchesAction = actionIntents.some(intent => userIntentText.toLowerCase().includes(intent));

    if (!matchesAction) return text;

    const hasSummary = /^\*\*(OUTCOME|RESULT|DONE|COMPLETED|STATUS):/.test(text);
    if (hasSummary) return text;

    const firstLine = text.split("\n")[0].trim();

    if (firstLine.toLowerCase().includes("success") || firstLine.toLowerCase().includes("created") ||
        firstLine.toLowerCase().includes("deleted") || firstLine.toLowerCase().includes("updated")) {
      return `**DONE:** ${text}`;
    }

    if (firstLine.toLowerCase().includes("error") || firstLine.toLowerCase().includes("fail")) {
      return `**ERROR:** ${text}`;
    }

    return text;
  }

  public static getPriorityLabel(priority: ActionPriority): string {
    switch (priority) {
      case "EXECUTE": return "Execute the action immediately";
      case "AUTOMATE": return "Set up automation for repeated patterns";
      case "ORGANIZE": return "Organize information for the user";
      case "RECOMMEND": return "Recommend next steps or approaches";
      case "EXPLAIN": return "Provide explanation as last resort";
    }
  }
}
