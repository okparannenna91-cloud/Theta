import { logger } from "../logger";

const HARMFUL_PATTERNS = [
  /how\s+to\s+(build|make|create|synthesize|manufacture)\s+(a\s+)?(bomb|weapon|explosive|poison|drug)/i,
  /instructions?\s+(for|to)\s+(self[\s-]?harm|suicide|harmful)/i,
  /(child\s+)?(abuse|exploitation)\s+materia/i,
  /illegal\s+(activity|substance|operation|content)/i,
];

const HALLUCINATION_PATTERNS = [
  /i\s+(don'?t|do\s+not)\s+(know|understand|have\s+access)/i,
  /(sorry|apologize).*(cannot|can'?t|unable)/i,
  /as\s+(an\s+)?AI\s+(model|assistant|language\s+model)/i,
];

const MIN_OUTPUT_LENGTH = 5;

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

    for (const pattern of HALLUCINATION_PATTERNS) {
      if (pattern.test(response)) {
        logger.warn("[OutputValidator] Possible hallucination detected in model output.");
      }
    }

    return response;
  }
}
