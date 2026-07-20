import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "file_upload"
  | "email"
  | "phone"
  | "rating"
  | "nps"
  | "section_break";

export interface FormFieldDefinition {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  branchRules?: BranchRule[];
}

export interface BranchRule {
  condition: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: string | number;
  action: "show" | "hide" | "skip_to";
  targetFieldId?: string;
}

export interface FormDefinition {
  id: string;
  title: string;
  description: string | null;
  fields: FormFieldDefinition[];
  isPublic: boolean;
  slug: string;
  createdAt: Date;
}

export interface FormSubmission {
  formId: string;
  data: Record<string, unknown>;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    submittedAt?: Date;
  };
}

export interface FormStats {
  totalResponses: number;
  completionRate: number;
  averageTimeToComplete: number;
  fieldStats: {
    fieldId: string;
    label: string;
    responseCount: number;
    distribution?: Record<string, number>;
  }[];
}

interface FormUpdateInput {
  title?: string;
  description?: string;
  fields?: FormFieldDefinition[];
  isPublic?: boolean;
  slug?: string;
}

interface ResponseQueryOptions {
  page?: number;
  limit?: number;
  orderBy?: "asc" | "desc";
}

function toFormDefinition(
  form: {
    id: string;
    title: string;
    description: string | null;
    fields: unknown;
    isPublic: boolean;
    slug: string;
    createdAt: Date;
  },
): FormDefinition {
  return {
    id: form.id,
    title: form.title,
    description: form.description,
    fields: form.fields as FormFieldDefinition[],
    isPublic: form.isPublic,
    slug: form.slug,
    createdAt: form.createdAt,
  };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchesCondition(answerValue: unknown, condition: BranchRule["condition"], ruleValue: string | number): boolean {
  const answer = answerValue == null ? "" : String(answerValue);
  const rule = String(ruleValue);

  switch (condition) {
    case "equals":
      return answer === rule;
    case "not_equals":
      return answer !== rule;
    case "contains":
      return answer.includes(rule);
    case "greater_than":
      return Number(answer) > Number(ruleValue);
    case "less_than":
      return Number(answer) < Number(ruleValue);
    default:
      return false;
  }
}

function validateField(
  field: FormFieldDefinition,
  value: unknown,
): string | null {
  if (field.type === "section_break") return null;

  if (field.required && (value == null || value === "")) {
    return `${field.label} is required`;
  }

  if (value == null || value === "") return null;

  const v = field.validation;
  if (!v) return null;

  const strVal = String(value);
  const numVal = Number(value);

  if (v.minLength != null && strVal.length < v.minLength) {
    return `${field.label} must be at least ${v.minLength} characters`;
  }
  if (v.maxLength != null && strVal.length > v.maxLength) {
    return `${field.label} must be at most ${v.maxLength} characters`;
  }
  if (field.type === "number" || field.type === "rating" || field.type === "nps") {
    if (v.min != null && numVal < v.min) {
      return `${field.label} must be at least ${v.min}`;
    }
    if (v.max != null && numVal > v.max) {
      return `${field.label} must be at most ${v.max}`;
    }
  }
  if (v.pattern) {
    const regex = new RegExp(v.pattern);
    if (!regex.test(strVal)) {
      return `${field.label} does not match the required pattern`;
    }
  }

  return null;
}

function computeFieldDistribution(
  fieldId: string,
  field: FormFieldDefinition,
  responses: { data: unknown }[],
): Record<string, number> | undefined {
  if (field.type !== "dropdown" && field.type !== "radio" && field.type !== "checkbox") {
    return undefined;
  }

  const dist: Record<string, number> = {};
  for (const resp of responses) {
    const data = resp.data as Record<string, unknown>;
    const val = data[fieldId];
    if (val == null) continue;

    if (Array.isArray(val)) {
      for (const v of val) {
        const key = String(v);
        dist[key] = (dist[key] ?? 0) + 1;
      }
    } else {
      const key = String(val);
      dist[key] = (dist[key] ?? 0) + 1;
    }
  }

  return dist;
}

// ── Templates ──

const FORM_TEMPLATES: Record<string, { title: string; description: string; fields: FormFieldDefinition[] }> = {
  "customer-feedback": {
    title: "Customer Feedback Survey",
    description: "Gather customer feedback about your product or service.",
    fields: [
      { id: "name", type: "text", label: "Your Name", required: false },
      { id: "email", type: "email", label: "Email Address", required: true },
      {
        id: "satisfaction",
        type: "nps",
        label: "How likely are you to recommend us? (0-10)",
        required: true,
        validation: { min: 0, max: 10 },
      },
      {
        id: "rating",
        type: "rating",
        label: "Overall Rating",
        required: true,
        validation: { min: 1, max: 5 },
      },
      {
        id: "category",
        type: "dropdown",
        label: "What best describes your feedback?",
        required: true,
        options: [
          { label: "Product Quality", value: "product_quality" },
          { label: "Customer Service", value: "customer_service" },
          { label: "Pricing", value: "pricing" },
          { label: "User Experience", value: "user_experience" },
          { label: "Other", value: "other" },
        ],
      },
      {
        id: "improve_question",
        type: "textarea",
        label: "How can we improve?",
        required: false,
        branchRules: [
          { condition: "greater_than", value: 6, action: "show" },
        ],
      },
      {
        id: "issue_question",
        type: "textarea",
        label: "What issues did you encounter?",
        required: true,
        branchRules: [
          { condition: "less_than", value: 7, action: "show" },
        ],
      },
      { id: "comments", type: "textarea", label: "Additional Comments", required: false },
    ],
  },
  "bug-report": {
    title: "Bug Report Form",
    description: "Report bugs and issues to help us improve.",
    fields: [
      { id: "reporter_name", type: "text", label: "Your Name", required: true },
      { id: "reporter_email", type: "email", label: "Your Email", required: true },
      { id: "bug_title", type: "text", label: "Bug Title", required: true },
      {
        id: "severity",
        type: "radio",
        label: "Severity",
        required: true,
        options: [
          { label: "Low", value: "low" },
          { label: "Medium", value: "medium" },
          { label: "High", value: "high" },
          { label: "Critical", value: "critical" },
        ],
      },
      { id: "environment", type: "text", label: "Environment (OS, Browser, Version)", required: true },
      { id: "steps_to_reproduce", type: "textarea", label: "Steps to Reproduce", required: true },
      { id: "expected_behavior", type: "textarea", label: "Expected Behavior", required: true },
      { id: "actual_behavior", type: "textarea", label: "Actual Behavior", required: true },
      { id: "screenshots", type: "file_upload", label: "Screenshots or Logs", required: false },
      {
        id: "critical_details",
        type: "textarea",
        label: "Additional Critical Details",
        required: false,
        branchRules: [
          { condition: "equals", value: "critical", action: "show" },
        ],
      },
    ],
  },
  "feature-request": {
    title: "Feature Request Form",
    description: "Submit ideas and feature requests.",
    fields: [
      { id: "requester_name", type: "text", label: "Your Name", required: true },
      { id: "requester_email", type: "email", label: "Your Email", required: true },
      { id: "feature_title", type: "text", label: "Feature Title", required: true },
      { id: "feature_description", type: "textarea", label: "Describe the Feature", required: true },
      {
        id: "priority",
        type: "radio",
        label: "How important is this to you?",
        required: true,
        options: [
          { label: "Nice to Have", value: "low" },
          { label: "Important", value: "medium" },
          { label: "Critical", value: "high" },
        ],
      },
      {
        id: "use_case",
        type: "textarea",
        label: "Describe your use case",
        required: true,
      },
      { id: "alternatives", type: "textarea", label: "Any workarounds you currently use?", required: false },
    ],
  },
  "employee-satisfaction": {
    title: "Employee Satisfaction Survey",
    description: "Anonymous survey to gauge employee satisfaction.",
    fields: [
      {
        id: "department",
        type: "dropdown",
        label: "Department",
        required: true,
        options: [
          { label: "Engineering", value: "engineering" },
          { label: "Design", value: "design" },
          { label: "Marketing", value: "marketing" },
          { label: "Sales", value: "sales" },
          { label: "Operations", value: "operations" },
          { label: "Other", value: "other" },
        ],
      },
      {
        id: "overall_satisfaction",
        type: "rating",
        label: "Overall Job Satisfaction",
        required: true,
        validation: { min: 1, max: 5 },
      },
      {
        id: "work_life_balance",
        type: "rating",
        label: "Work-Life Balance",
        required: true,
        validation: { min: 1, max: 5 },
      },
      {
        id: "management_rating",
        type: "rating",
        label: "Management & Leadership",
        required: true,
        validation: { min: 1, max: 5 },
      },
      {
        id: "growth_opportunities",
        type: "rating",
        label: "Growth & Development Opportunities",
        required: true,
        validation: { min: 1, max: 5 },
      },
      {
        id: "consider_leaving",
        type: "radio",
        label: "Have you considered leaving in the past 6 months?",
        required: true,
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ],
        branchRules: [
          { condition: "equals", value: "yes", action: "show" },
        ],
      },
      {
        id: "reason_for_leaving",
        type: "textarea",
        label: "What would make you consider staying?",
        required: false,
        branchRules: [
          { condition: "equals", value: "yes", action: "show" },
        ],
      },
      { id: "improvements", type: "textarea", label: "What could we improve?", required: false },
      { id: "best_part", type: "textarea", label: "What do you enjoy most?", required: false },
    ],
  },
  "event-registration": {
    title: "Event Registration Form",
    description: "Register attendees for your event.",
    fields: [
      { id: "full_name", type: "text", label: "Full Name", required: true },
      { id: "email", type: "email", label: "Email Address", required: true },
      { id: "phone", type: "phone", label: "Phone Number", required: false },
      {
        id: "ticket_type",
        type: "radio",
        label: "Ticket Type",
        required: true,
        options: [
          { label: "General Admission", value: "general" },
          { label: "VIP", value: "vip" },
          { label: "Speaker", value: "speaker" },
        ],
      },
      {
        id: "dietary_requirements",
        type: "checkbox",
        label: "Dietary Requirements",
        required: false,
        options: [
          { label: "None", value: "none" },
          { label: "Vegetarian", value: "vegetarian" },
          { label: "Vegan", value: "vegan" },
          { label: "Gluten-Free", value: "gluten_free" },
          { label: "Halal", value: "halal" },
          { label: "Kosher", value: "kosher" },
        ],
      },
      { id: "special_requests", type: "textarea", label: "Special Requests or Accommodations", required: false },
      { id: "company", type: "text", label: "Company / Organization", required: false },
    ],
  },
  "contact-form": {
    title: "Contact Form",
    description: "Get in touch with us.",
    fields: [
      { id: "name", type: "text", label: "Name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "phone", type: "phone", label: "Phone", required: false },
      {
        id: "inquiry_type",
        type: "dropdown",
        label: "Inquiry Type",
        required: true,
        options: [
          { label: "General Question", value: "general" },
          { label: "Technical Support", value: "support" },
          { label: "Sales", value: "sales" },
          { label: "Partnership", value: "partnership" },
          { label: "Other", value: "other" },
        ],
      },
      { id: "subject", type: "text", label: "Subject", required: true },
      { id: "message", type: "textarea", label: "Message", required: true },
    ],
  },
};

// ── Public API ──

export async function createForm(
  title: string,
  description: string | null,
  workspaceId: string,
  userId: string,
  fields: FormFieldDefinition[],
  isPublic: boolean = false,
): Promise<FormDefinition> {
  let slug = generateSlug(title);
  const existing = await prisma.form.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const form = await prisma.form.create({
    data: {
      title,
      description,
      workspaceId,
      userId,
      fields: fields as unknown as object[],
      isPublic,
      slug,
    },
  });

  logger.info(`Form created: ${form.id} in workspace ${workspaceId}`);

  return toFormDefinition(form);
}

export async function updateForm(
  formId: string,
  updates: FormUpdateInput,
): Promise<FormDefinition> {
  const existing = await prisma.form.findUnique({ where: { id: formId } });
  if (!existing) throw new Error("Form not found");

  const data: Record<string, unknown> = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.fields !== undefined) data.fields = updates.fields;
  if (updates.isPublic !== undefined) data.isPublic = updates.isPublic;
  if (updates.slug !== undefined) {
    const slugExists = await prisma.form.findFirst({
      where: { slug: updates.slug, id: { not: formId } },
    });
    if (slugExists) throw new Error("Slug already in use");
    data.slug = updates.slug;
  }

  const form = await prisma.form.update({
    where: { id: formId },
    data,
  });

  logger.info(`Form updated: ${formId}`);

  return toFormDefinition(form);
}

export async function deleteForm(formId: string): Promise<void> {
  const existing = await prisma.form.findUnique({ where: { id: formId } });
  if (!existing) throw new Error("Form not found");

  await prisma.formResponse.deleteMany({ where: { formId } });
  await prisma.form.delete({ where: { id: formId } });

  logger.info(`Form deleted: ${formId}`);
}

export async function getForm(formId: string): Promise<FormDefinition | null> {
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form) return null;

  return toFormDefinition(form);
}

export async function getFormBySlug(slug: string): Promise<FormDefinition | null> {
  const form = await prisma.form.findFirst({ where: { slug, isPublic: true } });
  if (!form) return null;

  return toFormDefinition(form);
}

export async function getFormsForWorkspace(workspaceId: string): Promise<FormDefinition[]> {
  const forms = await prisma.form.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return forms.map(toFormDefinition);
}

export async function submitForm(
  formId: string,
  submission: FormSubmission,
): Promise<{ id: string; createdAt: Date }> {
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form) throw new Error("Form not found");

  const fields = form.fields as unknown as FormFieldDefinition[];
  const visibleFields = evaluateBranchLogic(fields, submission.data);

  const errors: string[] = [];
  for (const field of visibleFields) {
    const error = validateField(field, submission.data[field.id]);
    if (error) errors.push(error);
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join("; ")}`);
  }

  const dataWithMeta = {
    ...submission.data,
    _metadata: submission.metadata
      ? { ...submission.metadata, submittedAt: submission.metadata.submittedAt ?? new Date() }
      : { submittedAt: new Date() },
  };

  const response = await prisma.formResponse.create({
    data: {
      formId,
      data: dataWithMeta as object,
    },
  });

  logger.info(`Form response submitted: ${response.id} for form ${formId}`);

  try {
    const { processAutomations } = await import("@/lib/automations/engine");
    await processAutomations(form.workspaceId, "FORM_SUBMITTED", {
      userId: "system",
      formId,
      formName: form.title,
    });
  } catch (error) {
    logger.warn(`Failed to fire FORM_SUBMITTED automation: ${error}`);
  }

  return { id: response.id, createdAt: response.createdAt };
}

export async function getFormResponses(
  formId: string,
  options?: ResponseQueryOptions,
): Promise<{
  responses: { id: string; data: Record<string, unknown>; createdAt: Date }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form) throw new Error("Form not found");

  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const skip = (page - 1) * limit;

  const [responses, total] = await Promise.all([
    prisma.formResponse.findMany({
      where: { formId },
      orderBy: { createdAt: options?.orderBy ?? "desc" },
      skip,
      take: limit,
    }),
    prisma.formResponse.count({ where: { formId } }),
  ]);

  return {
    responses: responses.map((r) => ({
      id: r.id,
      data: r.data as Record<string, unknown>,
      createdAt: r.createdAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getFormStats(formId: string): Promise<FormStats> {
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form) throw new Error("Form not found");

  const fields = form.fields as unknown as FormFieldDefinition[];
  const responses = await prisma.formResponse.findMany({
    where: { formId },
    orderBy: { createdAt: "desc" },
  });

  const totalResponses = responses.length;
  const requiredFields = fields.filter((f) => f.required && f.type !== "section_break");

  let completedCount = 0;
  let totalTimeMs = 0;
  let timeCount = 0;

  for (const resp of responses) {
    const data = resp.data as Record<string, unknown>;
    const meta = data._metadata as { submittedAt?: Date } | undefined;
    let allRequired = true;

    for (const field of requiredFields) {
      if (data[field.id] == null || data[field.id] === "") {
        allRequired = false;
        break;
      }
    }

    if (allRequired) completedCount++;

    if (meta?.submittedAt) {
      const start = form.createdAt.getTime();
      const end = new Date(meta.submittedAt).getTime();
      if (end > start) {
        totalTimeMs += end - start;
        timeCount++;
      }
    }
  }

  const completionRate = totalResponses > 0 ? Math.round((completedCount / totalResponses) * 100) : 0;
  const averageTimeToComplete = timeCount > 0 ? Math.round(totalTimeMs / timeCount / 1000) : 0;

  const fieldStats = fields
    .filter((f) => f.type !== "section_break")
    .map((field) => ({
      fieldId: field.id,
      label: field.label,
      responseCount: responses.filter((r) => {
        const data = r.data as Record<string, unknown>;
        return data[field.id] != null && data[field.id] !== "";
      }).length,
      distribution: computeFieldDistribution(field.id, field, responses),
    }));

  return {
    totalResponses,
    completionRate,
    averageTimeToComplete,
    fieldStats,
  };
}

export function evaluateBranchLogic(
  fields: FormFieldDefinition[],
  answers: Record<string, unknown>,
): FormFieldDefinition[] {
  const visible: FormFieldDefinition[] = [];
  let skipUntil: string | null = null;

  for (const field of fields) {
    if (field.type === "section_break") {
      if (skipUntil) {
        if (field.id === skipUntil) skipUntil = null;
        continue;
      }
      visible.push(field);
      continue;
    }

    if (skipUntil) {
      if (field.id === skipUntil) skipUntil = null;
      else continue;
    }

    const rules = field.branchRules;
    if (!rules || rules.length === 0) {
      visible.push(field);
      continue;
    }

    let defaultVisible = true;

    for (const rule of rules) {
      const answerValue = answers[field.id];
      const matched = matchesCondition(answerValue, rule.condition, rule.value);

      if (matched) {
        if (rule.action === "hide") {
          defaultVisible = false;
        } else if (rule.action === "skip_to" && rule.targetFieldId) {
          skipUntil = rule.targetFieldId;
        }
      } else {
        if (rule.action === "show") {
          defaultVisible = false;
        }
      }
    }

    if (defaultVisible) {
      visible.push(field);
    }
  }

  return visible;
}

export async function duplicateForm(
  formId: string,
  newTitle?: string,
): Promise<FormDefinition> {
  const original = await prisma.form.findUnique({ where: { id: formId } });
  if (!original) throw new Error("Form not found");

  const title = newTitle ?? `${original.title} (Copy)`;
  const fields = original.fields as unknown as FormFieldDefinition[];

  return createForm(
    title,
    original.description,
    original.workspaceId,
    original.userId,
    fields,
    original.isPublic,
  );
}

export async function createFormFromTemplate(
  templateType: string,
  workspaceId: string,
): Promise<FormDefinition> {
  const template = FORM_TEMPLATES[templateType];
  if (!template) {
    throw new Error(
      `Unknown template: ${templateType}. Available: ${Object.keys(FORM_TEMPLATES).join(", ")}`,
    );
  }

  const form = await prisma.form.create({
    data: {
      title: template.title,
      description: template.description,
      workspaceId,
      userId: "",
      fields: template.fields as unknown as object[],
      isPublic: false,
      slug: generateSlug(template.title),
    },
  });

  logger.info(`Form created from template "${templateType}": ${form.id}`);

  return toFormDefinition(form);
}

export async function exportFormResponses(
  formId: string,
  format: "csv" | "json",
): Promise<string> {
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form) throw new Error("Form not found");

  const responses = await prisma.formResponse.findMany({
    where: { formId },
    orderBy: { createdAt: "asc" },
  });

  const fields = form.fields as unknown as FormFieldDefinition[];
  const fieldIds = fields.filter((f) => f.type !== "section_break").map((f) => f.id);

  if (format === "json") {
    const records = responses.map((r) => {
      const data = r.data as Record<string, unknown>;
      const { _metadata, ...cleanData } = data;
      return { id: r.id, ...cleanData, createdAt: r.createdAt.toISOString() };
    });
    return JSON.stringify(records, null, 2);
  }

  const headers = ["id", "createdAt", ...fieldIds];
  const csvEscape = (val: unknown): string => {
    if (val == null) return "";
    const str = Array.isArray(val) ? val.join("; ") : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = responses.map((r) => {
    const data = r.data as Record<string, unknown>;
    return [
      r.id,
      r.createdAt.toISOString(),
      ...fieldIds.map((fid) => csvEscape(data[fid])),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export const getAvailableTemplates = (): { key: string; title: string; description: string }[] => {
  return Object.entries(FORM_TEMPLATES).map(([key, t]) => ({
    key,
    title: t.title,
    description: t.description,
  }));
};
