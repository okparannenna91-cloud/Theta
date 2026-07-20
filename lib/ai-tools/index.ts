import type { ResourceType } from "@/lib/nova/constitution/security";
import type { PermissionCheckAction } from "@/lib/nova/security-guard";
import { z } from "zod";
import { filterToolsByCategories, type ToolCategory } from "@/lib/ai-tools/registry";
import { buildTaskTools } from "./task-tools";
import { buildProjectTools } from "./project-tools";
import { buildWorkspaceTools } from "./workspace-tools";
import { buildDocumentTools } from "./document-tools";
import { buildAutomationTools } from "./automation-tools";
import { buildTeamTools } from "./team-tools";
import { buildSearchTools } from "./search-tools";
import { telemetry } from "@/lib/nova/telemetry";
import { getAblyChannel } from "@/lib/ably-server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface ToolContext {
  user: { id: string };
  workspaceId: string;
  projectId?: string;
}

export interface ToolDefinition {
  description: string;
  inputSchema: z.ZodType<unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
  parameters?: z.ZodType<unknown>;
}

export type ToolModule = Record<string, ToolDefinition>;

export async function auditToolExecution(
  workspaceId: string,
  userId: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        action: "NOVA_TOOL_EXECUTION",
        entityType: "AI_TOOL",
        entityId: toolName,
        workspaceId,
        userId,
        metadata: { tool: toolName, params: JSON.parse(JSON.stringify(params)), timestamp: new Date().toISOString() },
      },
    });
  } catch (e) {
    const { logger } = await import("@/lib/logger");
    logger.error("Failed to log tool execution:", e);
  }
}

export async function enforce(ctx: ToolContext, action: PermissionCheckAction, resourceType: ResourceType, extra?: { projectId?: string }) {
  const { SecurityGuard } = await import("@/lib/nova/security-guard");
  await SecurityGuard.enforce({ userId: ctx.user.id, workspaceId: ctx.workspaceId, action, resourceType, projectId: extra?.projectId });
}

export async function requireToolApproval(toolName: string, params: Record<string, unknown>): Promise<void> {
  const { DecisionFramework } = await import("@/lib/nova/decision-framework");
  const syntheticPrompt = `${toolName} ${Object.values(params).filter(Boolean).join(" ")}`;
  const decision = DecisionFramework.evaluate(syntheticPrompt);
  if (decision.requiresApproval) {
    throw new Error(
      `**ACTION BLOCKED — CONFIRMATION REQUIRED**\n\n` +
      `The "${toolName}" tool is classified as **HIGH RISK** (${decision.intent} action). ` +
      `This action requires explicit human approval and cannot be delegated to the AI.`
    );
  }
  if (decision.requiresConfirmation) {
    throw new Error(
      `**ACTION PAUSED — CONFIRMATION REQUESTED**\n\n` +
      `The "${toolName}" tool is classified as **MEDIUM RISK** (${decision.intent} action). ` +
      `Please confirm before proceeding.`
    );
  }
}

const PER_TOOL_RATE_LIMIT = 10;
const PER_TOOL_WINDOW_SECONDS = 60;

async function isToolRateLimited(userId: string, toolName: string): Promise<boolean> {
  try {
    const { redis } = await import("@/lib/redis/client");
    const key = `nova:toolrate:${userId}:${toolName}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, PER_TOOL_WINDOW_SECONDS);
    }
    return count > PER_TOOL_RATE_LIMIT;
  } catch {
    return false;
  }
}

type ToolFunction = (args: Record<string, unknown>) => Promise<unknown>;
interface InternalToolDef {
  execute: ToolFunction;
  inputSchema?: z.ZodType<unknown>;
  parameters?: z.ZodType<unknown>;
  description?: string;
}
const _toolsRef: Record<string, InternalToolDef> = {};

export function buildTools(ctx: ToolContext, categories?: ToolCategory[]) {
  const { user, workspaceId, projectId } = ctx;

  const TOOL_TIMEOUT_MS = 50000;

  function wrapTool(toolName: string, execute: ToolFunction): ToolFunction {
    return async (args: Record<string, unknown>) => {
      const limited = await isToolRateLimited(user.id, toolName);
      if (limited) {
        return { error: `Rate limit exceeded for tool: ${toolName}. Max ${PER_TOOL_RATE_LIMIT} calls per ${PER_TOOL_WINDOW_SECONDS}s.` } as Record<string, unknown>;
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      const toolStart = Date.now();
      try {
        const result = await Promise.race([
          execute(args),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${TOOL_TIMEOUT_MS}ms.`)), TOOL_TIMEOUT_MS);
          }),
        ]);
        telemetry.trackToolExecution({
          userId: user.id,
          workspaceId,
          toolName,
          success: true,
          durationMs: Date.now() - toolStart,
        });
        return result;
      } catch (err: unknown) {
        const error = err as Error;
        telemetry.trackToolExecution({
          userId: user.id,
          workspaceId,
          toolName,
          success: false,
          durationMs: Date.now() - toolStart,
          errorMessage: error.message,
        });
        throw err;
      } finally {
        clearTimeout(timer);
      }
    };
  }

  const rawTools: Record<string, InternalToolDef> = {
    ...buildTaskTools(ctx),
    ...buildProjectTools(ctx),
    ...buildWorkspaceTools(ctx),
    ...buildDocumentTools(ctx),
    ...buildAutomationTools(ctx),
    ...buildTeamTools(ctx),
    ...buildSearchTools(ctx),

    dispatch_ui_action: {
      description: 'Dispatch a direct UI action to the client.',
      inputSchema: z.object({ action: z.enum(['NAVIGATE', 'OPEN_MODAL', 'SWITCH_TAB', 'REFRESH_DATA']), payload: z.record(z.unknown()) }),
      execute: async ({ action, payload }: Record<string, unknown>) => {
        const channel = getAblyChannel(`workspace:${workspaceId}`);
        await channel.publish('UI_ACTION', { action, payload, userId: user.id });
        return { success: true, message: `Dispatched UI action: **${action}**` };
      }
    },
    update_board_layout: {
      description: 'Update the columns or layout of a project board.',
      inputSchema: z.object({ boardId: z.string(), columns: z.array(z.object({ id: z.string().optional(), name: z.string(), order: z.number() })) }),
      execute: async ({ boardId, columns }: Record<string, unknown>) => {
        await enforce(ctx, "write", "project");
        const board = await prisma.board.findUnique({ where: { id: boardId as string }, select: { projectId: true, workspaceId: true } });
        if (!board) return { error: "Board not found." };
        const { canAccessProjectResource } = await import("../project-permissions");
        if (!await canAccessProjectResource(user.id, workspaceId, board.projectId)) return { error: "Access denied." };
        const colList = columns as Array<{ id?: string; name: string; order: number }>;
        await Promise.all(colList.map((col) =>
          col.id ? prisma.column.update({ where: { id: col.id }, data: { name: col.name, order: col.order } }) : prisma.column.create({ data: { name: col.name, order: col.order, boardId: boardId as string } })
        ));
        return { success: true, message: `Updated board layout for **${boardId}**.` };
      }
    },
    save_conversation: {
      description: 'Save the current AI conversation.',
      inputSchema: z.object({ title: z.string(), messages: z.array(z.object({ role: z.string(), content: z.string() })) }),
      execute: async ({ title, messages }: Record<string, unknown>) => {
        await enforce(ctx, "write", "workspace");
        await auditToolExecution(workspaceId, user.id, "save_conversation", { title });
        const conversation = await prisma.aiConversation.create({ data: { title: title as string, workspaceId, userId: user.id, messages: { create: messages as Array<{ role: string; content: string }> } } });
        return { success: true, id: conversation.id };
      }
    },
    list_integrations: {
      description: 'List active and available integrations.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const active = await prisma.integration.findMany({ where: { workspaceId } });
        const { AVAILABLE_INTEGRATIONS } = await import("@/lib/constants/templates");
        return { active: active.map((i: { provider: string }) => i.provider), available: [...AVAILABLE_INTEGRATIONS] };
      }
    },
    remember_preference: {
      description: 'Save a user preference to memory.',
      inputSchema: z.object({ key: z.string().min(1).max(100).describe("Preference key (max 100 chars)."), value: z.string().min(1).max(2000).describe("Preference value (max 2000 chars).") }),
      execute: async ({ key, value }: Record<string, unknown>) => {
        await enforce(ctx, "write", "workspace");
        if (!/^[a-zA-Z0-9_\-.\s]+$/.test(key as string)) {
          return { success: false, message: "Invalid key: only letters, numbers, spaces, hyphens, underscores, and periods allowed." };
        }
        // Plan-aware memory limit
        const { getPlanLimits, isValidPlan } = await import("@/lib/plan-limits");
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } });
        const planName = isValidPlan(workspace?.plan ?? "") ? (workspace?.plan as "free" | "growth" | "pro" | "theta_plus") : "free";
        const limits = getPlanLimits(planName);
        const maxMemory = limits.maxMemoryItems;
        const existingCount = await prisma.aiMemory.count({ where: { userId: user.id, workspaceId } });
        if (maxMemory !== -1 && existingCount >= maxMemory) {
          return { success: false, message: `Memory limit reached (max ${maxMemory} items on ${planName} plan). Clear some before saving more.` };
        }
        const scopedKey = `${workspaceId}:${key}`;
        await prisma.aiMemory.upsert({ where: { userId_key: { userId: user.id, key: scopedKey } }, update: { content: value as string, workspaceId }, create: { userId: user.id, workspaceId, key: scopedKey, content: value as string } });
        return { success: true, message: `Remembered: **${key}**` };
      }
    },
    predict_project_risk: {
      description: 'Analyze and predict risk for a project.',
      inputSchema: z.object({ projectId: z.string() }),
      execute: async ({ projectId: pId }: Record<string, unknown>) => {
        await enforce(ctx, "read", "project");
        const { RiskPredictionEngine } = await import("@/lib/nova/risk-prediction");
        const result = await RiskPredictionEngine.predictProjectRisk(workspaceId, pId as string);
        return result;
      }
    },
    generate_sprint_plan: {
      description: 'Generate an AI-powered sprint plan based on team velocity and backlog.',
      inputSchema: z.object({ projectId: z.string(), sprintDurationDays: z.number().optional() }),
      execute: async ({ projectId: pId, sprintDurationDays }: Record<string, unknown>) => {
        await enforce(ctx, "read", "project");
        const { SprintPlanning } = await import("@/lib/nova/sprint-planning");
        const result = await SprintPlanning.generateSprintPlan(workspaceId, pId as string, (sprintDurationDays as number) || 14);
        return result;
      }
    },
    generate_smart_notifications: {
      description: 'Generate AI-powered contextual notifications for the user.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const { SmartNotifications } = await import("@/lib/nova/smart-notifications");
        const result = await SmartNotifications.generateContextualNotifications(workspaceId, user.id);
        return result;
      }
    },
    parse_automation_rule: {
      description: 'Parse a natural language command into a structured automation rule.',
      inputSchema: z.object({ command: z.string() }),
      execute: async ({ command }: Record<string, unknown>) => {
        await enforce(ctx, "write", "workspace");
        const { SmartAutomation } = await import("@/lib/nova/smart-automation");
        const result = await SmartAutomation.parseNLToRule(command as string);
        return result;
      }
    },
    generate_ai_standup: {
      description: 'Generate an AI-powered daily standup report.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const { StandupReports } = await import("@/lib/nova/standup-reports");
        const result = await StandupReports.generateStandup(user.id, workspaceId);
        return result;
      }
    },
  };

  for (const [name, tool] of Object.entries(rawTools)) {
    const originalExecute = tool.execute;
    tool.execute = wrapTool(name, originalExecute);
    const schema = tool.inputSchema;
    if (schema) {
      tool.parameters = schema;
      delete tool.inputSchema;
    }
  }

  Object.assign(_toolsRef, rawTools);

  return categories ? filterToolsByCategories(rawTools as Record<string, unknown>, categories) : rawTools;
}
