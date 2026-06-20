import { matchIntent, type DirectActionName } from "./registry";
import { buildTools, type ToolContext, type ToolDefinition } from "@/lib/ai-tools";
import { logger } from "@/lib/logger";
import { getPrismaClient } from "@/lib/prisma";
import { telemetry } from "@/lib/nova/telemetry";

const DIRECT_ACTION_CONFIDENCE_THRESHOLD = 0.85;

export interface DirectActionResult {
  handled: boolean;
  message?: string;
  success?: boolean;
  durationMs: number;
  action?: DirectActionName;
  confidence?: number;
  matched?: boolean;
  error?: string;
  actionName?: string;
}

export interface DirectActionOptions {
  prompt: string;
  user: { id: string };
  workspaceId: string;
  projectId?: string;
}

async function resolveTaskIdByTitle(
  titleQuery: string,
  workspaceId: string,
  userId: string
): Promise<{ taskId: string | null; title: string | null }> {
  try {
    const db = getPrismaClient(workspaceId);
    const { getAccessibleProjectIds } = await import("@/lib/project-permissions");
    const accessibleProjectIds = await getAccessibleProjectIds(userId, workspaceId);

    const tasks = await db.task.findMany({
      where: {
        workspaceId,
        projectId: { in: accessibleProjectIds },
        title: { contains: titleQuery, mode: "insensitive" },
      },
      select: { id: true, title: true, status: true, projectId: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });

    if (tasks.length === 0) return { taskId: null, title: null };

    const exact = tasks.find((t) => t.title.toLowerCase() === titleQuery.toLowerCase());
    if (exact) return { taskId: exact.id, title: exact.title };

    return { taskId: tasks[0].id, title: tasks[0].title };
  } catch (e) {
    logger.error("[DirectAction] resolveTaskIdByTitle error:", e);
    return { taskId: null, title: null };
  }
}

async function resolveProjectIdByName(
  nameQuery: string,
  workspaceId: string,
  userId: string
): Promise<string | null> {
  try {
    const db = getPrismaClient(workspaceId);
    const { getAccessibleProjectIds } = await import("@/lib/project-permissions");
    const accessibleProjectIds = await getAccessibleProjectIds(userId, workspaceId);

    const project = await db.project.findFirst({
      where: {
        workspaceId,
        id: { in: accessibleProjectIds },
        name: { contains: nameQuery, mode: "insensitive" },
      },
      select: { id: true },
    });

    return project?.id || null;
  } catch (e) {
    logger.error("[DirectAction] resolveProjectIdByName error:", e);
    return null;
  }
}

function formatSuccess(action: DirectActionName, result: any): string {
  if (result?.message) return result.message.replace(/\*\*/g, "");

  switch (action) {
    case "create_task":
      return `Successfully created task: ${result?.title || result?.task?.title || ""}`.trim();
    case "list_tasks": {
      const tasks = result?.tasks || [];
      if (tasks.length === 0) return "No tasks found.";
      return `Found ${tasks.length} task${tasks.length > 1 ? "s" : ""}:\n${tasks.map((t: any) => `- ${t.title} (${t.status || "todo"})`).join("\n")}`;
    }
    case "update_task":
      return `Task updated successfully.`;
    case "complete_task":
      return `Task marked as complete.`;
    case "create_project":
      return `Successfully created project: ${result?.name || result?.project?.name || ""}`.trim();
    case "list_projects": {
      const projects = result?.projects || [];
      if (projects.length === 0) return "No projects found.";
      return `Found ${projects.length} project${projects.length > 1 ? "s" : ""}:\n${projects.map((p: any) => `- ${p.name}`).join("\n")}`;
    }
    default:
      return "Action completed successfully.";
  }
}

export async function executeDirectAction(options: DirectActionOptions): Promise<DirectActionResult> {
  const start = Date.now();
  const { prompt, user, workspaceId, projectId } = options;

  try {
    const match = matchIntent(prompt);

    if (!match) {
      return { handled: false, durationMs: Date.now() - start, matched: false };
    }

    const { action, confidence, params } = match;

    logger.info("[DirectAction] Matched", { action, confidence, params });

    if (confidence < DIRECT_ACTION_CONFIDENCE_THRESHOLD) {
      return { handled: false, durationMs: Date.now() - start, matched: true, action, confidence };
    }

    const ctx: ToolContext = { user, workspaceId, projectId };
    const tools = buildTools(ctx);

    let result: any;

    const getTool = (name: string): ToolDefinition => {
      const t = tools[name];
      if (!t) throw new Error(`Tool not available: ${name}`);
      return t as ToolDefinition;
    };

    switch (action) {
      case "create_task": {
        const tool = getTool(action);
        result = await tool.execute({ title: params.title });
        break;
      }

      case "list_tasks": {
        const tool = getTool(action);
        let resolvedProjectId: string | undefined;
        if (params.projectName) {
          resolvedProjectId = (await resolveProjectIdByName(params.projectName, workspaceId, user.id)) || undefined;
        }
        result = await tool.execute({ projectId: resolvedProjectId });
        break;
      }

      case "update_task": {
        const tool = getTool("update_task");
        if (!params.title) throw new Error("Task title is required");
        const resolved = await resolveTaskIdByTitle(params.title, workspaceId, user.id);
        if (!resolved.taskId) {
          return { handled: true, success: false, durationMs: Date.now() - start, action, message: `Task "${params.title}" not found.`, actionName: action };
        }
        const updateParams: Record<string, unknown> = { taskId: resolved.taskId };
        if (params.status) updateParams.status = params.status;
        if (params.priority) updateParams.priority = params.priority;
        result = await tool.execute(updateParams);
        break;
      }

      case "complete_task": {
        const tool = getTool("update_task");
        if (!params.title) throw new Error("Task title is required");
        const resolved = await resolveTaskIdByTitle(params.title, workspaceId, user.id);
        if (!resolved.taskId) {
          return { handled: true, success: false, durationMs: Date.now() - start, action, message: `Task "${params.title}" not found.`, actionName: action };
        }
        result = await tool.execute({ taskId: resolved.taskId, status: "done" });
        break;
      }

      case "create_project": {
        const tool = getTool(action);
        result = await tool.execute({ name: params.name });
        break;
      }

      case "list_projects": {
        const tool = getTool(action);
        result = await tool.execute({});
        break;
      }

      default:
        return { handled: false, durationMs: Date.now() - start, matched: true, action, confidence };
    }

    const durationMs = Date.now() - start;
    const message = formatSuccess(action, result);

    telemetry.trackRequest({
      userId: user.id,
      workspaceId,
      path: "ACTION",
      intent: action,
      strategy: "DIRECT",
      totalDurationMs: durationMs,
      success: true,
    });

    return {
      handled: true,
      success: true,
      durationMs,
      action,
      confidence,
      matched: true,
      message,
      actionName: action,
    };
  } catch (error: any) {
    const durationMs = Date.now() - start;

    telemetry.trackRequest({
      userId: user.id,
      workspaceId,
      path: "ACTION",
      intent: "UNKNOWN",
      strategy: "DIRECT",
      totalDurationMs: durationMs,
      success: false,
      errorType: "direct_action_error",
      errorMessage: error.message,
    });

    return {
      handled: true,
      success: false,
      durationMs,
      error: error.message,
      actionName: "error",
    };
  }
}
