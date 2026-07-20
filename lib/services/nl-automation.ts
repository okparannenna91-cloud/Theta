import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const AutomationConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than", "in"]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const AutomationActionSchema = z.object({
  type: z.enum([
    "create_task", "update_task", "send_notification",
    "send_message", "move_task", "add_comment", "update_custom_field",
  ]),
  params: z.record(z.unknown()),
});

const AutomationRuleSchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.string(),
  conditions: z.array(AutomationConditionSchema).optional(),
  actions: z.array(AutomationActionSchema).min(1).max(10),
});

export type ParsedAutomationRule = z.infer<typeof AutomationRuleSchema>;

const VALID_TRIGGERS = [
  "TASK_CREATED",
  "TASK_STATUS_UPDATED",
  "TASK_COMPLETED",
  "TASK_ASSIGNED",
  "TASK_PRIORITY_CHANGED",
  "DUE_DATE_PASSED",
  "PROJECT_CREATED",
  "SPRINT_STARTED",
  "SPRINT_COMPLETED",
  "FORM_SUBMITTED",
  "DOCUMENT_UPDATED",
  "USER_INVITED",
  "MEMBER_ADDED",
] as const;

const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  TASK_CREATED: "When a task is created",
  TASK_STATUS_UPDATED: "When a task status changes",
  TASK_COMPLETED: "When a task is completed",
  TASK_ASSIGNED: "When a task is assigned to someone",
  TASK_PRIORITY_CHANGED: "When a task priority changes",
  DUE_DATE_PASSED: "When a task's due date passes",
  PROJECT_CREATED: "When a project is created",
  SPRINT_STARTED: "When a sprint starts",
  SPRINT_COMPLETED: "When a sprint is completed",
  FORM_SUBMITTED: "When a form is submitted",
  DOCUMENT_UPDATED: "When a document is updated",
  USER_INVITED: "When a user is invited",
  MEMBER_ADDED: "When a member is added to the workspace",
};

const ACTION_DESCRIPTIONS: Record<string, string> = {
  create_task: "Create a new task",
  update_task: "Update an existing task",
  send_notification: "Send a notification to a user",
  send_message: "Send a message in a channel",
  move_task: "Move a task to a different board/column",
  add_comment: "Add a comment to a task",
  update_custom_field: "Update a custom field value",
};

const SYSTEM_PROMPT = `You are an automation rule parser. Convert natural language descriptions into structured JSON automation rules.

You MUST respond with valid JSON only — no markdown, no explanations.

Output schema:
{
  "name": "string (short, descriptive, max 100 chars)",
  "trigger": "string (must be one of the available triggers)",
  "conditions": [
    {
      "field": "string (e.g. status, priority, assignee, title, projectId, tags)",
      "operator": "equals | not_equals | contains | greater_than | less_than | in",
      "value": "string | number | boolean"
    }
  ],
  "actions": [
    {
      "type": "string (must be one of the available action types)",
      "params": { "key": "value" }
    }
  ]
}

Available triggers:
- TASK_CREATED: When a task is created
- TASK_STATUS_UPDATED: When a task status changes
- TASK_COMPLETED: When a task is completed
- TASK_ASSIGNED: When a task is assigned
- TASK_PRIORITY_CHANGED: When task priority changes
- DUE_DATE_PASSED: When a task's due date passes
- PROJECT_CREATED: When a project is created
- SPRINT_STARTED: When a sprint starts
- SPRINT_COMPLETED: When a sprint is completed
- FORM_SUBMITTED: When a form is submitted
- DOCUMENT_UPDATED: When a document is updated
- USER_INVITED: When a user is invited
- MEMBER_ADDED: When a member is added to the workspace

Available actions and their params:
- create_task: { title: string, projectId?: string, status?: string, priority?: string, assigneeId?: string }
- update_task: { taskId?: string, status?: string, priority?: string, assigneeId?: string, description?: string }
- send_notification: { userId?: string, title: string, message: string }
- send_message: { channelId: string, content: string, projectId?: string }
- move_task: { boardId?: string, columnId?: string, status: string }
- add_comment: { content: string, taskId?: string }
- update_custom_field: { fieldKey: string, value: string | number | boolean, taskId?: string }

Rules:
- conditions is optional — omit if no conditions
- You must infer the most appropriate trigger from the user's description
- actions array must have at least 1 item
- Infer reasonable defaults for unspecified params
- names should be concise and descriptive`;

export function validateAutomationRule(rule: unknown): ParsedAutomationRule {
  return AutomationRuleSchema.parse(rule);
}

export async function parseNaturalLanguageToAutomation(
  input: string,
  _workspaceId: string,
): Promise<ParsedAutomationRule> {
  if (!input.trim()) {
    throw new Error("Automation description cannot be empty.");
  }

  logger.info("Parsing natural language to automation:", input);

  const { generateWithOpenAI } = await import("@/lib/openai");

  const response = await generateWithOpenAI(
    input,
    SYSTEM_PROMPT,
    undefined,
    "gpt-4o-mini",
  );

  if (!response) {
    throw new Error("LLM returned an empty response.");
  }

  let parsed: unknown;
  try {
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("Failed to parse LLM response as JSON.");
  }

  const validated = AutomationRuleSchema.parse(parsed);

  if (!VALID_TRIGGERS.includes(validated.trigger as (typeof VALID_TRIGGERS)[number])) {
    throw new Error(
      `Invalid trigger "${validated.trigger}". Must be one of: ${VALID_TRIGGERS.join(", ")}`,
    );
  }

  logger.info("Parsed automation rule:", validated);
  return validated;
}

export async function createAutomationFromNL(
  input: string,
  workspaceId: string,
  _userId: string,
) {
  const rule = await parseNaturalLanguageToAutomation(input, workspaceId);

  const automation = await prisma.automation.create({
    data: {
      name: rule.name,
      trigger: rule.trigger,
      condition: rule.conditions ? JSON.stringify(rule.conditions) : null,
      action: rule.actions[0].type,
      actionValue: JSON.stringify(rule.actions),
      workspaceId,
      active: true,
    },
  });

  logger.info("Created automation from NL:", automation.id);
  return { automation, rule };
}

export function getAutomationTemplates(): Array<{
  name: string;
  description: string;
  example: string;
  rule: ParsedAutomationRule;
}> {
  return [
    {
      name: "Auto-assign completed tasks",
      description: "When a task is completed, notify the project manager.",
      example: "When a task is completed, send a notification to the project manager",
      rule: {
        name: "Notify on task completion",
        trigger: "TASK_COMPLETED",
        conditions: [],
        actions: [
          { type: "send_notification", params: { title: "Task Completed", message: "A task has been completed." } },
        ],
      },
    },
    {
      name: "High priority task alert",
      description: "When a task is set to high priority, notify the team.",
      example: "When a task is set to high priority, send a notification to the team",
      rule: {
        name: "High priority alert",
        trigger: "TASK_PRIORITY_CHANGED",
        conditions: [{ field: "priority", operator: "equals", value: "high" }],
        actions: [
          { type: "send_notification", params: { title: "High Priority Task", message: "A task has been set to high priority." } },
        ],
      },
    },
    {
      name: "Overdue task reminder",
      description: "When a task passes its due date, add a comment reminding the assignee.",
      example: "When a task is overdue, add a comment reminding the assignee to complete it",
      rule: {
        name: "Overdue reminder",
        trigger: "DUE_DATE_PASSED",
        conditions: [],
        actions: [
          { type: "add_comment", params: { content: "This task is overdue. Please complete it as soon as possible." } },
        ],
      },
    },
    {
      name: "New task onboarding",
      description: "When a task is created, move it to the backlog column.",
      example: "When a task is created, move it to the backlog",
      rule: {
        name: "New task to backlog",
        trigger: "TASK_CREATED",
        conditions: [],
        actions: [
          { type: "move_task", params: { status: "backlog", columnId: "backlog" } },
        ],
      },
    },
    {
      name: "Bug task auto-label",
      description: "When a task with 'bug' in the title is created, set priority to high.",
      example: "When a task is created with 'bug' in the title, set its priority to high",
      rule: {
        name: "Bug auto-prioritize",
        trigger: "TASK_CREATED",
        conditions: [{ field: "title", operator: "contains", value: "bug" }],
        actions: [
          { type: "update_task", params: { priority: "high" } },
        ],
      },
    },
    {
      name: "Project kickoff",
      description: "When a project is created, create a kickoff task.",
      example: "When a new project is created, automatically create a 'Project Kickoff' task",
      rule: {
        name: "Auto-create kickoff task",
        trigger: "PROJECT_CREATED",
        conditions: [],
        actions: [
          { type: "create_task", params: { title: "Project Kickoff", status: "todo", priority: "medium" } },
        ],
      },
    },
  ];
}

export function previewAutomation(rule: ParsedAutomationRule): string {
  const triggerDesc = TRIGGER_DESCRIPTIONS[rule.trigger] || rule.trigger;

  let text = `**${rule.name}**\n\n`;
  text += `**When:** ${triggerDesc}\n`;

  if (rule.conditions && rule.conditions.length > 0) {
    const condStrings = rule.conditions.map((c) => {
      const op = c.operator === "equals" ? "is"
        : c.operator === "not_equals" ? "is not"
        : c.operator === "contains" ? "contains"
        : c.operator === "greater_than" ? "is greater than"
        : c.operator === "less_than" ? "is less than"
        : c.operator === "in" ? "is in"
        : c.operator;
      return `  - ${c.field} ${op} "${c.value}"`;
    });
    text += `**And:**\n${condStrings.join("\n")}\n`;
  }

  text += `**Then:**\n`;
  for (const action of rule.actions) {
    const actionDesc = ACTION_DESCRIPTIONS[action.type] || action.type;
    const paramSummary = Object.entries(action.params)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(", ");
    text += `  - ${actionDesc}${paramSummary ? ` (${paramSummary})` : ""}\n`;
  }

  return text;
}

export async function suggestAutomations(
  workspaceId: string,
): Promise<Array<{ name: string; description: string; rule: ParsedAutomationRule }>> {
  const suggestions: Array<{ name: string; description: string; rule: ParsedAutomationRule }> = [];

  const [taskCount, automationCount, projectCount] = await Promise.all([
    prisma.task.count({ where: { workspaceId } }),
    prisma.automation.count({ where: { workspaceId } }),
    prisma.project.count({ where: { workspaceId } }),
  ]);

  const hasTasks = taskCount > 0;
  const hasProjects = projectCount > 1;
  const hasNoAutomations = automationCount === 0;

  if (hasNoAutomations && hasTasks) {
    suggestions.push({
      name: "Get started with automations",
      description: "Your workspace has tasks but no automations. Start with a simple notification on task completion.",
      rule: {
        name: "Task completion notification",
        trigger: "TASK_COMPLETED",
        conditions: [],
        actions: [
          { type: "send_notification", params: { title: "Task Completed", message: "A task was just completed!" } },
        ],
      },
    });
  }

  if (hasProjects) {
    suggestions.push({
      name: "New project kickoff",
      description: "Automatically create a kickoff checklist when a new project is created.",
      rule: {
        name: "Auto-create kickoff task",
        trigger: "PROJECT_CREATED",
        conditions: [],
        actions: [
          { type: "create_task", params: { title: "Project Kickoff", status: "todo", priority: "medium" } },
        ],
      },
    });
  }

  if (hasTasks) {
    suggestions.push({
      name: "Overdue task alerts",
      description: "Get notified when tasks pass their due date.",
      rule: {
        name: "Overdue task notification",
        trigger: "DUE_DATE_PASSED",
        conditions: [],
        actions: [
          { type: "send_notification", params: { title: "Overdue Task", message: "A task has passed its due date." } },
        ],
      },
    });

    suggestions.push({
      name: "Bug auto-prioritize",
      description: "Automatically set high priority for tasks with 'bug' in the title.",
      rule: {
        name: "Bug high priority",
        trigger: "TASK_CREATED",
        conditions: [{ field: "title", operator: "contains", value: "bug" }],
        actions: [
          { type: "update_task", params: { priority: "high" } },
        ],
      },
    });
  }

  if (taskCount > 20) {
    suggestions.push({
      name: "New task triage",
      description: "Automatically move new tasks to backlog for triage.",
      rule: {
        name: "New task to backlog",
        trigger: "TASK_CREATED",
        conditions: [],
        actions: [
          { type: "move_task", params: { status: "backlog", columnId: "backlog" } },
        ],
      },
    });
  }

  return suggestions;
}
