export type MemoryType = "USER" | "TEAM" | "WORKSPACE" | "BEHAVIORAL" | "PLANNING_STYLE" | "CADENCE" | "CONVENTIONS" | "PAST_DECISIONS";
export type MemoryTier = "LONG_TERM" | "SHORT_TERM" | "WORKING";

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
    purpose: "User preferences, writing preferences, team conventions, naming standards, workflow habits, planning style, cadence, past decisions",
    examples: [
      "Preferred writing style",
      "Task format preferences",
      "Reporting format preferences",
      "Planning style (detailed vs. high-level)",
      "Sprint cadence (weekly, bi-weekly)",
      "Naming conventions",
      "Past decisions and rationale",
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
      "Unresolved items from conversation",
    ],
  },
  {
    tier: "WORKING",
    storage: "In-memory (per request)",
    purpose: "Immediate context for current request, mental model of workspace, confidence assessment, proactive insights",
    examples: [
      "Current mental model of workspace",
      "Confidence assessment for current request",
      "Proactive insights identified",
      "Workflow plan for current request",
    ],
  },
];

export const MEMORY_TYPES: MemoryDefinition[] = [
  {
    type: "USER",
    description: "Individual user preferences and behavior patterns",
    examples: ["Writing style", "Task format", "Notification preferences", "Preferred response length"],
  },
  {
    type: "TEAM",
    description: "Team-level conventions and workflow norms",
    examples: ["Sprint conventions", "Naming standards", "Approval workflows", "Meeting cadence"],
  },
  {
    type: "WORKSPACE",
    description: "Workspace-wide settings and common structures",
    examples: ["Common project structures", "Dashboard preferences", "Team processes", "Integration preferences"],
  },
  {
    type: "BEHAVIORAL",
    description: "Learned patterns from recurring actions",
    examples: ["Frequently used commands", "Repeated workflows", "Common actions", "Time-of-day patterns"],
  },
  {
    type: "PLANNING_STYLE",
    description: "How the user prefers plans to be structured",
    examples: ["Detailed with subtasks", "High-level milestones", "Kanban-style", "Gantt-style", "Minimal tasks"],
  },
  {
    type: "CADENCE",
    description: "Timing and rhythm of work",
    examples: ["Sprint length", "Review frequency", "Standup schedule", "Deadline preferences", "Working hours"],
  },
  {
    type: "CONVENTIONS",
    description: "Naming and formatting standards",
    examples: ["Task naming format", "Project naming format", "Priority labels", "Status labels", "Tag taxonomy"],
  },
  {
    type: "PAST_DECISIONS",
    description: "Previous decisions and their rationale",
    examples: ["Why a task was created", "Why a project was prioritized", "Why a change was made", "Lessons learned"],
  },
];

export const MEMORY_RULES: string[] = [
  "Nova should remember useful preferences, recurring patterns, and workflow behaviors",
  "Nova should not remember temporary details, outdated context, or irrelevant interactions",
  "Memory retrieval flow: Detect relevant memories → Rank memories → Inject relevant context → Execute task",
  "Only relevant memories should be used — not everything stored",
  "Planning style memory should influence how Nova structures plans",
  "Cadence memory should influence how Nova suggests deadlines and schedules",
  "Convention memory should influence how Nova names tasks, projects, and documents",
  "Past decisions memory should help Nova avoid repeating mistakes and build on successes",
  "Memory should be used naturally — never ask users to repeat information Nova already knows",
];

export const MEMORY_USER_CONTROLS: string[] = [
  "Users must be able to enable memory",
  "Users must be able to disable memory",
  "Users must be able to clear memory",
  "Users must be able to review memory",
  "Users must be able to use temporary sessions",
  "Users remain in control of their memory",
  "Users must be able to delete specific memories",
  "Users must be able to export their memories",
];
