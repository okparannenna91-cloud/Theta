import { prisma } from "../prisma";
import { logger } from "../logger";
import { canAccessProject, canAccessProjectResource } from "../project-permissions";

export type ContextSource = "CURRENT_TASK" | "CURRENT_DOCUMENT" | "CURRENT_PROJECT" | "CURRENT_SPRINT" | "WORKSPACE" | "HISTORICAL_MEMORY" | "CONVERSATION_HISTORY" | "PROACTIVE_INSIGHTS";

export const CONTEXT_PRIORITY_HIERARCHY: Array<{ source: ContextSource; priority: number; description: string; tokenBudget: number }> = [
  { source: "CURRENT_TASK", priority: 1, description: "Current task", tokenBudget: 500 },
  { source: "CURRENT_DOCUMENT", priority: 2, description: "Current document", tokenBudget: 400 },
  { source: "CURRENT_PROJECT", priority: 3, description: "Project goals", tokenBudget: 400 },
  { source: "CURRENT_SPRINT", priority: 4, description: "Sprint progress", tokenBudget: 300 },
  { source: "WORKSPACE", priority: 5, description: "Workspace settings", tokenBudget: 300 },
  { source: "CONVERSATION_HISTORY", priority: 6, description: "Recent conversation", tokenBudget: 500 },
  { source: "HISTORICAL_MEMORY", priority: 7, description: "User preferences", tokenBudget: 300 },
];

export const CONTEXT_RULES: string[] = [
  "Use available context rather than asking for it",
  "Avoid redundant questions",
  "Adapt responses to current state",
  "Never ignore active context",
];

export const CONTEXT_WINDOW_STRATEGY: string[] = [
  "Total context budget: 4000 tokens",
  "Priority determines inclusion order",
  "High-priority context always included first",
];

export const PROACTIVE_INSIGHT_TYPES: string[] = [
  "DEADLINE_RISK: Tasks approaching deadline",
  "UNASSIGNED_WORK: Tasks without assignees",
  "BLOCKED_TASKS: Tasks blocked by dependencies",
  "SPRINT_OVERLOAD: Sprint capacity exceeded",
];

export function getContextPriority(source: ContextSource): number {
  const definition = CONTEXT_PRIORITY_HIERARCHY.find(c => c.source === source);
  return definition?.priority ?? 5;
}

export function getTokenBudget(source: ContextSource): number {
  const definition = CONTEXT_PRIORITY_HIERARCHY.find(c => c.source === source);
  return definition?.tokenBudget ?? 300;
}

const TOTAL_TOKEN_BUDGET_DEFAULT = Number(process.env.NOVA_TOKEN_BUDGET) || 4000;

/**
 * Dynamic token budget based on model and request complexity.
 * Different models support different context windows.
 */
function getTokenBudgetForModel(model: string): number {
  const budgets: Record<string, number> = {
    "gemini-2.5-flash": 8000,
    "gpt-4o": 12000,
    "claude-sonnet-4-20250514": 10000,
    "command-a-03-2025": 6000,
  };
  return budgets[model] || TOTAL_TOKEN_BUDGET_DEFAULT;
}

/**
 * Dynamic token budget based on request complexity and model.
 * Simple tasks get less context, complex tasks get more.
 */
function getTokenBudgetForRoute(contextDepth: "minimal" | "standard" | "full", model?: string): number {
  const modelBudget = model ? getTokenBudgetForModel(model) : TOTAL_TOKEN_BUDGET_DEFAULT;
  
  switch (contextDepth) {
    case "minimal": return Math.min(1500, modelBudget);
    case "standard": return modelBudget;
    case "full": return Math.min(modelBudget * 1.5, modelBudget + 2000);
    default: return modelBudget;
  }
}

const workspaceCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5000;

function getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = workspaceCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.data as T);
  }
  return fetcher().then(data => {
    workspaceCache.set(key, { data, timestamp: Date.now() });
    return data;
  });
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateToBudget(text: string, budget: number): string {
  const tokens = estimateTokens(text);
  if (tokens <= budget) return text;
  const ratio = budget / tokens;
  const chars = Array.from(text);
  return chars.slice(0, Math.floor(chars.length * ratio)).join("") + "\n[context truncated to fit token budget]";
}

/**
 * Sanitize user-controlled content before injecting into LLM prompts.
 * Strips common prompt injection patterns and wraps content in delimiters.
 */
function sanitizeUserContent(content: string): string {
  if (!content) return "";
  // Strip known injection patterns
  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|commands?|directions?|prompts?)/gi,
    /forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|commands?|directions?|prompts?)/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|commands?|directions?|prompts?)/gi,
    /you\s+are\s+(now|no\s+longer)\s+/gi,
    /system\s+prompt/gi,
    /new\s+instructions?:\s*/gi,
    /override\s+(mode|protocol|instructions)/gi,
    /act\s+as\s+(if\s+you\s+are|though\s+you\s+are)\s+/gi,
    /your\s+(new|updated|revised)\s+(instructions?|role|persona)/gi,
    /output\s+(only|just|exclusively)\s+/gi,
    /do\s+not\s+(output|print|include|display)\s+/gi,
    /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/gi,
    /<\|system\|>|<\|user\|>|<\|assistant\|>/gi,
  ];
  let sanitized = content;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[FILTERED]");
  }
  // Wrap in delimiters to prevent breakout
  return `<<<USER_CONTENT_START>>>\n${sanitized}\n<<<USER_CONTENT_END>>>`;
}

export interface ContextOptions {
  workspaceId: string;
  userId?: string;
  projectId?: string;
  taskId?: string;
  documentId?: string;
  contextDepth?: "minimal" | "standard" | "full";
  model?: string;
}

export interface ResolvedContext {
  task: { title: string; description?: string | null; status: string; priority: string; subtasks: string[] } | null;
  document: { title: string; content?: string | null } | null;
  project: { name: string; description?: string | null } | null;
  sprint: { name: string; status: string | null; progress?: number; capacity?: number } | null;
  workspace: { name: string; plan: string } | null;
  user: { name?: string | null } | null;
  priority: number;
  crossProjectSummary?: string;
}

export interface ProactiveInsight {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
  affectedItems: string[];
}

export class ContextSystem {
  /**
   * Get active context with token budgeting
   */
  public static async getActiveContext(options: ContextOptions) {
    const { workspaceId, userId, projectId, taskId, documentId } = options;
    
    let [workspace, project, task, document, user] = await Promise.all([
      getCachedOrFetch(`workspace:${workspaceId}`, () => prisma.workspace.findUnique({ where: { id: workspaceId } })),
      projectId ? getCachedOrFetch(`project:${projectId}`, async () => {
        if (userId) {
          const access = await canAccessProject(userId, projectId, workspaceId);
          if (!access.hasAccess) return null;
        }
        return prisma.project.findUnique({ where: { id: projectId } });
      }) : null,
      taskId ? prisma.task.findFirst({ where: { id: taskId, workspaceId }, include: { subtasks: true } }) : null,
      documentId ? prisma.document.findFirst({ where: { id: documentId, workspaceId } }) : null,
      userId ? prisma.user.findUnique({ where: { id: userId }, select: { name: true } }) : null,
    ]);

    if (task && task.projectId && userId) {
      const hasAccess = await canAccessProjectResource(userId, workspaceId, task.projectId);
      if (!hasAccess) {
        logger.warn(`[ContextSystem] Task ${taskId} excluded: user ${userId} lacks project access`);
        task = null;
      }
    }
    if (document && document.projectId && userId) {
      const hasAccess = await canAccessProjectResource(userId, workspaceId, document.projectId);
      if (!hasAccess) {
        logger.warn(`[ContextSystem] Document ${documentId} excluded: user ${userId} lacks project access`);
        document = null;
      }
    }

    const resolvedContext: ResolvedContext = {
      task: task ? {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        subtasks: task.subtasks?.map((s: { title: string }) => s.title) || [],
      } : null,
      document: document ? { title: document.title, content: document.content?.substring(0, 1000) } : null,
      project: project ? { name: project.name, description: project.description } : null,
      sprint: null,
      workspace: workspace ? { name: workspace.name, plan: workspace.plan } : null,
      user: user ? { name: user.name } : null,
      priority: taskId ? 1 : documentId ? 2 : projectId ? 3 : 5,
    };

    // Load sprint data if we have a project
    if (projectId) {
      try {
        const activeSprint = await prisma.sprint.findFirst({
          where: { projectId, status: "active" },
          select: { name: true, status: true },
        });
        if (activeSprint) {
          resolvedContext.sprint = { name: activeSprint.name, status: activeSprint.status };
        }
      } catch {
        // Sprint model may not exist
      }
    }

    // Load cross-project summary (other projects in workspace)
    if (options.contextDepth === "full" && projectId) {
      try {
        const otherProjects = await prisma.project.findMany({
          where: { workspaceId, id: { not: projectId } },
          select: { name: true },
          take: 5,
        });
        if (otherProjects.length > 0) {
          resolvedContext.crossProjectSummary = otherProjects.map(p => p.name).join(", ");
        }
      } catch {
        // Ignore
      }
    }

    // Build context with token budgeting
    const TOTAL_TOKEN_BUDGET = getTokenBudgetForRoute(options.contextDepth || "standard", options.model);
    let promptString = "ACTIVE EXECUTION CONTEXT:\n";
    let remainingTokens = TOTAL_TOKEN_BUDGET;

    // Add context in priority order, respecting token budgets
    for (const sourceDef of CONTEXT_PRIORITY_HIERARCHY) {
      const tokenBudget = getTokenBudget(sourceDef.source);
      const actualBudget = Math.min(tokenBudget, remainingTokens);

      if (actualBudget <= 0) break;

      let contextText = "";
      switch (sourceDef.source) {
        case "CURRENT_TASK":
          if (resolvedContext.task) {
            contextText = `[PRIMARY] ACTIVE TASK (Priority 1):\n- Title: ${sanitizeUserContent(resolvedContext.task.title)}\n- Description: ${sanitizeUserContent(resolvedContext.task.description || "N/A")}\n- Status: ${resolvedContext.task.status}\n- Priority: ${resolvedContext.task.priority}\n- Subtasks: ${resolvedContext.task.subtasks.map(s => sanitizeUserContent(s)).join(", ") || "None"}\n\n`;
          }
          break;
        case "CURRENT_DOCUMENT":
          if (resolvedContext.document) {
            contextText = `[SECONDARY] ACTIVE DOCUMENT (Priority 2):\n- Title: ${sanitizeUserContent(resolvedContext.document.title)}\n- Snippet: ${sanitizeUserContent(resolvedContext.document.content || "N/A")}\n\n`;
          }
          break;
        case "CURRENT_PROJECT":
          if (resolvedContext.project) {
            contextText = `[TERTIARY] ACTIVE PROJECT (Priority 3):\n- Name: ${sanitizeUserContent(resolvedContext.project.name)}\n- Description: ${sanitizeUserContent(resolvedContext.project.description || "N/A")}\n\n`;
          }
          break;
        case "CURRENT_SPRINT":
          if (resolvedContext.sprint) {
            contextText = `[QUATERNARY] ACTIVE SPRINT (Priority 4):\n- Name: ${resolvedContext.sprint.name}\n- Status: ${resolvedContext.sprint.status || "N/A"}\n\n`;
          }
          break;
        case "WORKSPACE":
          if (resolvedContext.workspace) {
            contextText = `[BASE] ACTIVE WORKSPACE (Priority 5):\n- Name: ${sanitizeUserContent(resolvedContext.workspace.name)}\n- Plan Tier: ${resolvedContext.workspace.plan}\n\n`;
          }
          break;
        default:
          break;
      }

      if (contextText) {
        const truncated = truncateToBudget(contextText, actualBudget);
        promptString += truncated;
        remainingTokens -= estimateTokens(truncated);
      }
    }

    // Add user context at the end
    if (resolvedContext.user) {
      promptString += `[OPERATOR] ACTIVE USER (Priority 6):\n- Name: ${resolvedContext.user.name || "N/A"}\n`;
    }

    // Add cross-project summary
    if (resolvedContext.crossProjectSummary) {
      promptString += `[CROSS-PROJECT] Other projects in workspace: ${sanitizeUserContent(resolvedContext.crossProjectSummary)}\n`;
    }

    return { structured: resolvedContext, promptString };
  }

  /**
   * Get proactive insights based on workspace state
   */
  public static async getProactiveInsights(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    try {
      // Check for overdue tasks
      const overdueTasks = await prisma.task.findMany({
        where: {
          workspaceId,
          dueDate: { lt: new Date() },
          status: { notIn: ["done", "completed", "cancelled"] },
        },
        select: { title: true, dueDate: true },
      });

      if (overdueTasks.length > 0) {
        insights.push({
          type: "DEADLINE_RISK",
          severity: overdueTasks.length > 3 ? "high" : "medium",
          message: `${overdueTasks.length} tasks are overdue`,
          affectedItems: overdueTasks.map(t => t.title),
        });
      }

      // Check for unassigned tasks
      const unassignedTasks = await prisma.task.findMany({
        where: {
          workspaceId,
          userId: undefined,
          status: { notIn: ["done", "completed", "cancelled"] },
        },
        select: { title: true },
      });

      if (unassignedTasks.length > 0) {
        insights.push({
          type: "UNASSIGNED_WORK",
          severity: unassignedTasks.length > 5 ? "high" : "medium",
          message: `${unassignedTasks.length} tasks are unassigned`,
          affectedItems: unassignedTasks.map(t => t.title),
        });
      }

      // Check for blocked tasks
      const blockedTasks = await prisma.task.findMany({
        where: {
          workspaceId,
          status: "blocked",
        },
        select: { title: true },
      });

      if (blockedTasks.length > 0) {
        insights.push({
          type: "BLOCKED_TASKS",
          severity: blockedTasks.length > 2 ? "high" : "medium",
          message: `${blockedTasks.length} tasks are blocked`,
          affectedItems: blockedTasks.map(t => t.title),
        });
      }

      // Check for stalled tasks (no update in 4+ days)
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      const stalledTasks = await prisma.task.findMany({
        where: {
          workspaceId,
          status: "in-progress",
          updatedAt: { lt: fourDaysAgo },
        },
        select: { title: true, updatedAt: true },
      });

      if (stalledTasks.length > 0) {
        insights.push({
          type: "STALLED_PROGRESS",
          severity: stalledTasks.length > 2 ? "high" : "medium",
          message: `${stalledTasks.length} tasks haven't been updated in 4+ days`,
          affectedItems: stalledTasks.map(t => t.title),
        });
      }

    } catch (error) {
      logger.warn("[ContextSystem] Failed to get proactive insights:", error);
    }

    return insights;
  }

  public static getContextRules() {
    return { hierarchy: CONTEXT_PRIORITY_HIERARCHY, rules: CONTEXT_RULES, windowStrategy: CONTEXT_WINDOW_STRATEGY };
  }

  public static async saveSnapshot(
    workspaceId: string,
    userId: string,
    conversationId: string | undefined,
    source: string = "auto"
  ): Promise<string | null> {
    try {
      const { structured, promptString } = await this.getActiveContext({ workspaceId, userId });
      const tokenCount = promptString.split(/\s+/).length;

      
      const snapshot = await prisma.aiContextSnapshot.create({
        data: {
          workspaceId,
          userId,
          conversationId: conversationId || null,
          contextData: JSON.parse(JSON.stringify(structured)),
          tokenCount,
          source,
        },
      });
      return snapshot.id;
    } catch (error) {
      logger.warn("[ContextSystem] Failed to save snapshot:", error);
      return null;
    }
  }

  public static async getSnapshots(
    workspaceId: string,
    options: { conversationId?: string; limit?: number } = {}
  ): Promise<Array<{ id: string; source: string; tokenCount: number; createdAt: Date }>> {
    try {
      
      const snapshots = await prisma.aiContextSnapshot.findMany({
        where: {
          workspaceId,
          ...(options.conversationId ? { conversationId: options.conversationId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: options.limit || 20,
        select: { id: true, source: true, tokenCount: true, createdAt: true },
      });
      return snapshots;
    } catch (error) {
      logger.warn("[ContextSystem] Failed to get snapshots:", error);
      return [];
    }
  }

  public static async loadWorkspaceOverview(workspaceId: string): Promise<string> {
    try {
      const [projects, taskCounts, memberCount, recentActivity, teamWorkload] = await Promise.all([
        prisma.project.findMany({
          where: { workspaceId },
          select: { id: true, name: true },
          take: 10,
        }),
        prisma.task.groupBy({
          by: ["status"],
          where: { workspaceId },
          _count: { id: true },
        }),
        prisma.workspaceMember.count({
          where: { workspaceId, status: "active" },
        }),
        prisma.task.findMany({
          where: { workspaceId },
          select: { title: true, status: true, priority: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 5,
        }),
        // Team workload: count active tasks per member
        prisma.task.groupBy({
          by: ["userId"],
          where: {
            workspaceId,
            status: { notIn: ["done", "completed", "cancelled"] },
          },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
      ]);

      const statusCounts: Record<string, number> = {};
      for (const group of taskCounts) {
        statusCounts[group.status] = group._count.id;
      }
      const totalTasks = Object.values(statusCounts).reduce((a, b) => a + b, 0);

      const overdueCount = await prisma.task.count({
        where: {
          workspaceId,
          dueDate: { lt: new Date() },
          status: { notIn: ["done", "completed", "cancelled"] },
        },
      });

      const sections: string[] = ["[WORKSPACE OVERVIEW]"];

      if (projects.length > 0) {
        sections.push(`Projects (${projects.length}): ${projects.map(p => p.name).join(", ")}`);
      } else {
        sections.push("Projects: None");
      }

      sections.push(`Tasks: ${totalTasks} total — ${statusCounts["todo"] || 0} todo, ${statusCounts["in-progress"] || statusCounts["in_progress"] || 0} in progress, ${statusCounts["done"] || statusCounts["completed"] || 0} done`);
      if (overdueCount > 0) {
        sections.push(`Overdue tasks: ${overdueCount}`);
      }

      sections.push(`Team members: ${memberCount}`);

      if (teamWorkload.length > 0) {
        const workloadLines = teamWorkload.map(
          (w) => `  - ${w.userId}: ${w._count.id} active tasks`
        );
        sections.push(`Team workload:\n${workloadLines.join("\n")}`);
      }

      // Calendar deadlines: upcoming tasks due in the next 7 days
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      const upcomingDeadlines = await prisma.task.findMany({
        where: {
          workspaceId,
          dueDate: { gte: new Date(), lte: oneWeekFromNow },
          status: { notIn: ["done", "completed", "cancelled"] },
        },
        select: { title: true, dueDate: true, priority: true },
        orderBy: { dueDate: "asc" },
        take: 10,
      });
      if (upcomingDeadlines.length > 0) {
        sections.push("Upcoming deadlines (next 7 days):");
        for (const task of upcomingDeadlines) {
          const daysUntil = Math.ceil((task.dueDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          sections.push(`  - "${task.title}" due in ${daysUntil}d (${task.priority})`);
        }
      }

      if (recentActivity.length > 0) {
        sections.push("Recent activity:");
        for (const task of recentActivity) {
          sections.push(`  - "${task.title}" [${task.status}] (${task.priority} priority)`);
        }
      }

      return sections.join("\n");
    } catch (error) {
      logger.warn("[ContextSystem] Failed to load workspace overview:", error);
      return "";
    }
  }
}
