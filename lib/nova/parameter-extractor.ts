import { logger } from "@/lib/logger";

export interface ExtractedParameters {
  title: string | null;
  description: string | null;
  priority: string | null;
  dueDate: string | null;
  assignee: string | null;
  projectName: string | null;
  status: string | null;
  tags: string[];
  isExplicit: {
    title: boolean;
    priority: boolean;
    dueDate: boolean;
    assignee: boolean;
    projectName: boolean;
  };
  confidence: number;
}

const PRIORITY_KEYWORDS = {
  high: /\b(?:high|urgent|critical|important|p0|p1)\b/i,
  medium: /\b(?:medium|normal|moderate|p2)\b/i,
  low: /\b(?:low|minor|p3|p4)\b/i,
};

const STATUS_KEYWORDS = {
  todo: /\b(?:todo|to-do|to do|pending|not started)\b/i,
  "in-progress": /\b(?:in-progress|in progress|working on|started|active)\b/i,
  done: /\b(?:done|completed|finished|closed)\b/i,
  blocked: /\b(?:blocked|stuck|waiting|held)\b/i,
};

const TITLE_PATTERNS = [
  /(?:create|make|add|new)\s+(?:a\s+)?(?:task|todo|item)\s+(?:called|named|titled|title)?\s*["']?([^"']+?)["']?\s*(?:with|having|priority|due|assign|$)/i,
  /(?:create|make|add|new)\s+(?:a\s+)?(?:task|todo|item)\s+["']([^"']+)["']/i,
  /(?:task|todo|item)\s+(?:called|named|titled|title)\s+["']?([^"']+?)["']?\s*(?:with|having|priority|due|assign|$)/i,
  /["']([^"']+)["']\s+(?:task|todo|item)/i,
];

const DATE_PATTERNS = [
  /(?:due|deadline|by|before|until)\s+(?:on\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  /(?:due|deadline|by|before|until)\s+(?:on\s+)?((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i,
  /(?:due|deadline|by|before|until)\s+(?:on\s+)?((?:tomorrow|next\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)))/i,
  /(?:due|deadline|by|before|until)\s+(?:on\s+)?(today)/i,
];

const ASSIGNEE_PATTERNS = [
  /(?:assign|assigned|assign to|give to|hand to)\s+(?:to\s+)?["']?([^"']+?)["']?\s*(?:with|priority|due|$)/i,
  /(?:assign|assigned|assign to|give to|hand to)\s+(?:to\s+)?["']([^"']+)["']/i,
  /(?:to)\s+["']?([^"']+?)["']?\s+(?:with|priority|due|$)/i,
];

const PROJECT_PATTERNS = [
  /(?:in|for|within|under)\s+(?:the\s+)?(?:project\s+)?["']?([^"']+?)["']?\s*(?:with|priority|due|assign|$)/i,
  /(?:in|for|within|under)\s+(?:the\s+)?(?:project\s+)?["']([^"']+)["']/i,
];

export class ParameterExtractor {
  /**
   * Extract all parameters from user prompt
   * Explicit user values are NEVER overwritten
   */
  public static extract(prompt: string): ExtractedParameters {
    const result: ExtractedParameters = {
      title: null,
      description: null,
      priority: null,
      dueDate: null,
      assignee: null,
      projectName: null,
      status: null,
      tags: [],
      isExplicit: {
        title: false,
        priority: false,
        dueDate: false,
        assignee: false,
        projectName: false,
      },
      confidence: 0.5,
    };

    // Extract title
    for (const pattern of TITLE_PATTERNS) {
      const match = prompt.match(pattern);
      if (match) {
        result.title = match[1].trim();
        result.isExplicit.title = true;
        break;
      }
    }

    // Extract priority
    for (const [priority, pattern] of Object.entries(PRIORITY_KEYWORDS)) {
      if (pattern.test(prompt)) {
        result.priority = priority;
        result.isExplicit.priority = true;
        break;
      }
    }

    // Extract due date
    for (const pattern of DATE_PATTERNS) {
      const match = prompt.match(pattern);
      if (match) {
        result.dueDate = match[1].trim();
        result.isExplicit.dueDate = true;
        break;
      }
    }

    // Extract assignee
    for (const pattern of ASSIGNEE_PATTERNS) {
      const match = prompt.match(pattern);
      if (match) {
        result.assignee = match[1].trim();
        result.isExplicit.assignee = true;
        break;
      }
    }

    // Extract project name
    for (const pattern of PROJECT_PATTERNS) {
      const match = prompt.match(pattern);
      if (match) {
        result.projectName = match[1].trim();
        result.isExplicit.projectName = true;
        break;
      }
    }

    // Extract status
    for (const [status, pattern] of Object.entries(STATUS_KEYWORDS)) {
      if (pattern.test(prompt)) {
        result.status = status;
        break;
      }
    }

    // Calculate confidence
    const explicitCount = Object.values(result.isExplicit).filter(Boolean).length;
    result.confidence = 0.3 + (explicitCount * 0.15);

    logger.info("[NovaPrime-Extractor] Extracted parameters", {
      hasTitle: result.isExplicit.title,
      hasPriority: result.isExplicit.priority,
      hasDueDate: result.isExplicit.dueDate,
      hasAssignee: result.isExplicit.assignee,
      hasProject: result.isExplicit.projectName,
      confidence: result.confidence,
    });

    return result;
  }

  /**
   * Merge extracted parameters with defaults
   * Explicit user values ALWAYS win
   */
  public static mergeWithDefaults(
    extracted: ExtractedParameters,
    defaults: Partial<ExtractedParameters>
  ): ExtractedParameters {
    return {
      title: extracted.isExplicit.title ? extracted.title : (defaults.title ?? extracted.title),
      description: extracted.description ?? defaults.description ?? null,
      priority: extracted.isExplicit.priority ? extracted.priority : (defaults.priority ?? extracted.priority ?? "medium"),
      dueDate: extracted.isExplicit.dueDate ? extracted.dueDate : (defaults.dueDate ?? extracted.dueDate),
      assignee: extracted.isExplicit.assignee ? extracted.assignee : (defaults.assignee ?? extracted.assignee),
      projectName: extracted.isExplicit.projectName ? extracted.projectName : (defaults.projectName ?? extracted.projectName),
      status: extracted.status ?? defaults.status ?? null,
      tags: extracted.tags.length > 0 ? extracted.tags : (defaults.tags ?? []),
      isExplicit: extracted.isExplicit,
      confidence: extracted.confidence,
    };
  }

  /**
   * Validate extracted parameters
   */
  public static validate(params: ExtractedParameters): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.title && params.title.length > 200) {
      errors.push("Title must be 200 characters or less");
    }

    if (params.priority && !["high", "medium", "low"].includes(params.priority)) {
      errors.push("Priority must be high, medium, or low");
    }

    if (params.dueDate) {
      const date = new Date(params.dueDate);
      if (isNaN(date.getTime()) && !["today", "tomorrow", "next week"].includes(params.dueDate.toLowerCase())) {
        errors.push("Invalid date format");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
