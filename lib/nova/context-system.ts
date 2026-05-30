import { getPrismaClient } from "../prisma";
import { CONTEXT_PRIORITY_HIERARCHY, CONTEXT_RULES, CONTEXT_WINDOW_STRATEGY, getContextPriority, type ContextSource } from "./constitution/context";

export { CONTEXT_PRIORITY_HIERARCHY, CONTEXT_RULES, CONTEXT_WINDOW_STRATEGY, type ContextSource } from "./constitution/context";

export interface ContextOptions {
  workspaceId: string;
  userId?: string;
  projectId?: string;
  taskId?: string;
  documentId?: string;
  sprintId?: string;
}

export interface ResolvedContext {
  task: { title: string; description?: string | null; status: string; priority: string; subtasks: string[] } | null;
  document: { title: string; content?: string | null } | null;
  project: { name: string; description?: string | null } | null;
  sprint: { name: string; status?: string } | null;
  workspace: { name: string; plan: string } | null;
  user: { name?: string | null; email: string } | null;
  priority: number;
}

export class ContextSystem {
  public static async getActiveContext(options: ContextOptions) {
    const { workspaceId, userId, projectId, taskId, documentId, sprintId } = options;
    const db = getPrismaClient(workspaceId);

    let sprintData: { name: string; status?: string } | null = null;
    if (sprintId) {
      try {
        const s = await (db as any).sprint?.findUnique?.({ where: { id: sprintId } });
        if (s) sprintData = { name: s.name, status: s.status };
      } catch { /* sprint model may not exist */ }
    }

    const [workspace, project, task, document, user] = await Promise.all([
      db.workspace.findUnique({ where: { id: workspaceId } }),
      projectId ? db.project.findUnique({ where: { id: projectId } }) : null,
      taskId ? db.task.findUnique({ where: { id: taskId }, include: { subtasks: true } }) : null,
      documentId ? db.document.findUnique({ where: { id: documentId } }) : null,
      userId ? db.user.findUnique({ where: { id: userId } }) : null,
    ]);

    const resolvedContext: ResolvedContext = {
      task: task ? {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        subtasks: task.subtasks?.map((s: any) => s.title) || [],
      } : null,
      document: document ? { title: document.title, content: document.content?.substring(0, 1000) } : null,
      project: project ? { name: project.name, description: project.description } : null,
      sprint: sprintData,
      workspace: workspace ? { name: workspace.name, plan: workspace.plan } : null,
      user: user ? { name: user.name, email: user.email } : null,
      priority: taskId ? 1 : documentId ? 2 : projectId ? 3 : sprintId ? 4 : 5,
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
      promptString += `[OPERATOR] ACTIVE USER (Priority 6):\n- Name: ${resolvedContext.user.name || "N/A"}\n- Email: ${resolvedContext.user.email}\n`;
    }

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

      const db = getPrismaClient(workspaceId);
      const snapshot = await db.aiContextSnapshot.create({
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
      console.warn("[ContextSystem] Failed to save snapshot:", error);
      return null;
    }
  }

  public static async getSnapshots(
    workspaceId: string,
    options: { conversationId?: string; limit?: number } = {}
  ): Promise<Array<{ id: string; source: string; tokenCount: number; createdAt: Date }>> {
    try {
      const db = getPrismaClient(workspaceId);
      const snapshots = await db.aiContextSnapshot.findMany({
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
      console.warn("[ContextSystem] Failed to get snapshots:", error);
      return [];
    }
  }
}
