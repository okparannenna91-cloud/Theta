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
        "Search across all tasks and projects in the workspace. " +
        "Use this when the user asks about task status, project progress, " +
        "what someone is working on, or overdue items.",
      schema: z.object({
        query: z.string().describe("Search query for tasks and projects"),
        type: z.enum(["tasks", "projects", "both"]).optional().default("both"),
      }),
      func: async ({ query, type }) => {
        const { prisma } = await import("@/lib/prisma");
        const results: any[] = [];

        if (type === "tasks" || type === "both") {
          const tasks = await prisma.task.findMany({
            where: {
              workspaceId: ctx.workspaceId,
              OR: [
                { title: { contains: query } },
                { description: { contains: query } },
              ],
            },
            take: 5,
            select: { id: true, title: true, status: true, priority: true, dueDate: true },
          });
          results.push(...tasks.map((t) => ({ type: "task", ...t })));
        }

        if (type === "projects" || type === "both") {
          const projects = await prisma.project.findMany({
            where: {
              workspaceId: ctx.workspaceId,
              OR: [
                { name: { contains: query } },
                { description: { contains: query } },
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
