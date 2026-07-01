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
    defaultModel: "openrouter/free",
  },
  {
    provider: "GEMINI",
    layer: "secondary",
    purpose: "Fallback execution, Text generation, Summarization — Maintains reliability if primary routing fails",
    defaultModel: "gemini-2.5-flash",
  },
  {
    provider: "COHERE",
    layer: "emergency",
    purpose: "Workspace intelligence, Text generation, Summarization — Third layer fallback",
    defaultModel: "command-a-03-2025",
  },
  {
    provider: "OPENAI",
    layer: "ultimate",
    purpose: "Last resort fallback — OpenAI API when all other providers are unavailable",
    defaultModel: "gpt-4o-mini",
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
    recommendedModels: ["openrouter/free"],
  },
  {
    complexity: "REASONING",
    description: "Sprint planning, Dependency analysis, Workflow generation",
    recommendedModels: ["openrouter/free", "gemini-2.5-flash"],
  },
  {
    complexity: "CRITICAL",
    description: "Executive reports, Risk assessments, Project forecasting",
    recommendedModels: ["openrouter/free", "gpt-4o-mini"],
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
  return strategy?.recommendedModels[0] ?? MODEL_STACK[0].defaultModel ?? "openrouter/free";
}
