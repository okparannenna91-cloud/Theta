import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DocumentIntelligence } from "@/lib/nova/document-intelligence";
import { PROMPT_TEMPLATES } from "@/lib/constants/templates";
import { type ToolContext, type ToolModule, enforce, auditToolExecution, requireToolApproval } from "./index";

export function buildDocumentTools(ctx: ToolContext): ToolModule {
  const { user, workspaceId, projectId } = ctx;

  return {
    search_workspace: {
      description: 'Perform a deep semantic search across the entire workspace.',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }: Record<string, unknown>) => {
        await enforce(ctx, "read", "workspace");
        await auditToolExecution(workspaceId, user.id, "search_workspace", { query });
        const { getAccessibleProjectIds } = await import("../project-permissions");
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
        const q = query as string;
        const [tasks, docs, comments, activities] = await Promise.all([
          prisma.task.findMany({ where: { workspaceId, projectId: { in: accessibleProjectIds }, OR: [{ title: { contains: q } }, { description: { contains: q } }] }, take: 5, select: { id: true, title: true, status: true } }),
          prisma.document.findMany({ where: { workspaceId, AND: [{ OR: [{ projectId: null }, { projectId: { in: accessibleProjectIds } }] }, { OR: [{ title: { contains: q } }, { content: { contains: q } }] }] }, take: 5, select: { id: true, title: true } }),
          prisma.comment.findMany({ where: { task: { workspaceId, projectId: { in: accessibleProjectIds } }, content: { contains: q } }, take: 3, include: { user: { select: { name: true } }, task: { select: { title: true } } } }),
          prisma.activity.findMany({ where: { workspaceId, OR: [{ projectId: null }, { projectId: { in: accessibleProjectIds } }] }, take: 5, orderBy: { createdAt: 'desc' }, select: { action: true, entityType: true, createdAt: true, metadata: true } })
        ]);
        return { results: { tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status })), documents: docs.map(d => ({ id: d.id, title: d.title })), comments: comments.map(c => ({ user: c.user.name, task: c.task?.title, text: c.content })), activity: activities.map(a => ({ action: a.action, type: a.entityType, time: a.createdAt })) } };
      }
    },
    create_document: {
      description: 'Create a new document in the workspace knowledge base.',
      inputSchema: z.object({ title: z.string(), content: z.string() }),
      execute: async ({ title, content }: Record<string, unknown>) => {
        await enforce(ctx, "write", "document");
        await auditToolExecution(workspaceId, user.id, "create_document", { title });
        const analysis = DocumentIntelligence.analyze(title as string, content as string);
        const result = await prisma.$transaction(async (tx) => {
          const doc = await tx.document.create({ data: { title: title as string, content: content as string, workspaceId, userId: user.id, tags: analysis.suggestedLinks } });
          if (analysis.extractedTasks.length > 0) {
            const firstProject = await tx.project.findFirst({ where: { workspaceId } });
            if (firstProject) {
              await Promise.all(analysis.extractedTasks.map(async (t: string) => {
                await tx.task.create({ data: { title: t, description: `Auto-extracted from: ${title}`, priority: "medium", status: "todo", workspaceId, projectId: firstProject.id, userId: user.id } });
              }));
            }
          }
          for (const dec of analysis.decisions) {
            await tx.entityLink.create({ data: { sourceId: doc.id, targetId: doc.id, relation: `DECISION: ${dec.substring(0, 50)}` } }).catch(() => {});
          }
          return doc;
        });
        return { success: true, message: `Document "**${title}**" created.`, id: result.id };
      }
    },
    read_document: {
      description: 'Read the content of a document.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }: Record<string, unknown>) => {
        await enforce(ctx, "read", "document");
        await auditToolExecution(workspaceId, user.id, "read_document", { id });
        const doc = await prisma.document.findFirst({ where: { id: id as string, workspaceId } });
        if (!doc) return { found: false, message: "Document not found." };
        return { found: true, title: doc.title, content: doc.content };
      }
    },
    delete_document: {
      description: 'Delete a document.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }: Record<string, unknown>) => {
        await requireToolApproval("delete_document", { id });
        await enforce(ctx, "delete", "document");
        await prisma.document.delete({ where: { id: id as string, workspaceId } });
        return { success: true, message: "Document deleted." };
      }
    },
    list_prompt_templates: {
      description: 'List available prompt templates.',
      inputSchema: z.object({}),
      execute: async () => ({ templates: PROMPT_TEMPLATES })
    },
  };
}
