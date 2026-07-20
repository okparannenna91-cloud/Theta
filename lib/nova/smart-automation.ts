import { z } from "zod";
import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { AutomationIntelligence, type AutomatedWorkflow } from "./automation-intelligence";
import { TRIGGER_DEFINITIONS, ACTION_DEFINITIONS } from "./automation-intelligence";

export const AutomationRuleSchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.object({
    type: z.string(),
    conditions: z.record(z.string(), z.unknown()).optional(),
  }),
  actions: z.array(
    z.object({
      type: z.string(),
      params: z.record(z.string(), z.unknown()).optional(),
    })
  ).min(1).max(5),
  explanation: z.string(),
});

export type AutomationRule = z.infer<typeof AutomationRuleSchema>;

export class SmartAutomation {
  static async parseNLToRule(nlCommand: string): Promise<AutomationRule> {
    const triggers = TRIGGER_DEFINITIONS.map(
      (t) => `${t.trigger}: ${t.description}`
    ).join("\n");
    const actions = ACTION_DEFINITIONS.map(
      (a) => `${a.action}: ${a.description}`
    ).join("\n");

    const prompt = `You are an automation rule parser. Convert natural language into a structured automation rule.

Available Triggers:
${triggers}

Available Actions:
${actions}

User Instruction: "${nlCommand}"

Respond with ONLY a valid JSON object:
{
  "name": "short descriptive name (max 100 chars)",
  "trigger": {
    "type": "TRIGGER_TYPE",
    "conditions": { "field_name": "value" }
  },
  "actions": [
    { "type": "ACTION_TYPE", "params": { "key": "value" } }
  ],
  "explanation": "human-readable explanation of what this rule does"
}

Rules:
- Use ONLY the trigger and action types listed above
- Conditions object is optional — only include if the user specified conditions
- Keep it simple — one trigger, 1-5 actions
- If the instruction is ambiguous, make your best interpretation`;

    try {
      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "You are a JSON-only parser. Respond with valid JSON only, no markdown, no explanation.",
        prompt
      );

      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const result = AutomationRuleSchema.safeParse(parsed);
      if (!result.success) {
        logger.warn("[SmartAutomation] Zod validation failed, falling back to NLP:", result.error.errors);
        return this.fallbackNLToRule(nlCommand);
      }

      return result.data;
    } catch (error) {
      logger.warn("[SmartAutomation] LLM parsing failed, falling back to NLP:", error);
      return this.fallbackNLToRule(nlCommand);
    }
  }

  private static fallbackNLToRule(nlCommand: string): AutomationRule {
    const workflow: AutomatedWorkflow = AutomationIntelligence.translateNL(nlCommand);
    return {
      name: workflow.name,
      trigger: {
        type: workflow.trigger,
        conditions: {},
      },
      actions: [
        {
          type: workflow.action,
          params: workflow.config as Record<string, unknown>,
        },
      ],
      explanation: workflow.explanation,
    };
  }

  static previewRule(rule: AutomationRule): string {
    const lines: string[] = [];
    lines.push(`**Automation Preview: ${rule.name}**`);
    lines.push("");
    lines.push(`Trigger: When ${rule.trigger.type.replace(/_/g, " ").toLowerCase()}`);

    if (rule.trigger.conditions && Object.keys(rule.trigger.conditions).length > 0) {
      const conditions = Object.entries(rule.trigger.conditions)
        .map(([k, v]) => `${k} = ${String(v)}`)
        .join(", ");
      lines.push(`  Conditions: ${conditions}`);
    }

    lines.push("");
    lines.push("Actions:");
    for (const action of rule.actions) {
      const paramStr = action.params && Object.keys(action.params).length > 0
        ? ` (${Object.entries(action.params).map(([k, v]) => `${k}=${String(v)}`).join(", ")})`
        : "";
      lines.push(`  - ${action.type.replace(/_/g, " ").toLowerCase()}${paramStr}`);
    }

    lines.push("");
    lines.push(`Explanation: ${rule.explanation}`);
    lines.push("");
    lines.push("**Dry Run Simulation:**");
    lines.push("If this rule were active right now:");

    const triggerDesc = rule.trigger.type.replace(/_/g, " ").toLowerCase();
    lines.push(`- The system would listen for "${triggerDesc}" events`);

    if (rule.trigger.conditions && Object.keys(rule.trigger.conditions).length > 0) {
      lines.push(`- Only events matching the conditions would trigger this rule`);
    }

    for (const action of rule.actions) {
      const actionDesc = action.type.replace(/_/g, " ").toLowerCase();
      lines.push(`- It would ${actionDesc}${action.params ? ` with parameters: ${JSON.stringify(action.params)}` : ""}`);
    }

    return lines.join("\n");
  }

  static async getSuggestedRules(workspaceId: string): Promise<AutomationRule[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [statusChanges, assignments, tasks] = await Promise.all([
      prisma.activity.findMany({
        where: {
          workspaceId,
          action: { in: ["status_changed", "STATUS_UPDATED"] },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { metadata: true },
        take: 200,
      }),
      prisma.activity.findMany({
        where: {
          workspaceId,
          action: { in: ["assigned", "TASK_ASSIGNED"] },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { metadata: true },
        take: 200,
      }),
      prisma.task.findMany({
        where: { workspaceId },
        select: {
          title: true,
          status: true,
          priority: true,
          assigneeIds: true,
          dueDate: true,
        },
        take: 200,
      }),
    ]);

    const statusTransitionCounts = new Map<string, number>();
    for (const act of statusChanges) {
      const meta = act.metadata as Record<string, unknown> | null;
      const from = String(meta?.oldValue || meta?.from || "unknown");
      const to = String(meta?.newValue || meta?.to || "unknown");
      const key = `${from}->${to}`;
      statusTransitionCounts.set(key, (statusTransitionCounts.get(key) || 0) + 1);
    }

    const frequentTransitions = Array.from(statusTransitionCounts.entries())
      .filter(([, count]) => count >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const overdueCount = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "completed"
    ).length;

    const unassignedCount = tasks.filter((t) => t.assigneeIds.length === 0).length;

    const highPriorityUnassigned = tasks.filter(
      (t) => t.priority === "high" && t.assigneeIds.length === 0
    ).length;

    const contextSummary = `
Workspace analysis (last 30 days):
- Frequent status transitions: ${frequentTransitions.map(([k, v]) => `${k} (${v}x)`).join(", ") || "none detected"}
- Overdue tasks: ${overdueCount}
- Unassigned tasks: ${unassignedCount}
- High-priority unassigned: ${highPriorityUnassigned}
- Total active tasks: ${tasks.filter((t) => t.status !== "done" && t.status !== "completed").length}
`.trim();

    const prompt = `You are an automation rule suggestion engine. Based on workspace patterns, suggest 2-4 useful automation rules.

${contextSummary}

Available Triggers:
${TRIGGER_DEFINITIONS.map((t) => `${t.trigger}: ${t.description}`).join("\n")}

Available Actions:
${ACTION_DEFINITIONS.map((a) => `${a.action}: ${a.description}`).join("\n")}

For each suggestion, respond with a JSON array of objects:
[
  {
    "name": "descriptive name",
    "trigger": { "type": "TRIGGER_TYPE", "conditions": {} },
    "actions": [{ "type": "ACTION_TYPE", "params": {} }],
    "explanation": "why this rule is useful based on the patterns above"
  }
]

Rules:
- Base suggestions on the actual patterns above
- Only use valid trigger/action types
- Be specific — reference actual data patterns
- Keep rules simple and practical
- Return ONLY the JSON array`;

    try {
      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "You are a JSON-only parser. Respond with a valid JSON array only, no markdown.",
        prompt
      );

      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        logger.warn("[SmartAutomation] LLM response is not an array");
        return [];
      }

      const rules: AutomationRule[] = [];
      for (const item of parsed) {
        const result = AutomationRuleSchema.safeParse(item);
        if (result.success) {
          rules.push(result.data);
        }
      }

      return rules;
    } catch (error) {
      logger.warn("[SmartAutomation] LLM suggestion failed:", error);
      return this.generateStaticSuggestions(overdueCount, unassignedCount, highPriorityUnassigned);
    }
  }

  private static generateStaticSuggestions(
    overdueCount: number,
    unassignedCount: number,
    highPriorityUnassigned: number,
  ): AutomationRule[] {
    const suggestions: AutomationRule[] = [];

    if (overdueCount > 0) {
      suggestions.push({
        name: "Overdue Task Alert",
        trigger: { type: "DUE_DATE_PASSED", conditions: {} },
        actions: [
          { type: "send_notification", params: { title: "Overdue Task", message: "You have an overdue task" } },
        ],
        explanation: `Detected ${overdueCount} overdue task(s). This rule notifies assignees when tasks become overdue.`,
      });
    }

    if (highPriorityUnassigned > 0) {
      suggestions.push({
        name: "High Priority Unassigned Alert",
        trigger: { type: "TASK_CREATED", conditions: { priority: "high" } },
        actions: [
          { type: "send_notification", params: { title: "High Priority Task", message: "New high-priority task needs assignment" } },
        ],
        explanation: `Detected ${highPriorityUnassigned} high-priority unassigned tasks. This rule alerts the team when unassigned high-priority tasks are created.`,
      });
    }

    if (unassignedCount > 3) {
      suggestions.push({
        name: "Auto-assign to Team Lead",
        trigger: { type: "TASK_CREATED", conditions: { assigneeIds: "empty" } },
        actions: [
          { type: "update_task", params: { assigneeId: "team_lead" } },
        ],
        explanation: `Detected ${unassignedCount} unassigned tasks. This rule auto-assigns new tasks to the team lead.`,
      });
    }

    suggestions.push({
      name: "Sprint Completion Report",
      trigger: { type: "SPRINT_COMPLETED", conditions: {} },
      actions: [
        { type: "send_notification", params: { title: "Sprint Completed", message: "Sprint completed — view the summary report" } },
      ],
      explanation: "Automatically generate and share a sprint summary report when a sprint ends.",
    });

    return suggestions;
  }
}
