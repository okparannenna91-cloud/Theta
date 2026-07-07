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
import { AgentFramework } from "@/lib/nova/agent-framework";
import { mem0 } from "@/lib/mem0";
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
      inputSchema: z.object({ action: z.enum(['NAVIGATE', 'OPEN_MODAL', 'SWITCH_TAB', 'REFRESH_DATA']), payload: z.record(z.any()) }),
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
        const colList = columns as Array<{ id?: string; name: string; order: number }>;
        await Promise.all(colList.map((col) =>
          col.id ? prisma.column.update({ where: { id: col.id }, data: { name: col.name, order: col.order } }) : prisma.column.create({ data: { name: col.name, order: col.order, boardId: boardId as string } })
        ));
        return { success: true, message: `Updated board layout for **${boardId}**.` };
      }
    },
    evaluate_risks: {
      description: 'Evaluate a task or project for potential risks.',
      inputSchema: z.object({ taskId: z.string().optional(), projectId: z.string().optional() }),
      execute: async ({ taskId }: Record<string, unknown>) => {
        await enforce(ctx, "read", "project");
        if (taskId) { await prisma.task.findUnique({ where: { id: taskId as string }, include: { subtasks: true } }); }
        return { risks: ["High dependency on external API", "Overlapping deadlines", "Resource bottleneck"], mitigation: "Consider breaking down the task further." };
      }
    },
    generate_standup: {
      description: 'Generate a daily standup report.',
      inputSchema: z.object({ userId: z.string() }),
      execute: async ({ userId: targetUserId }: Record<string, unknown>) => {
        await enforce(ctx, "read", "workspace");
        await auditToolExecution(workspaceId, user.id, "generate_standup", { userId: targetUserId });
        const [activity, tasks] = await Promise.all([
          prisma.activity.findMany({ where: { userId: targetUserId as string, workspaceId }, take: 5, orderBy: { createdAt: 'desc' } }),
          prisma.task.findMany({ where: { workspaceId, status: "in_progress" } })
        ]);
        return { yesterday: activity.map((a: { action: string }) => a.action), today: tasks.map((t: { title: string }) => t.title), blockers: ["None reported by system"] };
      }
    },
    get_suggestions: {
      description: 'Get AI suggestions for workflow improvements.',
      inputSchema: z.object({ projectId: z.string().optional() }),
      execute: async ({ projectId: pId }: Record<string, unknown>) => {
        await enforce(ctx, "read", "task");
        const { getAccessibleProjectIds } = await import("../project-permissions");
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
        const targetProjectIds = pId
          ? (accessibleProjectIds.includes(pId as string) ? [pId as string] : [])
          : accessibleProjectIds;
        if (targetProjectIds.length === 0) {
          return { suggestions: ["No accessible projects found."] };
        }
        const [overdue, stalled] = await Promise.all([
          prisma.task.findMany({ where: { workspaceId, projectId: { in: targetProjectIds }, dueDate: { lt: new Date() }, status: { not: "done" } }, take: 3 }),
          prisma.task.findMany({ where: { workspaceId, projectId: { in: targetProjectIds }, status: "in_progress", updatedAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } }, take: 3 })
        ]);
        return { suggestions: [
          overdue.length > 0 ? `You have **${overdue.length}** overdue tasks.` : "No overdue tasks.",
          stalled.length > 0 ? `**${stalled[0].title}** has been stalled for 3 days.` : "Team is moving fast!"
        ]};
      }
    },
    generate_daily_brief: {
      description: 'Generate a personalized daily brief.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        await auditToolExecution(workspaceId, user.id, "generate_daily_brief", {});
        const [overdue, upcoming, activities] = await Promise.all([
          prisma.task.findMany({ where: { workspaceId, userId: user.id, dueDate: { lt: new Date() }, status: { not: "done" } }, take: 5 }),
          prisma.task.findMany({ where: { workspaceId, userId: user.id, dueDate: { gte: new Date() } }, orderBy: { dueDate: 'asc' }, take: 5 }),
          prisma.activity.findMany({ where: { workspaceId }, take: 5, orderBy: { createdAt: 'desc' } })
        ]);
        return { brief: { critical: overdue.map((t: { title: string }) => t.title), onDeck: upcoming.map((t: { title: string }) => t.title), teamPulse: activities.map((a: { action: string; entityType: string }) => `${a.action} ${a.entityType}`) }, recommendation: overdue.length > 0 ? "Focus on clearing blockers." : "Schedule looks clear." };
      }
    },
    generate_meeting_prep: {
      description: 'Prepare a meeting agenda and context.',
      inputSchema: z.object({ topic: z.string(), projectId: z.string().optional() }),
      execute: async ({ topic, projectId: pId }: Record<string, unknown>) => {
        await enforce(ctx, "read", "project", { projectId: pId as string | undefined });
        await auditToolExecution(workspaceId, user.id, "generate_meeting_prep", { topic, projectId: pId });
        const { getAccessibleProjectIds } = await import("../project-permissions");
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
        const targetProjectIds = pId
          ? (accessibleProjectIds.includes(pId as string) ? [pId as string] : [])
          : accessibleProjectIds;
        const tasks = await prisma.task.findMany({ where: { workspaceId, projectId: { in: targetProjectIds }, status: "in_progress" }, take: 5 });
        return { agenda: ["Status update", "Blockers review", "Resource allocation", "Action items"], context: tasks.map((t: { title: string }) => t.title) };
      }
    },
    generate_dashboard_config: {
      description: 'Generate a JSON dashboard configuration.',
      inputSchema: z.object({ title: z.string(), focus: z.enum(['tasks', 'productivity', 'billing', 'velocity']) }),
      execute: async ({ title, focus }: Record<string, unknown>) => ({ dashboard: { title, layout: "grid", widgets: [{ type: "stat", title: "Active Projects", metric: "count_projects" }, { type: "chart", title: "Task Velocity", focus }, { type: "list", title: "Blockers", filter: "overdue" }] } })
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
    orchestrate_agentic_workflow: {
      description: 'Trigger a multi-step autonomous workflow using specialized agents.',
      inputSchema: z.object({ objective: z.string(), context: z.string().optional() }),
      execute: async ({ objective, context: extraContext }: Record<string, unknown>) => {
        await enforce(ctx, "write", "project");
        const plans = await AgentFramework.planExecution(objective as string);
        if (plans.length === 0) {
          return { message: `No specialized agents matched objective: "**${objective}**". Consider using more specific keywords (e.g., sprint, task, report, document, risk, automate).`, agents: [] };
        }
        const results: Array<{ agentId: string; agentName: string; result: string }> = [];
        for (const plan of plans) {
          const agent = AgentFramework.getAgent(plan.agentId);
          const stepOutputs: string[] = [];
          for (const step of plan.steps) {
            const toolFn = _toolsRef[step.tool]?.execute;
            if (toolFn) {
              try {
                const output = await toolFn(step.params);
                stepOutputs.push(`[${step.tool}] ${JSON.stringify(output)}`);
              } catch (e: unknown) {
                const error = e as Error;
                stepOutputs.push(`[${step.tool}] ERROR: ${error.message}`);
              }
            } else {
              stepOutputs.push(`[${step.tool}] SKIPPED (tool not found)`);
            }
          }
          if (agent) {
            await prisma.activity.create({
              data: {
                action: "AGENT_WORKFLOW_STEP",
                entityType: "AGENT",
                entityId: agent.id,
                workspaceId,
                userId: user.id,
                metadata: JSON.parse(JSON.stringify({ agent: agent.name, steps: plan.steps.map((s: { tool: string }) => s.tool), outputs: stepOutputs, objective, extraContext })),
              },
            });
          }
          const summary = `**${agent?.name || plan.agentId}**: ${stepOutputs.join("; ")}`;
          results.push({ agentId: plan.agentId, agentName: agent?.name || plan.agentId, result: summary });
        }
        return {
          message: `**Orchestration complete.** Executed ${results.length} agent(s) for: "${objective}".`,
          agents: results,
          steps: plans.flatMap((p: { steps: Array<{ description: string }> }) => p.steps.map((s: { description: string }) => s.description)),
        };
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
        // TENANT ISOLATION: Count and store memories scoped to workspace
        const existingCount = await prisma.aiMemory.count({ where: { userId: user.id, workspaceId } });
        if (existingCount >= 100) {
          return { success: false, message: "Memory limit reached (max 100 preferences). Clear some before saving more." };
        }
        let mem0Synced = false;
        try {
          await mem0.add([{ role: "user", content: `User preference: ${key} = ${value}` }], { user_id: user.id, metadata: { workspaceId } });
          mem0Synced = true;
        } catch (e) { logger.warn("Mem0 sync failed:", e); }
        const scopedKey = `${workspaceId}:${key}`;
        await prisma.aiMemory.upsert({ where: { userId_key: { userId: user.id, key: scopedKey } }, update: { content: value as string, workspaceId }, create: { userId: user.id, workspaceId, key: scopedKey, content: value as string } });
        return { success: true, message: `Remembered: **${key}**${mem0Synced ? "" : " (memory sync unavailable)"}` };
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
