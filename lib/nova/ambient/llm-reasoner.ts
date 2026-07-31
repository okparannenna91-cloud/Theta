import { executeWithProvider, routeModel } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";
import { PersonalityEngine } from "./personality-engine";
import type { ObservationContext, DetectedPattern, InterventionScore, LLMDecision, InterventionCategory, InterventionLevel } from "./types";

export class LLMReasoner {
  static async reason(
    context: ObservationContext,
    patterns: DetectedPattern[],
    score: InterventionScore
  ): Promise<LLMDecision> {
    if (patterns.length === 0) {
      return {
        shouldSpeak: false,
        level: 0,
        message: "",
        reasoning: "No patterns detected. Staying silent.",
        category: "SUMMARY",
        tone: "neutral",
      };
    }

    if (score.level === 0) {
      return {
        shouldSpeak: false,
        level: 0,
        message: "",
        reasoning: score.reasoning || "Low-priority observation — staying silent.",
        category: "SUMMARY",
        tone: "neutral",
      };
    }

    try {
      const result = await this.callLLM(context, patterns, score);
      return result;
    } catch (error: any) {
      logger.warn("[LLMReasoner] LLM call failed, using rule-based fallback:", error.message);
      return this.fallback(context, patterns, score);
    }
  }

  private static async callLLM(
    context: ObservationContext,
    patterns: DetectedPattern[],
    score: InterventionScore
  ): Promise<LLMDecision> {
    const eventDescription = this.buildEventDescription(context);
    const patternsDescription = patterns.map((p) =>
      `[${p.severity.toUpperCase()}] ${p.title}: ${p.message} (confidence: ${Math.round(p.confidence * 100)}%, priority: ${p.priority}/10, urgency: ${p.urgency})`
    ).join("\n");

    const systemPrompt = PersonalityEngine.generateSystemPrompt();

    const prompt = `Current event: ${eventDescription}

Detected patterns:
${patternsDescription}

Scoring:
- Importance: ${score.importance}/10
- Urgency: ${score.urgency}/1
- Relevance: ${score.relevance}/1
- Suggested level: ${score.level}/3
- Priority: ${score.priorityScore.label} (${score.priorityScore.score}/10)
- Urgency window: ${score.urgencyScore.suggestedActionWindow}
${context.memory?.recurringIssues?.length ? `\nRecurring issues observed: ${context.memory.recurringIssues.map(i => i.issue).join(", ")}` : ""}

${context.memory?.recentDecisions?.length ? `\nRecent decisions in workspace: ${context.memory.recentDecisions.slice(0, 3).map(d => d.topic).join(", ")}` : ""}

Should you speak?

IMPORTANT FORMAT RULES:
- If shouldSpeak is true, message must be 1-3 sentences maximum
- NEVER use phrases like "Great question", "Certainly", "Hope this helps", "Sounds great"
- Be direct, factual, and concise
- Level 1: simple observation, no call to action needed
- Level 2: observation + recommended action
- Level 3: urgent risk statement + required action

Respond in JSON format:
{
  "shouldSpeak": boolean,
  "level": 0-3,
  "message": "your message if speaking",
  "reasoning": "short explanation",
  "category": "DEADLINE_RISK|BLOCKER_DETECTED|WORKLOAD_IMBALANCE|FORGOTTEN_WORK|PROJECT_HEALTH|SPRINT_RISK|PATTERN_INSIGHT|OPPORTUNITY|COACHING|SUMMARY",
  "tone": "neutral|urgent|supportive|warning"
}`;

    // Hybrid model routing: flash for routine observations, strong model for
    // high-priority interventions where decision quality matters most.
    const response = score.level >= 2
      ? await this.callStrongModel(systemPrompt, prompt)
      : await executeWithProvider("gemini", "gemini-2.5-flash", systemPrompt, prompt);

    return this.parseResponse(response, score);
  }

  private static async callStrongModel(systemPrompt: string, prompt: string): Promise<string> {
    const config = await routeModel(
      `Analyze and reason about this Nova intervention decision: ${prompt}`
    );
    return executeWithProvider(config.provider, config.model, systemPrompt, prompt);
  }

  private static buildEventDescription(context: ObservationContext): string {
    const event = context.event;
    let desc = `Type: ${event.type}`;

    if (event.taskId && context.task) {
      desc += ` | Task: "${context.task.title}" (${context.task.status})`;
    }
    if (event.projectId && context.project) {
      desc += ` | Project: "${context.project.name}" (${context.project.completionRate}% complete)`;
    }
    if (event.userId && context.user) {
      desc += ` | User: ${context.user.name || context.user.id} (${context.user.activeTaskCount} active, ${context.user.overdueTaskCount} overdue)`;
    }
    if (context.workspace) {
      desc += ` | Workspace: "${context.workspace.name}" (${context.workspace.memberCount} members)`;
    }
    if (context.sprint) {
      desc += ` | Sprint: "${context.sprint.name}" (${context.sprint.remainingDays}d left, ${context.sprint.completedTasks}/${context.sprint.totalTasks} done)`;
    }
    if (context.chatMessage) {
      desc += ` | Chat: "${context.chatMessage.content.substring(0, 100)}"`;
    }

    return desc;
  }

  private static parseResponse(response: string, score: InterventionScore): LLMDecision {
    try {
      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const level: InterventionLevel = typeof parsed.level === "number"
        ? Math.min(3, Math.max(0, parsed.level)) as InterventionLevel
        : score.level;
      let message = typeof parsed.message === "string" && parsed.message.trim().length > 0 ? parsed.message.trim() : "";

      if (message) {
        message = PersonalityEngine.enforceVoice(message, level, this.parseCategory(parsed.category));
        message = PersonalityEngine.optimizeTone(message, this.parseTone(parsed.tone), level);
      }

      return {
        shouldSpeak: !!parsed.shouldSpeak && level > 0 && message.length > 0,
        level,
        message,
        reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "LLM provided decision",
        category: this.parseCategory(parsed.category),
        tone: this.parseTone(parsed.tone),
      };
    } catch {
      return this.fallback(null, null, score);
    }
  }

  private static parseCategory(cat: string | undefined): InterventionCategory {
    const valid: InterventionCategory[] = [
      "DEADLINE_RISK", "BLOCKER_DETECTED", "WORKLOAD_IMBALANCE", "FORGOTTEN_WORK",
      "PROJECT_HEALTH", "SPRINT_RISK", "PATTERN_INSIGHT", "OPPORTUNITY", "COACHING", "SUMMARY",
    ];
    if (cat && valid.includes(cat as InterventionCategory)) {
      return cat as InterventionCategory;
    }
    return "PROJECT_HEALTH";
  }

  private static parseTone(tone: string | undefined): LLMDecision["tone"] {
    const valid: LLMDecision["tone"][] = ["neutral", "urgent", "supportive", "warning"];
    if (tone && valid.includes(tone as LLMDecision["tone"])) {
      return tone as LLMDecision["tone"];
    }
    return "neutral";
  }

  private static fallback(
    _context: ObservationContext | null,
    patterns: DetectedPattern[] | null,
    score: InterventionScore
  ): LLMDecision {
    if (score.level === 0) {
      return {
        shouldSpeak: false,
        level: 0,
        message: "",
        reasoning: score.reasoning || "Insufficient importance to intervene.",
        category: "SUMMARY",
        tone: "neutral",
      };
    }

    const topPattern = patterns && patterns.length > 0 ? patterns[0] : null;
    const message = topPattern
      ? PersonalityEngine.formatInterventionMessage(topPattern, score.level)
      : "";

    if (!message) {
      return {
        shouldSpeak: false,
        level: 0,
        message: "",
        reasoning: "No actionable content to deliver.",
        category: "SUMMARY",
        tone: "neutral",
      };
    }

    const categoryMap: Record<string, InterventionCategory> = {
      DEADLINE_RISK: "DEADLINE_RISK",
      BLOCKED_TASKS: "BLOCKER_DETECTED",
      CAPACITY_IMBALANCE: "WORKLOAD_IMBALANCE",
      UNASSIGNED_WORK: "FORGOTTEN_WORK",
      FORGOTTEN_WORK: "FORGOTTEN_WORK",
      STALLED_PROGRESS: "FORGOTTEN_WORK",
      DUPLICATE_WORK: "PATTERN_INSIGHT",
      PROJECT_INACTIVITY: "PROJECT_HEALTH",
      DEPENDENCY_CASCADE: "BLOCKER_DETECTED",
      RECURRING_FAILURE: "PATTERN_INSIGHT",
      SCOPE_CREEP: "SPRINT_RISK",
      VELOCITY_DROP: "PROJECT_HEALTH",
      MEMBER_INACTIVITY: "PROJECT_HEALTH",
      SOLO_FOUNDER_RISK: "WORKLOAD_IMBALANCE",
      WORKLOAD_COLLAPSE: "WORKLOAD_IMBALANCE",
      COMPLETION_TREND: "OPPORTUNITY",
      RECENT_ACHIEVEMENT: "OPPORTUNITY",
      SPRINT_OVERLOAD: "SPRINT_RISK",
      MISSING_DEPENDENCIES: "BLOCKER_DETECTED",
    };

    const category: InterventionCategory = topPattern
      ? categoryMap[topPattern.type] || "PROJECT_HEALTH"
      : "PROJECT_HEALTH";

    const tone = score.level === 3 ? "urgent" : score.level === 2 ? "warning" : "neutral";

    const finalMessage = PersonalityEngine.enforceVoice(message, score.level, category);

    return {
      shouldSpeak: score.level >= 1,
      level: score.level,
      message: finalMessage,
      reasoning: `Rule-based: Level ${score.level} — ${topPattern?.title || "observation"}`,
      category,
      tone,
    };
  }
}
