import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";
import { type NovaIntent } from "./constitution/execution";

export interface ReasoningResult {
  objective: string;
  approach: string;
  risks: string[];
  missingInfo: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  shouldExecute: boolean;
  suggestedClarification?: string;
}

/**
 * Real reasoning engine — uses LLM to think through the user's request
 * before any tool calls or action execution.
 */
export async function reasonAboutRequest(
  prompt: string,
  intent: NovaIntent,
  workspaceContext: string,
): Promise<ReasoningResult> {
  const contextSnippet = workspaceContext
    ? `\n\nWorkspace context:\n${workspaceContext.slice(0, 1500)}`
    : "";

  const reasoningPrompt = `You are a project management AI assistant. Before acting, reason about this user request.

User request: "${prompt}"
Detected intent: ${intent}${contextSnippet}

Analyze and respond with ONLY a JSON object:
{
  "objective": "What the user actually wants to achieve (not just what they said)",
  "approach": "How you plan to fulfill this request",
  "risks": ["list of things that could go wrong"],
  "missingInfo": ["list of information you're missing that would improve the response"],
  "confidence": "HIGH if you're sure about intent + have all info, MEDIUM if minor gaps, LOW if major ambiguity",
  "shouldExecute": true/false,
  "suggestedClarification": "If confidence is LOW, suggest ONE specific question to ask. null otherwise."
}

Rules:
- "shouldExecute" should be true unless there's major ambiguity that would lead to wrong results
- Never fabricate workspace data — only use what's in the context
- Be specific about risks (e.g., "deleting 50 tasks" is a real risk, "something might go wrong" is not)
- "missingInfo" should be things the user didn't provide that are important for the action`;

  try {
    const response = await executeWithProvider(
      "gemini",
      "gemini-2.5-flash",
      "You are a JSON-only reasoning engine. Respond with valid JSON only.",
      reasoningPrompt,
    );

    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const validConfidence = ["HIGH", "MEDIUM", "LOW"].includes(parsed.confidence) ? parsed.confidence : "MEDIUM";

    logger.info("[ReasoningEngine] Reasoned about request", {
      intent,
      confidence: validConfidence,
      shouldExecute: parsed.shouldExecute,
      riskCount: parsed.risks?.length || 0,
    });

    return {
      objective: parsed.objective || prompt,
      approach: parsed.approach || "Direct execution",
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : [],
      confidence: validConfidence,
      shouldExecute: parsed.shouldExecute !== false,
      suggestedClarification: parsed.suggestedClarification || undefined,
    };
  } catch (error) {
    logger.warn("[ReasoningEngine] LLM reasoning failed, using defaults:", error);
    return {
      objective: prompt,
      approach: "Direct execution",
      risks: [],
      missingInfo: [],
      confidence: "MEDIUM",
      shouldExecute: true,
    };
  }
}
