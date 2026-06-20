import { logger } from "../logger";
import { detectPromptInjection, detectSecretLeakage } from "./security-guard";

const HARMFUL_PATTERNS = [
  /how\s+to\s+(build|make|create|synthesize|manufacture)\s+(a\s+)?(bomb|weapon|explosive|poison|drug)/i,
  /instructions?\s+(for|to)\s+(self[\s-]?harm|suicide|harmful)/i,
  /(child\s+)?(abuse|exploitation)\s+materia/i,
  /illegal\s+(activity|substance|operation|content)/i,
  /instructions?\s+(on\s+)?how\s+to\s+(hack|crack|exploit|bypass|circumvent)/i,
  /(malware|ransomware|trojan|keylogger|spyware)\s+(code|script|program|creation)/i,
  /generate\s+(fake|forged|counterfeit)\s+(documents?|ids?|passports?|license)/i,
  /instructions?\s+(for\s+)?(unlawful|illegal|criminal)\s+/i,
];

const HALLUCINATION_PATTERNS = [
  /i\s+(don'?t|do\s+not)\s+(know|understand|have\s+access)/i,
  /(sorry|apologize).*(cannot|can'?t|unable)/i,
  /as\s+(an\s+)?AI\s+(model|assistant|language\s+model)/i,
  /(let\s+me\s+clarify|it\s+seems|i\s+believe|i\s+think)\s+/i,
];

const INCOHERENT_PATTERNS = [
  /[^\w\s]{10,}/,
];

const MIN_OUTPUT_LENGTH = 5;

export interface ValidationResult {
  valid: boolean;
  issues: Array<{ type: "harmful" | "hallucination" | "injection" | "leakage" | "incoherent" | "length"; message: string }>;
}

export class OutputValidator {
  static validate(response: string): string {
    if (!response || response.trim().length < MIN_OUTPUT_LENGTH) {
      throw new Error("Output validation failed: response is empty or too short.");
    }

    for (const pattern of HARMFUL_PATTERNS) {
      if (pattern.test(response)) {
        throw new Error("Output validation failed: response contains prohibited content.");
      }
    }

    if (detectSecretLeakage(response)) {
      throw new Error("Output validation failed: response contains potential secret leakage.");
    }

    if (detectPromptInjection(response)) {
      logger.error("[OutputValidator] Prompt injection patterns detected in output.");
    }

    for (const pattern of HALLUCINATION_PATTERNS) {
      if (pattern.test(response)) {
        logger.warn("[OutputValidator] Possible hallucination detected in model output.");
      }
    }

    return response;
  }

  static validateDetailed(response: string): ValidationResult {
    const issues: ValidationResult["issues"] = [];

    if (!response || response.trim().length < MIN_OUTPUT_LENGTH) {
      issues.push({ type: "length", message: "Response is empty or too short." });
    }

    for (const pattern of HARMFUL_PATTERNS) {
      if (pattern.test(response)) {
        issues.push({ type: "harmful", message: `Matched harmful pattern: ${pattern}` });
      }
    }

    if (detectSecretLeakage(response)) {
      issues.push({ type: "leakage", message: "Potential secret leakage detected." });
    }

    if (detectPromptInjection(response)) {
      issues.push({ type: "injection", message: "Prompt injection patterns detected." });
    }

    for (const pattern of HALLUCINATION_PATTERNS) {
      if (pattern.test(response)) {
        issues.push({ type: "hallucination", message: `Possible hallucination pattern: ${pattern}` });
      }
    }

    for (const pattern of INCOHERENT_PATTERNS) {
      if (pattern.test(response)) {
        issues.push({ type: "incoherent", message: "Response contains incoherent content." });
      }
    }

    return { valid: issues.length === 0, issues };
  }
}

export function sanitizeUserInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}
