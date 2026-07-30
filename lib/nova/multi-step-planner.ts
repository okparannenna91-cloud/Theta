export interface PlanStep {
  id: number;
  description: string;
  toolHint: string;
  params: Record<string, string>;
  dependsOn?: number[];
}

export interface ExecutionPlan {
  needsPlan: boolean;
  steps: PlanStep[];
  reasoning: string;
}

export async function classifyComplexity(
  prompt: string,
  workspaceContext: string,
): Promise<{ isComplex: boolean; reasoning: string }> {
  return { isComplex: false, reasoning: "Observation mode — multi-step planning is disabled" };
}

export async function generatePlan(
  prompt: string,
  workspaceContext: string,
  availableTools: string[],
): Promise<ExecutionPlan> {
  return { needsPlan: false, steps: [], reasoning: "Observation mode — plan generation is disabled" };
}

export function summarizePlan(plan: ExecutionPlan): string {
  if (!plan.needsPlan || plan.steps.length === 0) {
    return "No multi-step plan needed.";
  }

  const lines = plan.steps.map(
    (s) => `${s.id}. ${s.description}${s.toolHint !== "llm" ? ` [${s.toolHint}]` : ""}${
      s.dependsOn && s.dependsOn.length > 0 ? ` (depends on: ${s.dependsOn.join(", ")})` : ""
    }`,
  );

  return `Plan (${plan.steps.length} steps):\n${lines.join("\n")}`;
}

/**
 * Topologically sort plan steps based on dependencies.
 * Returns steps in execution order, or throws if circular dependency detected.
 */
export function sortPlanByDependencies(steps: PlanStep[]): PlanStep[] {
  const stepMap = new Map(steps.map(s => [s.id, s]));
  const visited = new Set<number>();
  const visiting = new Set<number>();
  const sorted: PlanStep[] = [];

  function dfs(id: number) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Circular dependency detected involving step ${id}`);
    }
    visiting.add(id);
    const step = stepMap.get(id);
    if (step?.dependsOn) {
      for (const depId of step.dependsOn) {
        if (stepMap.has(depId)) {
          dfs(depId);
        }
      }
    }
    visiting.delete(id);
    visited.add(id);
    sorted.push(stepMap.get(id)!);
  }

  for (const step of steps) {
    dfs(step.id);
  }

  return sorted;
}

/**
 * Validate that all dependencies reference existing steps.
 */
export function validatePlanDependencies(steps: PlanStep[]): string[] {
  const errors: string[] = [];
  const ids = new Set(steps.map(s => s.id));
  for (const step of steps) {
    if (step.dependsOn) {
      for (const depId of step.dependsOn) {
        if (!ids.has(depId)) {
          errors.push(`Step ${step.id} depends on non-existent step ${depId}`);
        }
      }
    }
  }
  return errors;
}
