export type InterventionLevel = 0 | 1 | 2 | 3;

export type InterventionCategory =
  | "DEADLINE_RISK"
  | "BLOCKER_DETECTED"
  | "WORKLOAD_IMBALANCE"
  | "FORGOTTEN_WORK"
  | "PROJECT_HEALTH"
  | "SPRINT_RISK"
  | "PATTERN_INSIGHT"
  | "OPPORTUNITY"
  | "COACHING"
  | "SUMMARY";

export type EventType =
  | "task:created"
  | "task:updated"
  | "task:completed"
  | "task:deleted"
  | "task:assigned"
  | "task:overdue"
  | "task:blocked"
  | "task:unblocked"
  | "project:created"
  | "project:updated"
  | "project:completed"
  | "sprint:started"
  | "sprint:updated"
  | "member:joined"
  | "member:left"
  | "comment:created"
  | "chat:message"
  | "deadline:approaching"
  | "deadline:passed"
  | "dependency:created"
  | "dependency:resolved"
  | "workload:changed"
  | "workspace:updated"
  | "page:viewed"
  | "heartbeat"
  | "morning"
  | "evening"
  | "manual"
  | "TASK_CREATED"
  | "TASK_STATUS_UPDATED"
  | "TASK_COMPLETED"
  | "TASK_ASSIGNED"
  | "TASK_PRIORITY_CHANGED"
  | "DUE_DATE_PASSED"
  | "PROJECT_CREATED"
  | "SPRINT_STARTED"
  | "SPRINT_COMPLETED"
  | "FORM_SUBMITTED"
  | "DOCUMENT_UPDATED"
  | "USER_INVITED"
  | "MEMBER_ADDED";

export interface WorkspaceEvent {
  type: EventType;
  workspaceId: string;
  userId?: string;
  taskId?: string;
  projectId?: string;
  sprintId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ObservationContext {
  workspaceId: string;
  event: WorkspaceEvent;
  workspace?: {
    id: string;
    name: string;
    plan: string;
    memberCount: number;
    projectCount: number;
    taskCount: number;
    createdAt: Date;
    daysSinceCreation: number;
    overdueCount: number;
  };
  project?: {
    id: string;
    name: string;
    taskCount: number;
    completionRate: number;
    overdueCount: number;
    blockedCount: number;
    daysSinceLastUpdate: number;
    isInactive: boolean;
    memberCount: number;
  };
  task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    assigneeIds: string[];
    isBlocked: boolean;
    daysOverdue: number;
    daysSinceCreation: number;
    daysSinceLastUpdate: number;
    dependencyCount: number;
    blockerCount: number;
    blockingCount: number;
    hasSubtasks: boolean;
    subtaskCompletionRate: number;
    projectId: string | null;
    sprintId: string | null;
  };
  user?: {
    id: string;
    name: string | null;
    role: string;
    activeTaskCount: number;
    overdueTaskCount: number;
    completedTaskCount7d: number;
    totalCompletedTaskCount: number;
    isNewMember: boolean;
    daysSinceJoined: number;
  };
  teamWorkload?: Array<{
    userId: string;
    name: string | null;
    activeTasks: number;
    overdueCount: number;
    completedLast7d: number;
    capacity: number;
    role: string;
  }>;
  recentActivity?: Array<{
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    createdAt: Date;
  }>;
  sprint?: {
    id: string;
    name: string;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    totalTasks: number;
    completedTasks: number;
    remainingDays: number;
    totalStoryPoints: number;
    completedStoryPoints: number;
    tasksAddedAfterStart: number;
    velocityPerDay: number;
    isAtRisk: boolean;
  };
  chatMessage?: {
    id: string;
    content: string;
    userId: string;
    userName: string | null;
    channelId: string;
    mentions: string[];
    isQuestion: boolean;
    isReply: boolean;
    parentMessageId: string | null;
    createdAt: Date;
  };
  memory?: {
    recentDecisions: Array<{ topic: string; decision: string; timestamp: Date }>;
    userPreferences: Record<string, string>;
    workspacePatterns: Array<{ pattern: string; confidence: number; occurrences: number }>;
    recurringIssues: Array<{ issue: string; frequency: string; lastOccurrence: Date }>;
    userHistory: Array<{ action: string; entityType: string; timestamp: Date }>;
    similarPastSituations: Array<{ situation: string; outcome: string; timestamp: Date }>;
  };
  scheduler?: {
    isMorning: boolean;
    isEvening: boolean;
    timeSinceLastBriefing: number;
    dayOfWeek: number;
    hourOfDay: number;
  };
}

export interface PriorityScore {
  score: number;
  label: "critical" | "high" | "medium" | "low";
  reasoning: string;
  factors: Array<{ name: string; contribution: number; description: string }>;
}

export interface UrgencyScore {
  score: number;
  label: "immediate" | "soon" | "this_week" | "this_month" | "low";
  reasoning: string;
  factors: Array<{ name: string; contribution: number; description: string }>;
  suggestedActionWindow: string;
}

export interface DetectedPattern {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  confidence: number;
  priority: number;
  urgency: number;
  affectedItems: string[];
  suggestedAction: string;
  source: string;
}

export interface InterventionScore {
  level: InterventionLevel;
  importance: number;
  urgency: number;
  relevance: number;
  confidence: number;
  reasoning: string;
  priorityScore: PriorityScore;
  urgencyScore: UrgencyScore;
  wouldSpeak: boolean;
}

export interface Intervention {
  id: string;
  level: InterventionLevel;
  category: InterventionCategory;
  title: string;
  message: string;
  workspaceId: string;
  targetUserId?: string;
  targetProjectId?: string;
  targetTaskId?: string;
  targetSprintId?: string;
  patterns: DetectedPattern[];
  score: InterventionScore;
  suggestedAction?: string;
  dismissed: boolean;
  createdAt: Date;
  source: "event" | "heartbeat" | "scheduled" | "chat";
}

export interface LLMDecision {
  shouldSpeak: boolean;
  level: InterventionLevel;
  message: string;
  reasoning: string;
  category: InterventionCategory;
  tone: "neutral" | "urgent" | "supportive" | "warning";
}

export interface BriefingContext {
  type: "morning" | "evening" | "weekly";
  workspaceId: string;
  userId?: string;
  date: Date;
  summary: string;
  keyMetrics: BriefingMetric[];
  topInsights: string[];
  focusAreas: string[];
  achievements: string[];
  risks: string[];
  suggestions: string[];
}

export interface BriefingMetric {
  label: string;
  value: string | number;
  trend: "up" | "down" | "stable";
  change?: string;
}

export interface ChatObservationDecision {
  shouldParticipate: boolean;
  confidence: number;
  reasoning: string;
  suggestedMessage?: string;
  contributionType: "answer" | "context" | "warning" | "insight" | null;
}

export type InsightType =
  | "DEADLINE_RISK"
  | "UNASSIGNED_WORK"
  | "BLOCKED_TASKS"
  | "SPRINT_OVERLOAD"
  | "DUPLICATE_WORK"
  | "MISSING_DEPENDENCIES"
  | "STALLED_PROGRESS"
  | "CAPACITY_IMBALANCE"
  | "UPCOMING_MILESTONE"
  | "RECENT_ACHIEVEMENT"
  | "PROJECT_INACTIVITY"
  | "DEPENDENCY_CASCADE"
  | "FORGOTTEN_WORK"
  | "RECURRING_FAILURE"
  | "SCOPE_CREEP"
  | "VELOCITY_DROP"
  | "MEMBER_INACTIVITY"
  | "SOLO_FOUNDER_RISK"
  | "COMPLETION_TREND"
  | "WORKLOAD_COLLAPSE";

export type InsightSeverity = "low" | "medium" | "high" | "critical";

export type EventHandler = (event: WorkspaceEvent) => void | Promise<void>;
