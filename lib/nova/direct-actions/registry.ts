export type DirectActionName = "create_task" | "list_tasks" | "update_task" | "complete_task" | "create_project" | "list_projects";

export const ALL_DIRECT_ACTIONS: DirectActionName[] = [
  "create_task", "list_tasks", "update_task", "complete_task", "create_project", "list_projects",
];

export interface ActionMatch {
  action: DirectActionName;
  confidence: number;
  params: Record<string, string | undefined>;
}

interface Pattern {
  regex: RegExp;
  confidence: number;
  paramExtract: (match: RegExpMatchArray) => Record<string, string | undefined>;
}

const QUOTED = '"([^"]+)"';
const RAW_TITLE = '(.+?)';
const UNTIL_KEYWORD = '(.+?)(?=\\s+(?:in\\s+(?:project|the\\s+project)|status\\s+to|priority\\s+to|with\\s+status)\\b|$)';
const UNTIL_END = '(.+?)$';

const ACTION_PATTERNS: Record<DirectActionName, Pattern[]> = {
  create_task: [
    {
      regex: new RegExp(`^create\\s+a\\s+task\\s+(?:called\\s+)?${QUOTED}$`, 'i'),
      confidence: 1.0,
      paramExtract: (m) => ({ title: m[1] }),
    },
    {
      regex: new RegExp(`^create\\s+(?:a\\s+)?task\\s+${UNTIL_KEYWORD}`, 'i'),
      confidence: 0.95,
      paramExtract: (m) => ({ title: m[1].trim() }),
    },
    {
      regex: new RegExp(`^add\\s+(?:a\\s+)?task\\s+${QUOTED}$`, 'i'),
      confidence: 0.95,
      paramExtract: (m) => ({ title: m[1] }),
    },
    {
      regex: new RegExp(`^new\\s+task\\s+(?:named\\s+)?${QUOTED}$`, 'i'),
      confidence: 0.9,
      paramExtract: (m) => ({ title: m[1] }),
    },
    {
      regex: new RegExp(`^add\\s+(?:a\\s+)?task\\s+${UNTIL_END}`, 'i'),
      confidence: 0.85,
      paramExtract: (m) => ({ title: m[1].trim() }),
    },
  ],
  list_tasks: [
    {
      regex: /^(?:show|list|view|get)\s+(?:my\s+)?tasks\s*(?:in\s+(?:the\s+)?project\s+"([^"]+)")?\s*$/i,
      confidence: 1.0,
      paramExtract: (m) => (m[1] ? { projectName: m[1] } : {}),
    },
    {
      regex: /^(?:show|list|view|get)\s+(?:my\s+)?tasks\s*(?:in\s+(?:the\s+)?project\s+(.+?))?\s*$/i,
      confidence: 0.9,
      paramExtract: (m) => (m[1] ? { projectName: m[1].trim() } : {}),
    },
    {
      regex: /^(?:what\s+(?:are|do\s+I\s+have)\s+(?:my\s+)?tasks|tasks\s+(?:list|show))\s*$/i,
      confidence: 0.85,
      paramExtract: () => ({}),
    },
  ],
  update_task: [
    {
      regex: new RegExp(`^update\\s+task\\s+${QUOTED}\\s+(?:status\\s+to\\s+|with\\s+status\\s+)(.+?)$`, 'i'),
      confidence: 1.0,
      paramExtract: (m) => ({ title: m[1], status: m[2].trim() }),
    },
    {
      regex: new RegExp(`^change\\s+task\\s+${QUOTED}\\s+priority\\s+to\\s+(.+?)$`, 'i'),
      confidence: 1.0,
      paramExtract: (m) => ({ title: m[1], priority: m[2].trim() }),
    },
    {
      regex: new RegExp(`^update\\s+${QUOTED}\\s+(?:status\\s+to\\s+|with\\s+status\\s+)(.+?)$`, 'i'),
      confidence: 0.9,
      paramExtract: (m) => ({ title: m[1], status: m[2].trim() }),
    },
    {
      regex: new RegExp(`^(?:update|change)\\s+task\\s+${UNTIL_KEYWORD}\\s+status\\s+to\\s+(.+?)$`, 'i'),
      confidence: 0.85,
      paramExtract: (m) => ({ title: m[1].trim(), status: m[2].trim() }),
    },
  ],
  complete_task: [
    {
      regex: new RegExp(`^mark\\s+${QUOTED}\\s+as\\s+(?:complete|done)$`, 'i'),
      confidence: 1.0,
      paramExtract: (m) => ({ title: m[1] }),
    },
    {
      regex: new RegExp(`^complete\\s+task\\s+${QUOTED}$`, 'i'),
      confidence: 1.0,
      paramExtract: (m) => ({ title: m[1] }),
    },
    {
      regex: new RegExp(`^mark\\s+${UNTIL_END}\\s+as\\s+(?:complete|done)$`, 'i'),
      confidence: 0.9,
      paramExtract: (m) => ({ title: m[1].trim() }),
    },
    {
      regex: new RegExp(`^(?:set|mark)\\s+${QUOTED}\\s+done$`, 'i'),
      confidence: 0.9,
      paramExtract: (m) => ({ title: m[1] }),
    },
  ],
  create_project: [
    {
      regex: new RegExp(`^create\\s+a\\s+project\\s+(?:called\\s+)?${QUOTED}$`, 'i'),
      confidence: 1.0,
      paramExtract: (m) => ({ name: m[1] }),
    },
    {
      regex: new RegExp(`^create\\s+(?:a\\s+)?project\\s+${UNTIL_END}`, 'i'),
      confidence: 0.95,
      paramExtract: (m) => ({ name: m[1].trim() }),
    },
    {
      regex: new RegExp(`^new\\s+project\\s+(?:named\\s+)?${QUOTED}$`, 'i'),
      confidence: 0.9,
      paramExtract: (m) => ({ name: m[1] }),
    },
  ],
  list_projects: [
    {
      regex: /^(?:show|list|view|get)\s+(?:my\s+)?projects\s*$/i,
      confidence: 1.0,
      paramExtract: () => ({}),
    },
    {
      regex: /^(?:what\s+(?:are|do\s+I\s+have)\s+(?:my\s+)?projects|projects\s+(?:list|show))\s*$/i,
      confidence: 0.85,
      paramExtract: () => ({}),
    },
  ],
};

export function matchIntent(prompt: string): ActionMatch | null {
  const trimmed = prompt.trim();
  let bestMatch: ActionMatch | null = null;

  for (const [action, patterns] of Object.entries(ACTION_PATTERNS)) {
    for (const pattern of patterns) {
      const match = trimmed.match(pattern.regex);
      if (match) {
        const params = pattern.paramExtract(match);
        if (!bestMatch || pattern.confidence > bestMatch.confidence) {
          bestMatch = { action: action as DirectActionName, confidence: pattern.confidence, params };
        }
      }
    }
  }

  return bestMatch;
}

export function confidenceLabel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
}
