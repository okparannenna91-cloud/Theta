export type MemoryType = "USER" | "TEAM" | "WORKSPACE" | "BEHAVIORAL";
export type MemoryTier = "LONG_TERM" | "SHORT_TERM";

export interface MemoryCategory {
  tier: MemoryTier;
  storage: string;
  purpose: string;
  examples: string[];
}

export interface MemoryDefinition {
  type: MemoryType;
  description: string;
  examples: string[];
}

export const MEMORY_TIERS: MemoryCategory[] = [
  {
    tier: "LONG_TERM",
    storage: "Mem0 + Prisma (AiMemory model)",
    purpose: "User preferences, writing preferences, team conventions, naming standards, workflow habits",
    examples: [
      "Preferred writing style",
      "Task format preferences",
      "Reporting format preferences",
    ],
  },
  {
    tier: "SHORT_TERM",
    storage: "Upstash Redis (24hr TTL)",
    purpose: "Session state, active context, recent conversations, temporary workspace information",
    examples: [
      "Current session conversation history",
      "Active project context",
      "Recent commands",
    ],
  },
];

export const MEMORY_TYPES: MemoryDefinition[] = [
  {
    type: "USER",
    description: "Individual user preferences and behavior patterns",
    examples: ["Writing style", "Task format", "Notification preferences"],
  },
  {
    type: "TEAM",
    description: "Team-level conventions and workflow norms",
    examples: ["Sprint conventions", "Naming standards", "Approval workflows"],
  },
  {
    type: "WORKSPACE",
    description: "Workspace-wide settings and common structures",
    examples: ["Common project structures", "Dashboard preferences", "Team processes"],
  },
  {
    type: "BEHAVIORAL",
    description: "Learned patterns from recurring actions",
    examples: ["Frequently used commands", "Repeated workflows", "Common actions"],
  },
];

export const MEMORY_RULES: string[] = [
  "Nova should remember useful preferences, recurring patterns, and workflow behaviors",
  "Nova should not remember temporary details, outdated context, or irrelevant interactions",
  "Memory retrieval flow: Detect relevant memories → Rank memories → Inject relevant context → Execute task",
  "Only relevant memories should be used — not everything stored",
];

export const MEMORY_USER_CONTROLS: string[] = [
  "Users must be able to enable memory",
  "Users must be able to disable memory",
  "Users must be able to clear memory",
  "Users must be able to review memory",
  "Users must be able to use temporary sessions",
  "Users remain in control of their memory",
];
