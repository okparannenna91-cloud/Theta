import type { LangGraphToolContext } from "../tools/wrapper";
import { executeTool } from "./tool-executor";
import type { ToolExecutionResult } from "./tool-executor";

export interface PlanStep {
  tool: string;
  params: Record<string, unknown>;
  description: string;
}

export interface AgentPlan {
  agentId: string;
  agentName: string;
  steps: PlanStep[];
}

export interface PlanResult {
  plans: AgentPlan[];
  results: ToolExecutionResult[][];
}

export async function planAndExecute(
  prompt: string,
  ctx: LangGraphToolContext,
): Promise<PlanResult> {
  const { AgentFramework } = await import("@/lib/nova/agent-framework");
  const plans = await AgentFramework.planExecution(prompt);

  if (plans.length === 0) {
    return { plans: [], results: [] };
  }

  const agentPlans: AgentPlan[] = [];
  const allResults: ToolExecutionResult[][] = [];

  for (const plan of plans) {
    const agent = AgentFramework.getAgent(plan.agentId);
    const stepResults: ToolExecutionResult[] = [];

    for (const step of plan.steps) {
      const result = await executeTool(ctx, step.tool, step.params);
      stepResults.push(result);
    }

    agentPlans.push({
      agentId: plan.agentId,
      agentName: agent?.name || plan.agentId,
      steps: plan.steps,
    });
    allResults.push(stepResults);
  }

  return { plans: agentPlans, results: allResults };
}

export function formatPlanResponse(
  planResult: PlanResult,
  originalPrompt: string,
): string {
  if (planResult.plans.length === 0) return "";

  const lines: string[] = [];
  lines.push(`Done! I completed ${planResult.plans.length} step(s) for: "${originalPrompt}".`);
  lines.push("");

  for (let i = 0; i < planResult.plans.length; i++) {
    const plan = planResult.plans[i];
    const stepResults = planResult.results[i];
    for (let j = 0; j < plan.steps.length; j++) {
      const result = stepResults[j];
      if (result.success) {
        const msg = typeof result.result === "object" && result.result
          ? (result.result as any).message || "Completed"
          : String(result.result || "Completed");
        lines.push(`- ${msg}`);
      } else {
        lines.push(`- Something went wrong with that step.`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
