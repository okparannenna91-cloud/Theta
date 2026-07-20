import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { logger } from "@/lib/logger";
import { getLangChainModel } from "./models";

export type RouterProvider = "openrouter" | "openai" | "gemini" | "cohere";

export interface RouterConfig {
  provider: RouterProvider;
  model: string;
  reason: string;
  costTier: "low" | "medium" | "high";
}

export type TaskCategory = "chat" | "reasoning" | "retrieval" | "action" | "analysis" | "creative" | "code";

const MODEL_COSTS: Record<string, { input: number; output: number; tier: "low" | "medium" | "high" }> = {
  "gemini-2.5-flash": { input: 0.00015, output: 0.0006, tier: "low" },
  "gemini-2.5-pro": { input: 0.00125, output: 0.005, tier: "medium" },
  "openai/gpt-4o": { input: 0.0025, output: 0.01, tier: "high" },
  "openai/gpt-4o-mini": { input: 0.00015, output: 0.0006, tier: "low" },
  "anthropic/claude-sonnet-4-20250514": { input: 0.003, output: 0.015, tier: "high" },
  "anthropic/claude-3-5-haiku-20241022": { input: 0.0008, output: 0.004, tier: "low" },
};

function classifyPrompt(prompt: string): TaskCategory {
  const lower = prompt.toLowerCase();

  const scores: Record<TaskCategory, number> = {
    chat: 0, reasoning: 0, retrieval: 0, action: 0, analysis: 0, creative: 0, code: 0,
  };

  // Score each category — multiple can match, highest wins
  if (/\b(code|implement|function|script|algorithm|api|endpoint|migration|refactor|debug|deploy|write\s+function)\b/i.test(lower)) scores.code += 2;
  if (/\b(why|how\s+does|explain\s+why|compare|evaluate|reason|logic|solve|math|calculate)\b/i.test(lower)) scores.reasoning += 2;
  if (/\b(search|find|look\s+up|retrieve|recall|remember|what\s+is|where\s+is)\b/i.test(lower)) scores.retrieval += 2;
  if (/\b(create|update|delete|add|remove|set|change|mark|complete|list|show)\b/i.test(lower)) scores.action += 2;
  if (/\b(analyze|report|summary|overview|metrics|health|status|insights|trend)\b/i.test(lower)) scores.analysis += 2;
  if (/\b(draft|write|compose|brainstorm|creative|story|content|design)\b/i.test(lower)) scores.creative += 2;

  // Bonus for multi-word matches
  if (/\b(code|function)\b.*\b(implement|write|create)\b/i.test(lower)) scores.code += 1;
  if (/\b(analyze|report)\b.*\b(data|metrics|workspace)\b/i.test(lower)) scores.analysis += 1;
  if (/\b(create|make|add)\b.*\b(task|project|document)\b/i.test(lower)) scores.action += 1;

  // Default to chat if no strong signals
  if (Object.values(scores).every(s => s === 0)) scores.chat = 1;

  // Return highest scoring category
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][0] as TaskCategory;
}

const CATEGORY_MODEL_MAP: Record<TaskCategory, { provider: RouterProvider; model: string; reason: string; costTier: "low" | "medium" | "high" }> = {
  chat:      { provider: "gemini",    model: "gemini-2.5-flash",          reason: "Fast chat response", costTier: "low" },
  creative:  { provider: "gemini",    model: "gemini-2.5-flash",          reason: "Fast creative response", costTier: "low" },
  reasoning: { provider: "openrouter", model: "openai/gpt-4o",            reason: "Strong reasoning", costTier: "high" },
  analysis:  { provider: "openrouter", model: "openai/gpt-4o",            reason: "Strong analysis", costTier: "high" },
  code:      { provider: "openrouter", model: "anthropic/claude-sonnet-4-20250514", reason: "Best code generation", costTier: "high" },
  action:    { provider: "gemini",    model: "gemini-2.5-flash",          reason: "Fast action execution", costTier: "low" },
  retrieval: { provider: "gemini",    model: "gemini-2.5-flash",          reason: "Fast information retrieval", costTier: "low" },
};

const COST_DOWNGRADE_MAP: Record<string, { provider: RouterProvider; model: string }> = {
  "openai/gpt-4o": { provider: "gemini", model: "gemini-2.5-pro" },
  "anthropic/claude-sonnet-4-20250514": { provider: "gemini", model: "gemini-2.5-pro" },
  "gemini-2.5-pro": { provider: "gemini", model: "gemini-2.5-flash" },
};

const FALLBACK_CONFIG: RouterConfig = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  reason: "Fallback: primary provider unavailable",
  costTier: "low",
};

function isProviderAvailable(provider: RouterProvider): boolean {
  switch (provider) {
    case "openrouter": return !!process.env.OPENROUTER_API_KEY;
    case "openai":     return !!process.env.OPENAI_API_KEY;
    case "gemini":     return !!process.env.GEMINI_API_KEY;
    case "cohere":     return !!process.env.COHERE_API_KEY;
    default:           return false;
  }
}

async function getWorkspaceCostTier(workspaceId: string): Promise<"low" | "medium" | "high"> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true },
    });
    if (!workspace) return "medium";
    if (workspace.plan === "enterprise") return "high";
    if (workspace.plan === "pro") return "medium";
    return "low";
  } catch {
    return "medium";
  }
}

export async function routeModel(prompt: string, workspaceId?: string): Promise<RouterConfig> {
  const category = classifyPrompt(prompt);
  const primary = CATEGORY_MODEL_MAP[category];

  let budgetTier: "low" | "medium" | "high" = "medium";
  if (workspaceId) {
    budgetTier = await getWorkspaceCostTier(workspaceId);
  }

  const tierOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
  const primaryTierNum = tierOrder[primary.costTier];
  const budgetTierNum = tierOrder[budgetTier];

  let selected = primary;
  if (primaryTierNum > budgetTierNum) {
    const downgrade = COST_DOWNGRADE_MAP[primary.model];
    if (downgrade && isProviderAvailable(downgrade.provider)) {
      selected = { ...primary, provider: downgrade.provider, model: downgrade.model, reason: `Cost-optimized for ${budgetTier} budget` };
    }
  }

  logger.info("[ModelRouter] Classifying prompt", {
    category,
    targetProvider: selected.provider,
    targetModel: selected.model,
    costTier: selected.costTier,
    budgetTier,
    promptPreview: prompt.substring(0, 80),
  });

  if (isProviderAvailable(selected.provider)) {
    return selected;
  }

  logger.warn("[ModelRouter] Primary provider unavailable, falling back", {
    requested: selected.provider,
    fallback: FALLBACK_CONFIG.provider,
  });

  if (isProviderAvailable(FALLBACK_CONFIG.provider)) {
    return FALLBACK_CONFIG;
  }

  for (const provider of ["gemini", "openai", "cohere"] as const) {
    if (isProviderAvailable(provider)) {
      return {
        provider,
        model: CATEGORY_MODEL_MAP[category].model,
        reason: `Fallback: ${selected.provider} unavailable`,
        costTier: "low",
      };
    }
  }

  return FALLBACK_CONFIG;
}

export function getAvailableProviders(): RouterProvider[] {
  const providers: RouterProvider[] = [];
  if (process.env.OPENROUTER_API_KEY) providers.push("openrouter");
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.GEMINI_API_KEY) providers.push("gemini");
  if (process.env.COHERE_API_KEY) providers.push("cohere");
  return providers;
}

export async function executeWithProvider(
  provider: RouterProvider,
  model: string,
  systemPrompt: string,
  prompt: string,
): Promise<string> {
  logger.info("[ModelRouter] Executing with provider", { provider, model });

  const chatModel = getLangChainModel(provider, model);
  const response = await chatModel.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(prompt),
  ]);

  return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
}

export function getModelCost(model: string): { input: number; output: number } | null {
  return MODEL_COSTS[model] || null;
}
