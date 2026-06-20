import { z } from "zod";
import { getPrismaClient } from "@/lib/prisma";
import { BROWSE_TEMPLATES } from "@/lib/constants/templates";
import { decryptSensitiveFields } from "@/lib/field-encryption";
import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import { type ToolContext, type ToolModule, enforce, auditToolExecution } from "./index";

export function buildAutomationTools(ctx: ToolContext): ToolModule {
  const { user, workspaceId } = ctx;

  return {
    create_automation: {
      description: 'Create a new automated workflow in the workspace.',
      inputSchema: z.object({ name: z.string(), trigger: z.string(), action: z.string(), config: z.record(z.any()) }),
      execute: async ({ name, trigger, action, config }: Record<string, unknown>) => {
        await enforce(ctx, "admin", "workspace");
        const db = getPrismaClient(workspaceId);
        const automation = await db.automation.create({ data: { name: name as string, trigger: trigger as string, action: action as string, actionValue: JSON.stringify(config), workspaceId, active: true } });
        try {
          await inngest.send({ name: "automation/created", data: { automationId: automation.id, workspaceId } });
        } catch (e) { logger.warn("Failed to notify Inngest of automation creation:", e); }
        return { success: true, message: `Automation "**${name}**" has been created and activated.` };
      }
    },
    create_form: {
      description: 'Create an intake form.',
      inputSchema: z.object({ title: z.string(), description: z.string().optional(), fields: z.array(z.object({ label: z.string(), type: z.enum(['text', 'number', 'select', 'date']), required: z.boolean() })) }),
      execute: async ({ title, description, fields }: Record<string, unknown>) => {
        await enforce(ctx, "admin", "workspace");
        const db = getPrismaClient(workspaceId);
        const form = await db.form.create({ data: { title: title as string, description: description as string | undefined, fields: JSON.parse(JSON.stringify(fields)), workspaceId, userId: user.id, slug: (title as string).toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() } });
        return { success: true, message: `Form "**${title}**" created.`, url: `/forms/${form.slug}` };
      }
    },
    list_forms: {
      description: 'List all active intake forms.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const db = getPrismaClient(workspaceId);
        const forms = await db.form.findMany({ where: { workspaceId }, select: { id: true, title: true, slug: true } });
        return { forms };
      }
    },
    get_form_responses: {
      description: 'Retrieve responses for a specific form.',
      inputSchema: z.object({ formId: z.string() }),
      execute: async ({ formId }: Record<string, unknown>) => {
        await enforce(ctx, "read", "workspace");
        await auditToolExecution(workspaceId, user.id, "get_form_responses", { formId });
        const db = getPrismaClient(workspaceId);
        const responses = await db.formResponse.findMany({ where: { formId: formId as string }, take: 10, orderBy: { createdAt: 'desc' } });
        return { responses: responses.map(r => decryptSensitiveFields("formResponse", r as unknown as Record<string, unknown>).data) };
      }
    },
    browse_templates: {
      description: 'Browse template marketplace.',
      inputSchema: z.object({ category: z.string().optional() }),
      execute: async () => ({ templates: BROWSE_TEMPLATES })
    },
    propose_custom_module: {
      description: 'Propose a new custom module structure.',
      inputSchema: z.object({ moduleName: z.string(), features: z.array(z.string()) }),
      execute: async ({ moduleName, features }: Record<string, unknown>) => {
        const featList = features as string[];
        return { proposal: { module: moduleName, schema: featList.map((f: string) => ({ field: f, type: "String" })), ui: ["Table View", "Detail Sidebar", "Create Modal"] }, note: "Ready for App Builder." };
      }
    },
  };
}
