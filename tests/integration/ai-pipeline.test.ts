import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    project: { findMany: vi.fn() },
    activity: { create: vi.fn() },
    workspace: { findUnique: vi.fn() },
    workspaceMember: { findFirst: vi.fn() },
    aiConversation: { create: vi.fn(), findUnique: vi.fn() },
    aiMessage: { create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/langraph/model-router", () => ({
  routeModel: vi.fn().mockResolvedValue({
    provider: "openai",
    model: "gpt-4o",
    costTier: "medium",
    route: "CHAT",
  }),
  executeWithProvider: vi.fn(),
}));

vi.mock("@/lib/langraph/models", () => ({
  getLangChainModel: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({
      content: "I can help with project management tasks.",
      tool_calls: [],
    }),
    bindTools: vi.fn().mockReturnThis(),
  }),
}));

vi.mock("@/lib/nova/philosophy-engine", () => ({
  PhilosophyEngine: {
    optimizeResponse: vi.fn((s: string) => s),
  },
}));

vi.mock("@/lib/langraph/nodes/output-validator", () => ({
  validateAndSanitize: vi.fn((s: string) => s),
  optimizeResponse: vi.fn((s: string) => s),
  runQualityGate: vi.fn((response: string) => ({
    response,
    passed: true,
    issues: [],
  })),
}));

vi.mock("@/lib/nova/memory-system", () => ({
  MemorySystem: {
    retrieveRelevant: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/nova/context-system", () => ({
  ContextSystem: {
    getActiveContext: vi.fn().mockResolvedValue({
      structured: { workspace: { name: "Test", plan: "pro" } },
      promptString: "Context",
    }),
    loadWorkspaceOverview: vi.fn().mockResolvedValue("Workspace: Test Workspace"),
  },
}));

vi.mock("@/lib/nova/decision-framework", () => ({
  DecisionFramework: {
    assessRisk: vi.fn().mockResolvedValue({ risk: "LOW" }),
  },
}));

vi.mock("@/lib/nova/output-validator", () => ({
  OutputValidator: {
    validate: vi.fn().mockReturnValue({ safe: true }),
    ResponseQualityGate: {
      stripRoboticOpenings: vi.fn((s: string) => s),
      stripRoboticEndings: vi.fn((s: string) => s),
    },
  },
  sanitizeUserInput: vi.fn((s: string) => s),
}));

vi.mock("@/lib/nova/security-guard", () => ({
  SecurityGuard: {
    validate: vi.fn().mockResolvedValue(true),
    scanPrompt: vi.fn().mockResolvedValue({ blocked: false }),
  },
}));

vi.mock("@/lib/nova/rag-pipeline", () => ({
  RAGPipeline: {
    semanticSearch: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/nova/proactive-intelligence", () => ({
  ProactiveIntelligence: {
    analyzeWorkspace: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/lib/nova/auto-memory-extractor", () => ({
  AutoMemoryExtractor: {
    extractAndStore: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/nova/parameter-extractor", () => ({
  ParameterExtractor: {
    extract: vi.fn().mockResolvedValue({}),
    extractParams: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/lib/nova/validation-engine", () => ({
  ValidationEngine: {
    validateAction: vi.fn().mockResolvedValue({ approved: true }),
  },
}));

vi.mock("@/lib/nova/multi-step-planner", () => ({
  MultiStepPlanner: {
    classifyComplexity: vi.fn().mockResolvedValue("simple"),
    generatePlan: vi.fn().mockResolvedValue({ steps: [] }),
  },
}));

vi.mock("@/lib/nova/response-formatter", () => ({
  ResponseFormatter: {
    format: vi.fn().mockImplementation((s: string) => ({ content: s, metadata: { wordCount: 1, estimatedReadTime: "1 min" } })),
  },
}));

vi.mock("@/lib/ai-tools/registry", () => ({
  buildTools: vi.fn().mockReturnValue([]),
  buildToolByName: vi.fn().mockReturnValue(null),
  getAvailableToolNames: vi.fn().mockReturnValue([]),
  categoriesForIntent: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/langraph/tools", () => ({
  buildLangGraphTools: vi.fn().mockReturnValue([]),
  buildToolByName: vi.fn().mockReturnValue(null),
  getAvailableToolNames: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/super-admin", () => ({
  isSuperAdmin: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/project-permissions", () => ({
  canAccessProject: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/cache", () => ({
  cacheGetOrSet: vi.fn().mockImplementation((_key: string, fn: () => Promise<any>) => fn()),
  cacheKey: vi.fn().mockReturnValue("test-key"),
}));

import { runNovaGraph } from "@/lib/langraph/agent-graph";

describe("AI Pipeline Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes a simple chat message", async () => {
    const result = await runNovaGraph({
      prompt: "Hello, what can you do?",
      systemPrompt: "You are Nova.",
      ctx: { userId: "user1", workspaceId: "ws1" },
    });

    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
    expect(typeof result.response).toBe("string");
  });

  it("handles empty prompt gracefully", async () => {
    const result = await runNovaGraph({
      prompt: "",
      systemPrompt: "You are Nova.",
      ctx: { userId: "user1", workspaceId: "ws1" },
    });

    expect(result).toBeDefined();
  });

  it("passes context through the pipeline", async () => {
    const ctx = {
      userId: "user1",
      workspaceId: "ws1",
      projectId: "proj1",
    };

    const result = await runNovaGraph({
      prompt: "Show me my tasks",
      systemPrompt: "You are Nova.",
      ctx,
    });

    expect(result).toBeDefined();
  });

  it("handles abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await runNovaGraph({
      prompt: "This should be aborted",
      systemPrompt: "You are Nova.",
      ctx: { userId: "user1", workspaceId: "ws1" },
      signal: controller.signal,
    });

    expect(result).toBeDefined();
  });

  it("returns proper output structure", async () => {
    const result = await runNovaGraph({
      prompt: "Hello",
      systemPrompt: "You are Nova.",
      ctx: { userId: "user1", workspaceId: "ws1" },
    });

    expect(result).toHaveProperty("response");
    expect(result).toHaveProperty("route");
    expect(result).toHaveProperty("toolResults");
    expect(Array.isArray(result.toolResults)).toBe(true);
  });
});
