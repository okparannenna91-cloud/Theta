import { z } from "zod";
import { prisma } from "@/lib/prisma";
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
      inputSchema: z.object({ name: z.string(), trigger: z.string(), action: z.string(), config: z.record(z.unknown()) }),
      execute: async ({ name, trigger, action, config }: Record<string, unknown>) => {
        await enforce(ctx, "admin", "workspace");
        const cfg = config as Record<string, unknown>;
        const rawValue = String(cfg.status || cfg.priority || cfg.assignee || cfg.value || Object.values(cfg)[0] || '');
        const automation = await prisma.automation.create({ data: { name: name as string, trigger: trigger as string, action: action as string, actionValue: rawValue, workspaceId, active: true } });
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
        const form = await prisma.form.create({ data: { title: title as string, description: description as string | undefined, fields: JSON.parse(JSON.stringify(fields)), workspaceId, userId: user.id, slug: (title as string).toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() } });
        return { success: true, message: `Form "**${title}**" created.`, url: `/forms/${form.slug}` };
      }
    },
    list_forms: {
      description: 'List all active intake forms.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const forms = await prisma.form.findMany({ where: { workspaceId }, select: { id: true, title: true, slug: true } });
        return { forms };
      }
    },
    get_form_responses: {
      description: 'Retrieve responses for a specific form.',
      inputSchema: z.object({ formId: z.string() }),
      execute: async ({ formId }: Record<string, unknown>) => {
        await enforce(ctx, "read", "workspace");
        await auditToolExecution(workspaceId, user.id, "get_form_responses", { formId });
        const responses = await prisma.formResponse.findMany({ where: { formId: formId as string }, take: 10, orderBy: { createdAt: 'desc' } });
        return { responses: responses.map(r => decryptSensitiveFields("formResponse", r as unknown as Record<string, unknown>).data) };
      }
    },
    browse_templates: {
      description: 'Browse template marketplace.',
      inputSchema: z.object({ category: z.string().optional() }),
      execute: async () => ({ templates: BROWSE_TEMPLATES })
    },
  };
}
