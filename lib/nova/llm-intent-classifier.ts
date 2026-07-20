import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";
import { type NovaIntent } from "./constitution/execution";

const INTENT_LABELS: Record<NovaIntent, string> = {
  CREATE: "create a new item (task, project, document)",
  READ: "read, list, or retrieve existing data",
  UPDATE: "modify an existing item",
  DELETE: "remove or delete an item",
  ANALYZE: "analyze workspace data for insights",
  SEARCH: "search or find specific information",
  AUTOMATE: "set up automation or triggers",
  REPORT: "generate a report or summary",
  IMPORT: "import data from external source",
  EXPORT: "export data to external format",
  PLAN: "plan a project, strategy, or roadmap",
  ORCHESTRATE: "orchestrate a multi-step workflow",
  CONSULT: "ask for advice or recommendations",
};

const INTENT_LIST = Object.entries(INTENT_LABELS)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n");

/**
 * Use LLM to classify intent when regex-based classification is ambiguous.
 * Falls back to null on any error (caller should use regex result).
 */
export async function llmClassifyIntent(
  prompt: string,
  regexIntent: NovaIntent,
  context?: { hasWorkspace: boolean; hasProject: boolean },
): Promise<NovaIntent | null> {
  const contextHint = context
    ? `\nWorkspace loaded: ${context.hasWorkspace}, Project loaded: ${context.hasProject}`
    : "";

  const classificationPrompt = `Classify this user message into exactly ONE intent.

Available intents:
${INTENT_LIST}

Rules:
- If the user wants to CREATE something new → CREATE
- If the user wants to MODIFY/UPDATE something → UPDATE
- If the user wants to DELETE/REMOVE something → DELETE
- If the user wants to SEE/READ/LIST data → READ
- If the user wants to SEARCH/FIND something → SEARCH
- If the user wants a REPORT/SUMMARY → REPORT
- If the user wants to PLAN/STRATEGIZE → PLAN
- If the user wants ADVICE/RECOMMENDATIONS → CONSULT
- If the user wants to AUTOMATE something → AUTOMATE
- If the user wants to IMPORT data → IMPORT
- If the user wants to EXPORT data → EXPORT
- If the user wants to ORCHESTRATE a multi-step workflow → ORCHESTRATE
- If the user wants to ANALYZE data → ANALYZE

User message: "${prompt}"
Regex guess: ${regexIntent}${contextHint}

Respond with ONLY the intent label (e.g., CREATE, READ, UPDATE). Nothing else.`;

  try {
    const response = await executeWithProvider(
      "gemini",
      "gemini-2.5-flash",
      "You are an intent classifier. Respond with one word only.",
      classificationPrompt,
    );

    const cleaned = response.trim().toUpperCase().replace(/[^A-Z_]/g, "");
    if (cleaned in INTENT_LABELS) {
      logger.info("[LLMIntentClassifier] LLM classified intent", { prompt: prompt.substring(0, 60), regexIntent, llmIntent: cleaned });
      return cleaned as NovaIntent;
    }

    logger.info("[LLMIntentClassifier] LLM response invalid, using regex", { cleaned, regexIntent });
    return null;
  } catch (error) {
    logger.warn("[LLMIntentClassifier] LLM classification failed:", error);
    return null;
  }
}
