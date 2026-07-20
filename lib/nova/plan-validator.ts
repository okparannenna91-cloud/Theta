import { logger } from "@/lib/logger";
import type { ExecutionPlan } from "./multi-step-planner";

export interface PlanQualityResult {
  isAcceptable: boolean;
  issues: string[];
  suggestions: string[];
}

/**
 * Validate that a generated plan is high quality.
 * Checks: step count, tool validity, step ordering, completeness.
 */
export function validatePlanQuality(
  plan: ExecutionPlan,
  availableTools: string[],
): PlanQualityResult {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!plan.needsPlan || plan.steps.length === 0) {
    return { isAcceptable: true, issues: [], suggestions: [] };
  }

  // Check 1: Step count sanity
  if (plan.steps.length > 10) {
    issues.push(`Plan has ${plan.steps.length} steps — too many, may be unreliable`);
    suggestions.push("Break this into smaller sub-plans");
  }

  // Check 2: Tool validity
  for (const step of plan.steps) {
    if (step.toolHint !== "llm" && !availableTools.includes(step.toolHint)) {
      issues.push(`Step ${step.id} references unknown tool "${step.toolHint}"`);
    }
  }

  // Check 3: Step ordering (IDs should be sequential)
  const ids = plan.steps.map(s => s.id);
  const expectedIds = Array.from({ length: plan.steps.length }, (_, i) => i + 1);
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
    issues.push("Step IDs are not sequential");
  }

  // Check 4: Each step should have a description
  for (const step of plan.steps) {
    if (!step.description || step.description.trim().length < 5) {
      issues.push(`Step ${step.id} has an unclear description`);
    }
  }

  // Check 5: No duplicate tool hints in sequence (likely a loop)
  for (let i = 1; i < plan.steps.length; i++) {
    if (plan.steps[i].toolHint === plan.steps[i - 1].toolHint && plan.steps[i].toolHint !== "llm") {
      suggestions.push(`Steps ${i} and ${i + 1} use the same tool — consider combining`);
    }
  }

  return {
    isAcceptable: issues.length === 0,
    issues,
    suggestions,
  };
}
