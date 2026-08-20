import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { LangGraphToolContext } from "./wrapper";

export function buildRAGTools(ctx: LangGraphToolContext): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: "search_knowledge_base",
      description:
        "Search the workspace knowledge base for documents, wiki pages, help docs, and internal documentation. " +
        "Use this when the user asks about company policies, how-to guides, product documentation, " +
        "or any information that might be stored in the workspace knowledge base.",
      schema: z.object({
        query: z.string().describe("Search query to find relevant knowledge"),
        limit: z.number().optional().default(5).describe("Max results to return"),
      }),
      func: async ({ query, limit }) => {
        const { KnowledgeIntelligence } = await import("@/lib/nova/knowledge-intelligence");
        const results = await KnowledgeIntelligence.search(query, {
          workspaceId: ctx.workspaceId,
          limit: limit || 5,
        });
        return results.map((doc: any) => ({
          title: doc.title,
          content: doc.content?.substring(0, 500),
          tags: doc.tags,
        }));
      },
    }),
    new DynamicStructuredTool({
      name: "search_tasks_and_projects",
      description:
        "Search across all tasks and projects in the workspace. Use this when the user asks about task status, project progress, what someone is working on, or overdue items. " +
        "Set overdue:true to find overdue tasks (due before today, not completed).",
      schema: z.object({
        query: z.string().optional().default("").describe("Search query for tasks and projects (optional when overdue or projectId is set)"),
        type: z.enum(["tasks", "projects", "both"]).optional().default("both"),
        overdue: z.boolean().optional().default(false).describe("When true, return only overdue tasks"),
        projectId: z.string().optional().describe("Filter tasks by project id (list all tasks in a project)"),
      }),
      func: async ({ query, type, overdue, projectId }) => {
        const { prisma } = await import("@/lib/prisma");
        const results: any[] = [];

        if (type === "tasks" || type === "both") {
          const baseWhere: any = {
            workspaceId: ctx.workspaceId,
          };
          if (projectId) {
            baseWhere.projectId = projectId;
          } else {
            baseWhere.OR = [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ];
          }
          if (overdue) {
            delete baseWhere.OR;
            baseWhere.workspaceId = ctx.workspaceId;
            baseWhere.dueDate = { not: null, lt: new Date() };
            baseWhere.status = { notIn: ["done", "completed", "cancelled"] };
          }
          const tasks = await prisma.task.findMany({
            where: baseWhere,
            take: 5,
            select: { id: true, title: true, status: true, priority: true, dueDate: true },
          });
          results.push(...tasks.map((t) => ({ type: "task", ...t })));
        }

        // Projects are not "overdue" — an overdue search is task-scoped.
        if (!overdue && (type === "projects" || type === "both")) {
          const projects = await prisma.project.findMany({
            where: {
              workspaceId: ctx.workspaceId,
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            },
            take: 5,
            select: { id: true, name: true, description: true },
          });
          results.push(...projects.map((p) => ({ type: "project", ...p })));
        }

        return results;
      },
    }),
    new DynamicStructuredTool({
      name: "get_team_activity",
      description:
        "Get recent activity from team members. Use this to understand what the team has been working on, " +
        "who is active, and recent changes across the workspace.",
      schema: z.object({
        limit: z.number().optional().default(10).describe("Number of recent activities to return"),
      }),
      func: async ({ limit }) => {
        const { prisma } = await import("@/lib/prisma");
        const activities = await prisma.activity.findMany({
          where: { workspaceId: ctx.workspaceId },
          orderBy: { createdAt: "desc" },
          take: limit || 10,
          select: {
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true,
            userId: true,
          },
        });
        return activities;
      },
    }),
  ];
}
