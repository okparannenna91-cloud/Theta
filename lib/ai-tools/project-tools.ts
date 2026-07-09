import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ProjectIntelligence } from "@/lib/nova/project-intelligence";
import { getAccessibleProjectIds, canAccessProject } from "@/lib/project-permissions";
import { type ToolContext, type ToolModule, enforce, requireToolApproval } from "./index";

export function buildProjectTools(ctx: ToolContext): ToolModule {
  const { user, workspaceId, projectId } = ctx;

  return {
    list_projects: {
      description: 'List all projects in the current workspace. Use this when user asks "list projects" or "show projects".',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "project");
        
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
        const projects = await prisma.project.findMany({ where: { workspaceId, id: { in: accessibleProjectIds } }, select: { id: true, name: true, description: true } });
        return { projects };
      }
    },
    create_project: {
      description: 'Create a new project.',
      inputSchema: z.object({
        name: z.string(),
        description: z.string().optional(),
        coverImage: z.string().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color").optional(),
        visibility: z.enum(["private", "team_access", "workspace_visible"]).optional(),
      }),
      execute: async ({ name, description, coverImage, color, visibility }: Record<string, unknown>) => {
        await enforce(ctx, "write", "project");

        const project = await prisma.project.create({
          data: {
            name: name as string,
            description: description as string | undefined,
            coverImage: coverImage as string | undefined,
            color: color as string | undefined,
            visibility: (visibility as string | undefined) as any || "private",
            workspaceId,
            userId: user.id,
            members: { create: { userId: user.id, role: "manager" } },
          },
        });
        await prisma.activity.create({ data: { action: "CREATED", entityType: "PROJECT", entityId: project.id, workspaceId, userId: user.id, projectId: project.id, metadata: JSON.parse(JSON.stringify({ source: "NOVA_AI", name })) } });
        return { success: true, message: `Created project **${name}**` };
      }
    },
    update_project: {
      description: 'Update project details.',
      inputSchema: z.object({ projectId: z.string(), name: z.string().optional(), description: z.string().optional() }),
      execute: async ({ projectId: id, name, description }: Record<string, unknown>) => {
        await enforce(ctx, "write", "project");
        const access = await canAccessProject(user.id, id as string, workspaceId);
        if (!access.hasAccess) return { error: "Access denied to this project." };
        const project = await prisma.project.update({ where: { id: id as string, workspaceId }, data: { ...(name ? { name: name as string } : {}), ...(description ? { description: description as string } : {}) } });
        return { success: true, message: `Updated project **${project.name}**` };
      }
    },
    delete_project: {
      description: 'Delete a project (Admin only).',
      inputSchema: z.object({ projectId: z.string() }),
      execute: async ({ projectId: id }: Record<string, unknown>) => {
        await requireToolApproval("delete_project", { projectId: id });
        await enforce(ctx, "delete", "project");
        const access = await canAccessProject(user.id, id as string, workspaceId);
        if (!access.hasAccess) return { error: "Access denied to this project." };
        await prisma.task.deleteMany({ where: { projectId: id as string, workspaceId } });
        await prisma.project.delete({ where: { id: id as string, workspaceId } });
        return { success: true, message: "Project deleted successfully." };
      }
    },
    project_health_analysis: {
      description: 'Perform a health check on a project.',
      inputSchema: z.object({ projectId: z.string() }),
      execute: async ({ projectId: pId }: Record<string, unknown>) => {
        await enforce(ctx, "read", "project", { projectId: pId as string });
        const access = await canAccessProject(user.id, pId as string, workspaceId);
        if (!access.hasAccess) return { error: "Access denied to this project." };
        return ProjectIntelligence.analyzeHealth(workspaceId, pId as string);
      }
    },
    create_sprint_board: {
      description: 'Create a new sprint board.',
      inputSchema: z.object({ projectId: z.string(), name: z.string(), startDate: z.string().optional(), endDate: z.string().optional() }),
      execute: async ({ projectId: pId, name, startDate, endDate }: Record<string, unknown>) => {
        await enforce(ctx, "write", "project", { projectId: pId as string });
        const access = await canAccessProject(user.id, pId as string, workspaceId);
        if (!access.hasAccess) return { error: "Access denied to this project." };
        
        const board = await prisma.board.create({ data: { name: name as string, projectId: pId as string, workspaceId, visibility: 'private', description: `Sprint: ${startDate || 'N/A'} to ${endDate || 'N/A'}` } });
        await prisma.column.createMany({ data: [
          { name: 'Sprint Backlog', boardId: board.id, order: 0 },
          { name: 'In Development', boardId: board.id, order: 1 },
          { name: 'Review', boardId: board.id, order: 2 },
          { name: 'Done', boardId: board.id, order: 3 },
        ]});
        return { success: true, message: `Board "**${name}**" created.` };
      }
    },
  };
}
