import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";

export interface PlanStep {
  id: number;
  description: string;
  toolHint: string;
  params: Record<string, string>;
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
  const contextSnippet = workspaceContext
    ? `\n\nWorkspace context (truncated):\n${workspaceContext.slice(0, 1000)}`
    : "";

  const classificationPrompt = `You are a request complexity classifier. Determine if this user request requires multiple sequential tool calls or just a single action/response.

A request is COMPLEX if it:
- Involves multiple distinct actions (e.g., "create a task AND assign it to John")
- Requires lookups before acting (e.g., "find all overdue tasks and send a summary")
- Has conditional logic (e.g., "if project X exists, update it, otherwise create it")
- Chains dependent operations (e.g., "create a project, then add 3 tasks to it")

A request is SIMPLE if it:
- Is a single question or chat message
- Requires at most one tool call
- Is a greeting or acknowledgment
- Is a single create/update/delete action
- Is asking for information (list, show, find)

User request: "${prompt}"${contextSnippet}

Respond with ONLY a JSON object:
{"isComplex": true/false, "reasoning": "brief explanation"}`;

  try {
    const response = await executeWithProvider(
      "gemini",
      "gemini-2.5-flash",
      "You are a JSON-only classifier. Respond with valid JSON only.",
      classificationPrompt,
    );

    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      isComplex: !!parsed.isComplex,
      reasoning: parsed.reasoning || "LLM classification",
    };
  } catch (error) {
    logger.warn("[MultiStepPlanner] Complexity classification failed, assuming simple:", error);
    return { isComplex: false, reasoning: "Classification failed, defaulting to simple" };
  }
}

export async function generatePlan(
  prompt: string,
  workspaceContext: string,
  availableTools: string[],
): Promise<ExecutionPlan> {
  const contextSnippet = workspaceContext
    ? `\n\nWorkspace context:\n${workspaceContext.slice(0, 2000)}`
    : "";

  const toolsList = availableTools.join(", ");

  const planPrompt = `You are a task planner. Break this user request into a sequence of actionable steps.

Available tools: ${toolsList}

For each step, provide:
- description: what to do (natural language)
- toolHint: which tool to use (must be one of the available tools, or "llm" if no tool needed)
- params: key-value pairs for the tool

User request: "${prompt}"${contextSnippet}

Respond with ONLY a JSON object:
{
  "needsPlan": true,
  "steps": [
    {"id": 1, "description": "...", "toolHint": "tool_name", "params": {"key": "value"}},
    {"id": 2, "description": "...", "toolHint": "llm", "params": {}}
  ],
  "reasoning": "brief explanation of the plan"
}`;

  try {
    const response = await executeWithProvider(
      "gemini",
      "gemini-2.5-flash",
      "You are a JSON-only planner. Respond with valid JSON only.",
      planPrompt,
    );

    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      needsPlan: !!parsed.needsPlan,
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      reasoning: parsed.reasoning || "LLM plan generation",
    };
  } catch (error) {
    logger.warn("[MultiStepPlanner] Plan generation failed:", error);
    return { needsPlan: false, steps: [], reasoning: "Plan generation failed" };
  }
}

export function summarizePlan(plan: ExecutionPlan): string {
  if (!plan.needsPlan || plan.steps.length === 0) {
    return "No multi-step plan needed.";
  }

  const lines = plan.steps.map(
    (s) => `${s.id}. ${s.description}${s.toolHint !== "llm" ? ` [${s.toolHint}]` : ""}`,
  );

  return `Plan (${plan.steps.length} steps):\n${lines.join("\n")}`;
}
