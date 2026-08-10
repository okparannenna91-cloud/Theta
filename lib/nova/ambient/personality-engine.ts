import { logger } from "@/lib/logger";
import type { InterventionLevel, LLMDecision, InterventionCategory } from "./types";

const FORBIDDEN_PHRASES = [
  /great\s+question/i,
  /excellent\s+question/i,
  /that'?s?\s+a?\s*great\s+question/i,
  /certainly[!.]*/i,
  /of\s+course[!.]*/i,
  /i'?d?\s+be\s+happy\s+to/i,
  /i\s+would\s+be\s+happy\s+to/i,
  /happy\s+to\s+help/i,
  /hope\s+this\s+helps/i,
  /i\s+hope\s+this\s+helps/i,
  /sounds\s+great/i,
  /nice\s+idea/i,
  /absolutely[!.]*/i,
  /sure[!.]*\s+(thing|let|i|here)/i,
  /no\s+problem[!.]*/i,
  /you'?re?\s+welcome/i,
  /feel\s+free\s+to/i,
  /don'?t?\s+hesitate\s+to/i,
  /is\s+there\s+anything\s+else/i,
  /let\s+me\s+know\s+if\s+you/i,
  /i'?m?\s+(here|always)\s+(to\s+help|available)/i,
  /please\s+let\s+me\s+know/i,
  /thank\s+you\s+for\s+(asking|reaching|the)/i,
];

const FORBIDDEN_LEADING_PATTERNS = [
  /^(sure|of course|absolutely|certainly|great question|excellent question|that'?s?\s+a?\s*great\s+question)[!.]*\s*/i,
  /^(i would be happy to|i'?d be happy to)[^.]*\.\s*/i,
  /^(here is (?:a |the )?(?:summary|result|answer|output))[^.]*\.\s*/i,
  /^(i'll|i will|let me|allow me to)[^.]*\.\s*/i,
  /^(no problem|you're welcome|happy to help)[!.]*\s*/i,
  /^(first|first of all|firstly|before that|before we (?:start|begin|dive in)|to start (?:with|off))[^.]*\.\s*/i,
  /^(i want to (?:point out|mention|note|say) that)\s*/i,
];

const FORBIDDEN_TRAILING_PATTERNS = [
  /let me know if (?:you need|there'?s anything|you have)/i,
  /feel free to (?:reach out|ask|contact|let me know)/i,
  /i'?m (?:here |always )?(?:to help|available|for you)/i,
  /is there anything else (?:i can|i should|you need)/i,
  /don'?t hesitate to (?:ask|reach out|contact)/i,
  /please let me know if you need anything else/i,
  /i hope this helps/i,
];

const ROBOTIC_PHRASES = [
  /\bas\s+an\s+AI\b/i,
  /\bAI\s+(model|assistant|language\s+model)\b/i,
  /\bI\s+(don'?t|do\s+not)\s+(know|understand|have\s+access)\b/i,
  /\b(sorry|apologize)\b.*\b(cannot|can'?t|unable)\b/i,
  /\bbased\s+on\s+(my\s+)?(analysis|review|findings)\b/i,
  /\baccording\s+to\s+(my|the)\s+(data|records|information)\b/i,
  /\bi\s+(believe|think|feel)\s+that\b/i,
  /\bi\s+(believe|think|feel)\b/i,
  /\bas\s+(per|requested)\b/i,
  /\bplease\s+find\s+(below|above|attached)\b/i,
  /\bmight\s+be\b/i,
  /\b(maybe|perhaps|possibly|potentially)\b/i,
  /\bi\s+would\s+say\b/i,
];

const TONE_RULES: Record<string, string[]> = {
  neutral: [
    "Be direct and factual",
    "State observations without judgment",
    "Use active voice",
    "Lead with the most important information",
  ],
  urgent: [
    "State the risk immediately",
    "Be concise — no preamble",
    "Include the consequence of inaction",
    "End with one clear next step",
  ],
  supportive: [
    "Acknowledge the effort briefly",
    "Focus on the positive trend",
    "Keep it short — one sentence of recognition",
    "No cheering or exclamation marks",
  ],
  warning: [
    "Start with the risk statement",
    "Be specific about what's at stake",
    "State the impact in concrete terms",
    "Offer a clear recommended action",
  ],
};

export class PersonalityEngine {
  static enforceVoice(text: string, level: InterventionLevel, category: InterventionCategory): string {
    let clean = text.trim();

    const before = clean;
    clean = this.stripForbiddenLeading(clean);
    clean = this.stripForbiddenMidText(clean);
    clean = this.stripForbiddenTrailing(clean);
    clean = this.replaceRoboticPhrases(clean);
    clean = this.enforceConciseness(clean, level);
    clean = this.ensureSentenceEnding(clean);

    if (clean !== before) {
      logger.debug("[PersonalityEngine] Voice enforcement changed message", {
        before: before.substring(0, 60),
        after: clean.substring(0, 60),
      });
    }

    return clean;
  }

  static hasForbiddenPhrases(text: string): { found: boolean; matches: string[] } {
    const matches: string[] = [];
    for (const pattern of FORBIDDEN_PHRASES) {
      if (pattern.test(text)) {
        matches.push(pattern.source);
      }
    }
    return { found: matches.length > 0, matches };
  }

  static optimizeTone(message: string, tone: LLMDecision["tone"], level: InterventionLevel): string {
    const rules = TONE_RULES[tone] || TONE_RULES.neutral;

    if (level === 1) {
      return this.makeSuggestionTone(message);
    }
    if (level === 3) {
      return this.makeCriticalTone(message);
    }

    return message;
  }

  static generateSystemPrompt(): string {
    return [
      "You are Nova, an ambient AI teammate embedded in Theta PM workspaces.",
      "",
      "You must NEVER say:",
      "- \"Great question\", \"Certainly\", \"I'd be happy to help\"",
      "- \"Hope this helps\", \"Sounds great\", \"Nice idea\"",
      "- \"Absolutely\", \"Of course\", \"No problem\"",
      "- \"Feel free to\", \"Don't hesitate to\", \"Let me know if you need anything\"",
      "- \"I'm here to help\", \"Is there anything else\"",
      "- \"As an AI\", \"Based on my analysis\", \"According to my data\"",
      "",
      "INSTEAD, use concise, confident, context-aware language like:",
      "- \"The current sprint is likely to miss its deadline.\"",
      "- \"Today's workload exceeds your average completion rate.\"",
      "- \"This task became overdue yesterday and is blocking three others.\"",
      "- \"Looking at your workspace... I found an issue.\"",
      "",
      "TONE GUIDELINES:",
      "- Never use exclamation marks in professional communication",
      "- Default to 1-3 sentences. Shorter is better.",
      - "Lead with the most important insight. No preamble.",
      "- Sound like an experienced coworker, not a customer support bot.",
      "- If the situation is critical, state the risk immediately.",
      "- If it's a suggestion, be brief and let the user dismiss it.",
      "- Never ask rhetorical questions. Never thank the user.",
      "- Never apologize for doing your job.",
      "",
      "CRITICAL: Most observations should result in silence.",
      "Only speak when the value of interrupting the user exceeds the cost.",
    ].join("\n");
  }

  static formatInterventionMessage(pattern: {
    title: string;
    message: string;
    suggestedAction: string;
  }, level: InterventionLevel): string {
    const action = pattern.suggestedAction ? ` ${pattern.suggestedAction}` : "";
    const msg = pattern.message.endsWith(".") ? pattern.message : pattern.message + ".";

    if (level === 1) {
      return `${msg}${action ? ` ${action}` : ""}`;
    }

    if (level === 2) {
      return `${msg}${action ? `\n\n→ ${action.charAt(0).toUpperCase() + action.slice(1).replace(/\.$/, "")}${action.endsWith(".") ? "" : "."}` : ""}`;
    }

    return `${msg}${action ? `\n\nAction needed: ${action.charAt(0).toUpperCase() + action.slice(1)}` : ""}`;
  }

  private static stripForbiddenLeading(text: string): string {
    let result = text;
    for (const pattern of FORBIDDEN_LEADING_PATTERNS) {
      result = result.replace(pattern, "");
    }
    return result.trim();
  }

  private static stripForbiddenTrailing(text: string): string {
    let result = text;
    for (const pattern of FORBIDDEN_TRAILING_PATTERNS) {
      result = result.replace(pattern, "");
    }
    return result.trim();
  }

  private static stripForbiddenMidText(text: string): string {
    let result = text;
    for (const pattern of FORBIDDEN_PHRASES) {
      result = result.replace(pattern, "");
    }
    return result.replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").trim();
  }

  private static replaceRoboticPhrases(text: string): string {
    let result = text;
    for (const pattern of ROBOTIC_PHRASES) {
      result = result.replace(pattern, (match) => {
        if (/as an ai|ai (model|assistant|language)/i.test(match)) return "";
        if (/i (don't|do not) (know|understand|have access)/i.test(match)) {
          return "I don't have enough context on this yet.";
        }
        if (/(sorry|apologize).*(cannot|can't|unable)/i.test(match)) {
          return match.replace(/sorry,\s*/i, "").replace(/i apologize,?\s*/i, "");
        }
        if (/based on (my )?(analysis|review|findings)/i.test(match)) {
          return "Looking at the data";
        }
        if (/according to (my|the) (data|records|information)/i.test(match)) {
          return "The workspace data shows";
        }
        if (/i (believe|think|feel)/i.test(match)) return "";
        if (/(maybe|perhaps|possibly|potentially)/i.test(match)) return "";
        if (/i would say/i.test(match)) return "";
        if (/\bmight\s+be\b/i.test(match)) return "is";
        if (/as (per|requested)/i.test(match)) return "";
        if (/please find (below|above|attached)/i.test(match)) return "Here is";
        return match;
      });
    }
    return result.trim();
  }

  private static enforceConciseness(text: string, level: InterventionLevel): string {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    const maxSentences = level === 3 ? 3 : level === 2 ? 2 : 1;

    if (sentences.length > maxSentences) {
      return sentences.slice(0, maxSentences).join(". ").trim() + ".";
    }

    return text;
  }

  private static ensureSentenceEnding(text: string): string {
    const trimmed = text.trim();
    if (trimmed.length === 0) return "";
    if (!/[.!?]$/.test(trimmed)) return trimmed + ".";
    return trimmed;
  }

  private static makeSuggestionTone(message: string): string {
    const trimmed = message.trim();
    if (trimmed.startsWith("Consider") || trimmed.startsWith("Maybe") || trimmed.startsWith("You could")) {
      return trimmed;
    }
    return trimmed;
  }

  private static makeCriticalTone(message: string): string {
    const trimmed = message.trim();
    const criticalStarters = ["Risk:", "Blocked:", "Critical:", "Overdue:"];
    const hasStarter = criticalStarters.some((s) => trimmed.startsWith(s));
    if (!hasStarter) {
      const firstSentence = trimmed.split(/[.!?]/)[0];
      return `Risk: ${firstSentence.trim().toLowerCase()}.${trimmed.length > firstSentence.length ? trimmed.substring(firstSentence.length) : ""}`;
    }
    return trimmed;
  }
}
