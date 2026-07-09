import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceMembers } from "@/lib/workspace";
import { ReportingIntelligence } from "@/lib/nova/reporting-intelligence";
import { type ToolContext, type ToolModule, enforce, auditToolExecution } from "./index";

export function buildTeamTools(ctx: ToolContext): ToolModule {
  const { user, workspaceId } = ctx;

  return {
    list_team_members: {
      description: 'List all team members with their roles and status.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const members = await getWorkspaceMembers(workspaceId);
        return {
          members: members.map((m: { user: { id: string; name: string | null; email: string; imageUrl: string | null } } & { role: string; status: string | null }) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            status: m.status,
          }))
        };
      }
    },
    team_performance: {
      description: 'Generate a team performance report with metrics and insights.',
      inputSchema: z.object({ scopeId: z.string().optional() }),
      execute: async ({ scopeId }: Record<string, unknown>) => {
        await enforce(ctx, "read", "workspace");
        await auditToolExecution(workspaceId, user.id, "team_performance", { scopeId });
        const report = await ReportingIntelligence.generateReport("TEAM", (scopeId as string) || workspaceId, workspaceId, user.id);
        return { report };
      }
    },
    team_activity: {
      description: 'Show recent team activity across the workspace.',
      inputSchema: z.object({ limit: z.number().max(50).optional() }),
      execute: async ({ limit }: Record<string, unknown>) => {
        await enforce(ctx, "read", "workspace");
        const { getAccessibleProjectIds } = await import("../project-permissions");
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
        const activities = await prisma.activity.findMany({
          where: {
            workspaceId,
            OR: [
              { projectId: { in: accessibleProjectIds } },
              { projectId: null },
            ],
          },
          take: (limit as number) || 20,
          orderBy: { createdAt: 'desc' },
          select: { action: true, entityType: true, entityId: true, createdAt: true, userId: true, metadata: true },
        });
        return { activities };
      }
    },
  };
}
