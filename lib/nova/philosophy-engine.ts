import { ACTION_PRIORITY_ORDER, PHILOSOPHIES, type ActionPriority } from "./constitution/philosophy";

export { type ActionPriority } from "./constitution/philosophy";

export class PhilosophyEngine {
  public static optimizeResponse(response: string, userIntentText: string): string {
    let cleanResponse = response.trim();

    const boilerplatePatterns = [
      /^(sure|of course|absolutely|i would be happy to|here is how to|here is a summary of)/i,
      /^hello!/i,
      /^hi there/i,
    ];

    const lines = cleanResponse.split("\n");
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      const matchesBoilerplate = boilerplatePatterns.some(pat => pat.test(firstLine));
      if (matchesBoilerplate && lines.length > 1) {
        lines.shift();
        cleanResponse = lines.join("\n").trim();
      }
    }

    const actionIntents = ["create", "update", "delete", "add", "remove", "build", "schedule"];
    const matchesAction = actionIntents.some(intent => userIntentText.toLowerCase().includes(intent));

    if (matchesAction && !cleanResponse.includes("outcome") && !cleanResponse.includes("status")) {
      cleanResponse = `**OUTCOME:** Action analyzed & queued.\n\n${cleanResponse}`;
    }

    return cleanResponse;
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
