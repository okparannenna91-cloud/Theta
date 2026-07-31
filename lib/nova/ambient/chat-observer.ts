import { logger } from "@/lib/logger";
import { executeWithProvider, routeModel } from "@/lib/langraph/model-router";
import { PersonalityEngine } from "./personality-engine";
import type { WorkspaceEvent, ObservationContext, ChatObservationDecision } from "./types";

export class ChatObserver {
  static async analyzeMessage(
    event: WorkspaceEvent,
    context: ObservationContext
  ): Promise<ChatObservationDecision> {
    if (!event.metadata?.content) {
      return { shouldParticipate: false, confidence: 0, reasoning: "No message content", contributionType: null };
    }

    const content = event.metadata.content as string;
    const isDirectMention = event.metadata?.mentions
      ? (event.metadata.mentions as string[]).some((m) => /nova|theta/i.test(m))
      : false;

    if (this.isCasualConversation(content)) {
      return {
        shouldParticipate: false,
        confidence: 0.9,
        reasoning: "Casual conversation — Nova should not interrupt.",
        contributionType: null,
      };
    }

    if (this.isGreeting(content) && !isDirectMention) {
      return {
        shouldParticipate: false,
        confidence: 0.8,
        reasoning: "Greeting not directed at Nova — staying silent.",
        contributionType: null,
      };
    }

    if (isDirectMention) {
      const decision = await this.evaluateDirectMention(content, context);
      return decision;
    }

    const questionContext = this.extractQuestionContext(content);
    if (!questionContext.isQuestion) {
      return {
        shouldParticipate: false,
        confidence: 0.7,
        reasoning: "Not a question or task-related statement. Staying silent.",
        contributionType: null,
      };
    }

    if (questionContext.topics.length === 0) {
      return {
        shouldParticipate: false,
        confidence: 0.5,
        reasoning: "Question is unrelated to workspace context.",
        contributionType: null,
      };
    }

    const decision = await this.evaluateWithLLM(content, questionContext, context);
    return decision;
  }

  private static isCasualConversation(text: string): boolean {
    const casualPatterns = [
      /^(lol|lmao|haha|nice|cool|awesome|wow|omg)/i,
      /^(good\s+(morning|afternoon|evening|day))/i,
      /^(how'?s?\s+(everyone|it\s+going|your\s+day))/i,
      /^(anyone|everybody)\s+/i,
      /^(coffee|lunch|break|weekend|holiday)/i,
      /^(funny|crazy|insane|ridiculous)/i,
      /^(what\s+did\s+you\s+(eat|watch|play))/i,
      /^(who'?s?\s+(watching|playing|going))/i,
    ];

    return casualPatterns.some((p) => p.test(text.trim()));
  }

  private static isGreeting(text: string): boolean {
    const greetingPatterns = [
      /^(hi|hey|hello|yo|sup|howdy|morning|afternoon|evening)\b/i,
      /^(what'?s?\s+up|wassup)/i,
      /^(goodbye|bye|cya|see\s+ya|later)/i,
    ];
    return greetingPatterns.some((p) => p.test(text.trim()));
  }

  private static extractQuestionContext(text: string): { isQuestion: boolean; topics: string[] } {
    const trimmed = text.trim();
    const isQuestion = trimmed.includes("?") ||
      /^(what|when|where|why|how|who|which|can|could|would|will|did|does|is|are|do)\b/i.test(trimmed);

    if (!isQuestion) return { isQuestion: false, topics: [] };

    const topicKeywords = [
      "task", "project", "sprint", "deadline", "due", "overdue",
      "blocked", "dependency", "assign", "workload", "capacity",
      "priority", "status", "progress", "health", "risk",
      "milestone", "goal", "metric", "report", "summary",
      "version", "release", "deploy", "bug", "issue",
      "meeting", "update", "change", "plan", "timeline",
    ];

    const topics = topicKeywords.filter((keyword) =>
      new RegExp(`\\b${keyword}\\b`, "i").test(trimmed)
    );

    return { isQuestion: true, topics };
  }

  private static async evaluateDirectMention(
    content: string,
    context: ObservationContext
  ): Promise<ChatObservationDecision> {
    const systemPrompt = `${PersonalityEngine.generateSystemPrompt()}

You are being directly addressed in a team chat. Decide if you should respond.

Context: You are an ambient AI teammate. You should only respond when:
1. The question requires workspace knowledge
2. You can provide factual information from the workspace
3. The team would benefit from your response

You should NOT respond to:
- Casual conversation not related to work
- Questions about yourself (who are you, etc.)
- Rhetorical questions`;

    const workspaceContext = context.workspace ? `Workspace: "${context.workspace.name}" with ${context.workspace.memberCount} members and ${context.workspace.taskCount} tasks.` : "";
    const projectContext = context.project ? `Project: "${context.project.name}" (${context.project.completionRate}% complete).` : "";

    const prompt = `Message: "${content}"

${workspaceContext}
${projectContext}

Decide: Should Nova respond? Reply in JSON:
{
  "shouldParticipate": boolean,
  "confidence": number (0-1),
  "reasoning": "brief explanation",
  "suggestedMessage": "only if shouldParticipate is true",
  "contributionType": "answer" | "context" | "warning" | "insight" | null
}`;

    try {
      // Direct mentions are high-stakes: the user is waiting for Nova's actual
      // reply, so use the strong model via the router instead of flash.
      const config = await routeModel(
        `Analyze and reason about this team chat message: ${content}`
      );
      const response = await executeWithProvider(config.provider, config.model, systemPrompt, prompt);

      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const decision: ChatObservationDecision = {
        shouldParticipate: !!parsed.shouldParticipate,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        reasoning: parsed.reasoning || "Direct mention evaluated",
        suggestedMessage: parsed.suggestedMessage,
        contributionType: parsed.contributionType || null,
      };

      if (decision.suggestedMessage) {
        decision.suggestedMessage = PersonalityEngine.enforceVoice(
          decision.suggestedMessage,
          1,
          "COACHING"
        );
      }

      return decision;
    } catch (error: any) {
      logger.warn("[ChatObserver] LLM evaluation failed:", error.message);

      return {
        shouldParticipate: true,
        confidence: 0.5,
        reasoning: "Direct mention detected. Responding with available context.",
        contributionType: "answer",
      };
    }
  }

  private static async evaluateWithLLM(
    content: string,
    questionContext: { isQuestion: boolean; topics: string[] },
    context: ObservationContext
  ): Promise<ChatObservationDecision> {
    const systemPrompt = `${PersonalityEngine.generateSystemPrompt()}

You are observing a team chat conversation. Decide if you should participate.

Rules:
- NEVER interrupt casual or social conversations
- ONLY participate when you can add objective, factual value
- If the conversation is already being handled, stay silent
- Workplace questions about tasks, projects, deadlines, or metrics are appropriate
- Keep responses to 1-2 sentences maximum`;

    const prompt = `Chat message: "${content}"
Topics detected: ${questionContext.topics.join(", ") || "none"}

Workspace context: ${context.workspace?.name || "Unknown"} (${context.workspace?.memberCount || 0} members)

Should Nova participate? Reply in JSON:
{
  "shouldParticipate": boolean,
  "confidence": number (0-1),
  "reasoning": "brief explanation",
  "suggestedMessage": "1-2 sentence response if participating",
  "contributionType": "answer" | "context" | "warning" | "insight" | null
}`;

    try {
      const response = await executeWithProvider("gemini", "gemini-2.5-flash", systemPrompt, prompt);
      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        shouldParticipate: !!parsed.shouldParticipate,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        reasoning: parsed.reasoning || "Evaluated with LLM",
        suggestedMessage: parsed.suggestedMessage ? PersonalityEngine.enforceVoice(parsed.suggestedMessage, 1, "COACHING") : undefined,
        contributionType: parsed.contributionType || null,
      };
    } catch {
      return {
        shouldParticipate: false,
        confidence: 0.3,
        reasoning: "Could not evaluate. Staying silent by default.",
        contributionType: null,
      };
    }
  }
}
