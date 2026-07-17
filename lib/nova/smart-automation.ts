import { z } from "zod";
import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";
import { TRIGGER_DEFINITIONS, ACTION_DEFINITIONS, type AutomationTrigger, type AutomationAction } from "./constitution/automation-standards";

// ──────────────────────────────────────────────
//  Zod Schemas for Automation Rules
// ──────────────────────────────────────────────

export const AutomationConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than"]),
  value: z.string(),
});

export const AutomationTriggerSchema = z.object({
  type: z.string(),
  conditions: z.array(AutomationConditionSchema).optional(),
});

export const AutomationActionSchema = z.object({
  type: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const AutomationRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  trigger: AutomationTriggerSchema,
  actions: z.array(AutomationActionSchema).min(1).max(5),
  enabled: z.boolean().default(true),
});

export type AutomationCondition = z.infer<typeof AutomationConditionSchema>;
export type AutomationTriggerConfig = z.infer<typeof AutomationTriggerSchema>;
export type AutomationActionConfig = z.infer<typeof AutomationActionSchema>;
export type SmartAutomationRule = z.infer<typeof AutomationRuleSchema>;

// ──────────────────────────────────────────────
//  LLM-Based Automation Parser
// ──────────────────────────────────────────────

export class SmartAutomationEngine {
  /**
   * Parse natural language into a structured automation rule using LLM
   */
  static async parseNaturalLanguage(
    userInput: string,
    workspaceContext?: string,
  ): Promise<SmartAutomationRule> {
    const triggers = TRIGGER_DEFINITIONS.map(t => `${t.trigger}: ${t.description}`).join("\n");
    const actions = ACTION_DEFINITIONS.map(a => `${a.action}: ${a.description}`).join("\n");

    const prompt = `You are an automation rule parser. Convert natural language instructions into a structured automation rule.

Available Triggers:
${triggers}

Available Actions:
${actions}

Condition operators: equals, not_equals, contains, greater_than, less_than

User Instruction: "${userInput}"
${workspaceContext ? `\nWorkspace Context: ${workspaceContext}` : ""}

Respond with ONLY a valid JSON object matching this schema:
{
  "name": "short descriptive name (max 100 chars)",
  "description": "what this automation does (max 500 chars)",
  "trigger": {
    "type": "TRIGGER_TYPE",
    "conditions": [
      { "field": "field_name", "operator": "operator", "value": "value" }
    ]
  },
  "actions": [
    { "type": "ACTION_TYPE", "params": { "key": "value" } }
  ],
  "enabled": true
}

Rules:
- Use ONLY the trigger and action types listed above
- Conditions are optional — only include if the user specified conditions
- Keep it simple — one trigger, 1-5 actions
- Name should be concise and descriptive
- If the instruction is ambiguous, make your best interpretation`;

    try {
      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "You are a JSON-only parser. Respond with valid JSON only, no markdown, no explanation.",
        prompt,
      );

      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Validate with Zod
      const result = AutomationRuleSchema.safeParse(parsed);
      if (!result.success) {
        logger.warn("[SmartAutomation] Zod validation failed:", result.error.errors);
        throw new Error(`Invalid automation rule: ${result.error.errors.map(e => e.message).join(", ")}`);
      }

      return result.data;
    } catch (error) {
      logger.warn("[SmartAutomation] LLM parsing failed:", error);
      throw error;
    }
  }

  /**
   * Validate an automation rule against available triggers/actions
   */
  static validateRule(rule: SmartAutomationRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const validTriggerTypes = TRIGGER_DEFINITIONS.map(t => t.trigger);
    if (!validTriggerTypes.includes(rule.trigger.type as AutomationTrigger)) {
      errors.push(`Invalid trigger type: ${rule.trigger.type}. Valid types: ${validTriggerTypes.join(", ")}`);
    }

    const validActionTypes = ACTION_DEFINITIONS.map(a => a.action);
    for (const action of rule.actions) {
      if (!validActionTypes.includes(action.type as AutomationAction)) {
        errors.push(`Invalid action type: ${action.type}. Valid types: ${validActionTypes.join(", ")}`);
      }
    }

    if (rule.actions.length === 0) {
      errors.push("At least one action is required");
    }

    if (rule.actions.length > 5) {
      errors.push("Maximum 5 actions allowed");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate a human-readable explanation of the automation rule
   */
  static explainRule(rule: SmartAutomationRule): string {
    const triggerDef = TRIGGER_DEFINITIONS.find(t => t.trigger === rule.trigger.type);
    const triggerDesc = triggerDef?.description || rule.trigger.type;

    let explanation = `When ${triggerDesc.toLowerCase()}`;

    if (rule.trigger.conditions && rule.trigger.conditions.length > 0) {
      const conditions = rule.trigger.conditions
        .map(c => `${c.field} ${c.operator} "${c.value}"`)
        .join(" and ");
      explanation += ` (if ${conditions})`;
    }

    explanation += ", then:\n";

    for (const action of rule.actions) {
      const actionDef = ACTION_DEFINITIONS.find(a => a.action === action.type);
      const actionDesc = actionDef?.description || action.type;
      explanation += `  - ${actionDesc}`;

      if (action.params && Object.keys(action.params).length > 0) {
        const params = Object.entries(action.params)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        explanation += ` (${params})`;
      }
      explanation += "\n";
    }

    return explanation.trim();
  }

  /**
   * Get example automations for onboarding
   */
  static getExampleAutomations(): Array<{ naturalLanguage: string; rule: Partial<SmartAutomationRule> }> {
    return [
      {
        naturalLanguage: "When a task is completed, notify the project owner",
        rule: {
          name: "Task Completion Notification",
          trigger: { type: "TASK_COMPLETED" },
          actions: [{ type: "SEND_NOTIFICATION", params: { target: "project_owner" } }],
        },
      },
      {
        naturalLanguage: "If a task is overdue for more than 3 days, assign it to the team lead",
        rule: {
          name: "Overdue Task Reassignment",
          trigger: { type: "TASK_OVERDUE", conditions: [{ field: "days_overdue", operator: "greater_than", value: "3" }] },
          actions: [{ type: "SET_ASSIGNEE", params: { assignTo: "team_lead" } }],
        },
      },
      {
        naturalLanguage: "When a form is submitted, create a task and notify the team",
        rule: {
          name: "Form Submission Handler",
          trigger: { type: "FORM_SUBMITTED" },
          actions: [
            { type: "CREATE_TASK", params: { source: "form" } },
            { type: "NOTIFY_TEAM", params: { message: "New form submission received" } },
          ],
        },
      },
    ];
  }
}
