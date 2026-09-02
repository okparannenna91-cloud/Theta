import { logger } from "@/lib/logger";

export interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in";
  value: string | number | boolean | Array<string | number | boolean>;
}

export type ConditionContext = Record<string, unknown>;

/**
 * Evaluate a stored condition JSON string against a trigger context.
 * A null/empty conditions string, or an empty array, always matches.
 */
export function evaluateConditions(
  conditionsRaw: string | null,
  context: ConditionContext
): boolean {
  if (!conditionsRaw) return true;

  let conditions: AutomationCondition[];
  try {
    conditions = JSON.parse(conditionsRaw);
  } catch {
    logger.warn("[Automation] Failed to parse conditions JSON");
    return false;
  }

  if (!Array.isArray(conditions) || conditions.length === 0) return true;

  for (const condition of conditions) {
    const fieldValue = context[condition.field];

    switch (condition.operator) {
      case "equals":
        if (String(fieldValue ?? "") !== String(condition.value)) return false;
        break;
      case "not_equals":
        if (String(fieldValue ?? "") === String(condition.value)) return false;
        break;
      case "contains":
        if (typeof fieldValue === "string") {
          if (!fieldValue.toLowerCase().includes(String(condition.value).toLowerCase())) return false;
        } else if (Array.isArray(fieldValue)) {
          if (!fieldValue.some((v) => String(v).toLowerCase().includes(String(condition.value).toLowerCase()))) return false;
        } else {
          return false;
        }
        break;
      case "greater_than":
        if (Number(fieldValue) <= Number(condition.value)) return false;
        break;
      case "less_than":
        if (Number(fieldValue) >= Number(condition.value)) return false;
        break;
      case "in": {
        const values = Array.isArray(condition.value)
          ? condition.value.map(String)
          : String(condition.value).split(",").map((s) => s.trim());
        if (Array.isArray(fieldValue)) {
          if (!fieldValue.some((v) => values.includes(String(v)))) return false;
        } else {
          if (!values.includes(String(fieldValue ?? ""))) return false;
        }
        break;
      }
    }
  }

  return true;
}

/**
 * Whether a workspace-wide or project-scoped automation rule matches the
 * project a trigger fired for. Rules with projectId === null apply to the
 * whole workspace; rules scoped to a different project do not fire.
 */
export function matchesProjectScope(
  ruleProjectId: string | null | undefined,
  eventProjectId: string | null | undefined
): boolean {
  if (!ruleProjectId) return true;
  return !!eventProjectId && ruleProjectId === eventProjectId;
}
