export type TaskComplexity = "SIMPLE" | "REASONING" | "CRITICAL";
export type ModelProvider = "OPENROUTER" | "COHERE" | "OPENAI" | "GEMINI";

export interface ModelConfig {
  provider: ModelProvider;
  layer: "primary" | "secondary" | "emergency" | "ultimate";
  purpose: string;
  defaultModel?: string;
}

export const MODEL_STACK: ModelConfig[] = [
  {
    provider: "OPENROUTER",
    layer: "primary",
    purpose: "Default entry point for most AI requests — Model routing, Cost optimization, Provider redundancy",
    defaultModel: "google/gemini-flash-1.5",
  },
  {
    provider: "COHERE",
    layer: "secondary",
    purpose: "Fallback execution, Text generation, Summarization — Maintains reliability if primary routing fails",
  },
  {
    provider: "OPENAI",
    layer: "emergency",
    purpose: "Critical workflows, High-value tasks, Reliability backup — Reserved for quality/reliability importance",
  },
  {
    provider: "GEMINI",
    layer: "ultimate",
    purpose: "Last resort fallback — Native Google Gemini API when all other providers are unavailable",
  },
];

export interface ModelSelectionStrategy {
  complexity: TaskComplexity;
  description: string;
  recommendedModels: string[];
}

export const MODEL_SELECTION_STRATEGIES: ModelSelectionStrategy[] = [
  {
    complexity: "SIMPLE",
    description: "Summaries, Rewrites, Formatting",
    recommendedModels: ["google/gemini-flash-1.5"],
  },
  {
    complexity: "REASONING",
    description: "Sprint planning, Dependency analysis, Workflow generation",
    recommendedModels: ["anthropic/claude-3-5-sonnet", "openai/gpt-4o"],
  },
  {
    complexity: "CRITICAL",
    description: "Executive reports, Risk assessments, Project forecasting",
    recommendedModels: ["openai/gpt-4o"],
  },
];

export const MODEL_SELECTION_RULES: string[] = [
  "No feature should directly depend on a specific model — depend on the Nova AI Layer instead",
  "If a model fails: Retry → Switch provider → Switch model → Notify user",
  "Nova should never silently fail",
  "Users should never need to know which model handled a request",
];

export function getModelForComplexity(complexity: TaskComplexity): string {
  const strategy = MODEL_SELECTION_STRATEGIES.find(s => s.complexity === complexity);
  return strategy?.recommendedModels[0] ?? MODEL_STACK[0].defaultModel ?? "google/gemini-flash-1.5";
}
