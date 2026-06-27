import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceMembers } from "@/lib/workspace";
import { createInvite } from "@/lib/invite";
import { decryptSensitiveFields } from "@/lib/field-encryption";
import { type ToolContext, type ToolModule, enforce, auditToolExecution, requireToolApproval } from "./index";

export function buildWorkspaceTools(ctx: ToolContext): ToolModule {
  const { user, workspaceId, projectId } = ctx;

  return {
    list_workspaces: {
      description: 'List all workspaces the user has access to. Use this when user asks "show workspaces" or "list workspaces".',
      inputSchema: z.object({}),
      execute: async () => {
        const memberships = await prisma.workspaceMember.findMany({
          where: { userId: user.id },
          select: { workspace: { select: { id: true, name: true } } },
        });
        const workspaces = memberships.map((m: { workspace: { id: string; name: string } | null }) => m.workspace).filter(Boolean);
        return { workspaces: workspaces.length > 0 ? workspaces : [{ id: workspaceId, name: "Current Workspace" }] };
      }
    },
    update_workspace: {
      description: 'Update workspace settings (Admin only).',
      inputSchema: z.object({ name: z.string().optional() }),
      execute: async ({ name }: Record<string, unknown>) => {
        await requireToolApproval("update_workspace", { name });
        await enforce(ctx, "admin", "workspace");
        await prisma.workspace.update({ where: { id: workspaceId }, data: { ...(name ? { name: name as string } : {}) } });
        return { success: true, message: `Workspace updated to **${name}**` };
      }
    },
    list_members: {
      description: 'List team members in the workspace.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const members = await getWorkspaceMembers(workspaceId);
        return { members: members.map((m: { user: { id: string; name: string | null; email: string; imageUrl: string | null } } & { status: string | null; id: string; role: string; workspaceId: string; userId: string; createdAt: Date; updatedAt: Date }) => ({ id: m.user.id, name: m.user.name, email: m.user.email, role: m.role })) };
      }
    },
    invite_member: {
      description: 'Invite a new member to the workspace (Admin only).',
      inputSchema: z.object({ email: z.string().email(), role: z.enum(['admin', 'member']).default('member') }),
      execute: async ({ email, role }: Record<string, unknown>) => {
        await enforce(ctx, "admin", "member");
        await createInvite(workspaceId, email as string, (role as string) || "member");
        return { success: true, message: `Sent invitation to **${email}** as **${role}**` };
      }
    },
    create_client_invite: {
      description: 'Invite an external client to a guest portal.',
      inputSchema: z.object({ email: z.string().email(), projectId: z.string() }),
      execute: async ({ email }: Record<string, unknown>) => {
        await enforce(ctx, "admin", "member");
        await createInvite(workspaceId, email as string, "guest");
        return { success: true, message: `Guest invitation sent to **${email}**.` };
      }
    },
    export_workspace_data: {
      description: 'Export workspace data as JSON.',
      inputSchema: z.object({
        includeTypes: z.array(z.enum(["tasks","projects","documents"])).optional().describe("Entity types to include; defaults to all."),
        maxItems: z.number().max(500).optional().describe("Max items per type (default 200, max 500)."),
        cursor: z.string().optional().describe("Pagination cursor for fetching the next page."),
      }),
      execute: async ({ includeTypes = ["tasks", "projects"], maxItems = 200, cursor }: Record<string, unknown>) => {
        await enforce(ctx, "admin", "workspace");
        
        const { getAccessibleProjectIds } = await import("../project-permissions");
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
        const SENSITIVE_FIELDS = new Set(["password", "apiKey", "token", "refreshToken", "secret", "privateKey", "encryptionKey"]);
        function stripSensitive(obj: unknown): unknown {
          if (Array.isArray(obj)) return obj.map(stripSensitive);
          if (obj && typeof obj === "object") {
            const cleaned: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(obj)) {
              if (SENSITIVE_FIELDS.has(k)) continue;
              cleaned[k] = stripSensitive(v);
            }
            return cleaned;
          }
          return obj;
        }
        const types = includeTypes as string[];
        const max = maxItems as number;
        const cur = cursor as string | undefined;
        const queries: Promise<{ name: string; count: number; cursor: string | null; data: unknown[] }>[] = [];
        if (types.includes("tasks")) {
          queries.push(
            prisma.task.findMany({ where: { workspaceId, projectId: { in: accessibleProjectIds } }, take: max + 1, ...(cur ? { cursor: { id: cur }, skip: 1 } : {}), orderBy: { id: "asc" } }).then((data: { id: string }[]) => {
              const hasMore = data.length > max;
              if (hasMore) data.pop();
              return { name: "tasks", count: data.length, cursor: hasMore ? data[data.length - 1]?.id ?? null : null, data: stripSensitive(data) as unknown[] };
            })
          );
        }
        if (types.includes("projects")) {
          queries.push(
            prisma.project.findMany({ where: { workspaceId, id: { in: accessibleProjectIds } }, take: max + 1, ...(cur ? { cursor: { id: cur }, skip: 1 } : {}), orderBy: { id: "asc" } }).then((data: { id: string }[]) => {
              const hasMore = data.length > max;
              if (hasMore) data.pop();
              return { name: "projects", count: data.length, cursor: hasMore ? data[data.length - 1]?.id ?? null : null, data: stripSensitive(data) as unknown[] };
            })
          );
        }
        if (types.includes("documents")) {
          queries.push(
            prisma.document.findMany({ where: { workspaceId, OR: [{ projectId: null }, { projectId: { in: accessibleProjectIds } }] }, take: max + 1, ...(cur ? { cursor: { id: cur }, skip: 1 } : {}), orderBy: { id: "asc" } }).then((data: { id: string }[]) => {
              const hasMore = data.length > max;
              if (hasMore) data.pop();
              return { name: "documents", count: data.length, cursor: hasMore ? data[data.length - 1]?.id ?? null : null, data: stripSensitive(data) as unknown[] };
            })
          );
        }
        const results = await Promise.all(queries);
        const summary: Record<string, number> = {};
        const exportData: Record<string, unknown[]> = {};
        const cursors: Record<string, string | null> = {};
        for (const { name, count, cursor: nextCursor, data: items } of results) {
          summary[name] = count;
          exportData[name] = items;
          cursors[name] = nextCursor;
        }
        await auditToolExecution(workspaceId, user.id, "export_workspace_data", { includeTypes, maxItems, summary });
        return { success: true, message: `Exported ${Object.entries(summary).map(([k, v]) => `${v} ${k}`).join(", ")}.`, data: exportData, cursors };
      }
    },
    send_team_announcement: {
      description: 'Send a workspace-wide announcement.',
      inputSchema: z.object({ title: z.string(), message: z.string() }),
      execute: async ({ title, message }: Record<string, unknown>) => {
        await enforce(ctx, "admin", "workspace");
        
        const members = await prisma.workspaceMember.findMany({ where: { workspaceId } });
        await Promise.all(members.map((m: { userId: string }) => prisma.notification.create({ data: { title: `Announcement: ${title}`, message: message as string, type: "ANNOUNCEMENT", userId: m.userId, workspaceId, priority: "high" } })));
        return { success: true, message: `Announcement sent to **${members.length}** members.` };
      }
    },
    set_workspace_goal: {
      description: 'Set a high-level OKR or goal.',
      inputSchema: z.object({ title: z.string(), targetDate: z.string().optional(), metrics: z.array(z.string()).optional() }),
      execute: async ({ title, targetDate, metrics }: Record<string, unknown>) => {
        await enforce(ctx, "write", "document");
        
        const metricList = metrics as string[] | undefined;
        await prisma.document.create({ data: { title: `GOAL: ${title}`, content: `## Goal\nTarget: ${targetDate || 'N/A'}\n### Key Results\n${metricList?.map((m: string) => `- [ ] ${m}`).join('\n') || 'None'}`, workspaceId, userId: user.id } });
        return { success: true, message: `Goal "**${title}**" established.` };
      }
    },
    check_billing_history: {
      description: 'Retrieve billing and subscription history.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "billing");
        
        const history = await prisma.billingLog.findMany({ where: { workspaceId }, take: 5, orderBy: { createdAt: 'desc' } });
        return { history: history.map((h: { createdAt: Date; amount: number | null; action: string }) => ({ date: h.createdAt, amount: h.amount, status: h.action, metadata: decryptSensitiveFields("billingLog", h as unknown as Record<string, unknown>).metadata })), plan: "Enterprise Alpha" };
      }
    },
  };
}
