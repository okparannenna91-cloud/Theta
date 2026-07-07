import { prisma } from "../prisma";
import { logger } from "../logger";
import { canAccessProject, canAccessProjectResource } from "../project-permissions";
import { CONTEXT_PRIORITY_HIERARCHY, CONTEXT_RULES, CONTEXT_WINDOW_STRATEGY, getContextPriority, type ContextSource } from "./constitution/context";

export { CONTEXT_PRIORITY_HIERARCHY, CONTEXT_RULES, CONTEXT_WINDOW_STRATEGY, type ContextSource } from "./constitution/context";

const MAX_CONTEXT_TOKENS = 3000;

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

export interface ContextOptions {
  workspaceId: string;
  userId?: string;
  projectId?: string;
  taskId?: string;
  documentId?: string;
}

export interface ResolvedContext {
  task: { title: string; description?: string | null; status: string; priority: string; subtasks: string[] } | null;
  document: { title: string; content?: string | null } | null;
  project: { name: string; description?: string | null } | null;
  sprint: { name: string; status: string | null } | null;
  workspace: { name: string; plan: string } | null;
  user: { name?: string | null } | null;
  priority: number;
}

export class ContextSystem {
  public static async getActiveContext(options: ContextOptions) {
    const { workspaceId, userId, projectId, taskId, documentId } = options;
    

    const [workspace, project, task, document, user] = await Promise.all([
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
        logger.warn(`[ContextSystem] Task ${taskId} filtered: user ${userId} lacks project access`);
      }
    }
    if (document && document.projectId && userId) {
      const hasAccess = await canAccessProjectResource(userId, workspaceId, document.projectId);
      if (!hasAccess) {
        logger.warn(`[ContextSystem] Document ${documentId} filtered: user ${userId} lacks project access`);
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

    let promptString = "ACTIVE EXECUTION CONTEXT:\n";
    if (resolvedContext.task) {
      promptString += `[PRIMARY] ACTIVE TASK (Priority 1):\n- Title: ${resolvedContext.task.title}\n- Description: ${resolvedContext.task.description || "N/A"}\n- Status: ${resolvedContext.task.status}\n- Priority: ${resolvedContext.task.priority}\n- Subtasks: ${resolvedContext.task.subtasks.join(", ") || "None"}\n\n`;
    }
    if (resolvedContext.document) {
      promptString += `[SECONDARY] ACTIVE DOCUMENT (Priority 2):\n- Title: ${resolvedContext.document.title}\n- Snippet: ${resolvedContext.document.content || "N/A"}\n\n`;
    }
    if (resolvedContext.project) {
      promptString += `[TERTIARY] ACTIVE PROJECT (Priority 3):\n- Name: ${resolvedContext.project.name}\n- Description: ${resolvedContext.project.description || "N/A"}\n\n`;
    }
    if (resolvedContext.sprint) {
      promptString += `[QUATERNARY] ACTIVE SPRINT (Priority 4):\n- Name: ${resolvedContext.sprint.name}\n- Status: ${resolvedContext.sprint.status || "N/A"}\n\n`;
    }
    if (resolvedContext.workspace) {
      promptString += `[BASE] ACTIVE WORKSPACE (Priority 5):\n- Name: ${resolvedContext.workspace.name}\n- Plan Tier: ${resolvedContext.workspace.plan}\n\n`;
    }
    if (resolvedContext.user) {
      promptString += `[OPERATOR] ACTIVE USER (Priority 6):\n- Name: ${resolvedContext.user.name || "N/A"}\n`;
    }

    promptString = truncateToBudget(promptString, MAX_CONTEXT_TOKENS);

    return { structured: resolvedContext, promptString };
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
}
