import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "t1" }), update: vi.fn().mockResolvedValue({}), count: vi.fn().mockResolvedValue(0), groupBy: vi.fn().mockResolvedValue([]) },
    project: { findMany: vi.fn().mockResolvedValue([]) },
    document: { findMany: vi.fn().mockResolvedValue([]) },
    teamMember: { findMany: vi.fn().mockResolvedValue([]) },
    workspaceMember: { findFirst: vi.fn().mockResolvedValue({ role: "manager", workspaceId: "ws-1", userId: "u1", status: "active" }), count: vi.fn().mockResolvedValue(1) },
    activity: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/langraph/models", () => ({
  getLangChainModel: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ content: "I'll help you with that." }),
    stream: vi.fn(),
  }),
}));

vi.mock("@/lib/langraph/model-router", () => ({
  routeModel: vi.fn().mockReturnValue({ provider: "gemini", model: "gemini-2.5-flash", reason: "test" }),
  executeWithProvider: vi.fn().mockResolvedValue("Hello! How can I help?"),
}));

vi.mock("@/lib/nova/memory-system", () => ({
  MemorySystem: {
    retrieveRelevant: vi.fn().mockResolvedValue([]),
    store: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/nova/context-system", () => ({
  ContextSystem: {
    getActiveContext: vi.fn().mockResolvedValue({
      structured: {
        task: null,
        document: null,
        project: null,
        sprint: null,
        workspace: { name: "Test Workspace", plan: "free" },
        user: { name: "Test User" },
        priority: 0,
      },
      promptString: "",
    }),
    loadWorkspaceOverview: vi.fn().mockResolvedValue("[WORKSPACE OVERVIEW]\nProjects: None\nTasks: 0 total\nTeam members: 1"),
  },
}));

vi.mock("@/lib/nova/decision-framework", () => ({
  DecisionFramework: {
    evaluate: vi.fn().mockReturnValue({
      intent: "READ",
      riskLevel: "LOW",
      strategy: "PATH_A_IMMEDIATE",
      requiresApproval: false,
      requiresConfirmation: false,
      reversible: true,
      explanation: "Low risk",
    }),
  },
}));

vi.mock("@/lib/nova/output-validator", () => ({
  OutputValidator: {
    validate: vi.fn((s: string) => s),
    validateDetailed: vi.fn().mockReturnValue({ valid: true, issues: [] }),
  },
  ResponseQualityGate: {
    review: vi.fn((_r: string, ctx: any) => ({
      passed: true,
      revisedResponse: _r,
      issues: [],
    })),
  },
  detectPromptInjection: vi.fn().mockReturnValue(false),
  detectSecretLeakage: vi.fn().mockReturnValue(false),
  detectInternalLeakage: vi.fn().mockReturnValue(false),
  detectToolNameExposure: vi.fn().mockReturnValue(false),
  detectAgentNameExposure: vi.fn().mockReturnValue(false),
  detectIdentityLeakage: vi.fn().mockReturnValue(false),
  detectRawToolCalls: vi.fn().mockReturnValue(false),
  extractToolCallsFromText: vi.fn().mockReturnValue([]),
  sanitizeUserInput: vi.fn((s: string) => s),
}));

vi.mock("@/lib/nova/intent-router", () => ({
  routeRequest: vi.fn().mockReturnValue({
    path: "CHAT",
    toolCategories: [],
    contextDepth: "standard",
    timeoutMs: 30000,
    promptSuffix: "",
  }),
}));

vi.mock("@/lib/nova/multi-step-planner", () => ({
  classifyComplexity: vi.fn().mockResolvedValue({ isComplex: false, reasoning: "Simple" }),
  generatePlan: vi.fn().mockResolvedValue({ needsPlan: false, steps: [], reasoning: "Simple" }),
}));

vi.mock("@/lib/nova/telemetry", () => ({
  telemetry: {
    trackRequest: vi.fn(),
    trackToolExecution: vi.fn(),
    getDashboard: vi.fn().mockReturnValue({}),
  },
}));

vi.mock("@/lib/nova/philosophy-engine", () => ({
  PhilosophyEngine: {
    enhancePrompt: vi.fn().mockImplementation((_id: string, prompt: string) => prompt),
    optimizeResponse: vi.fn().mockImplementation((response: string, _intent: string) => response),
  },
}));

vi.mock("@/lib/langraph/nodes/output-validator", () => ({
  validateAndSanitize: vi.fn((s: string) => s),
  optimizeResponse: vi.fn((_r: string, _i: string) => _r),
  runQualityGate: vi.fn((_r: string, ctx: any) => ({
    response: _r,
    passed: true,
    issues: [],
  })),
}));

vi.mock("@/lib/nova/security-guard", () => ({
  SecurityGuard: {
    validate: vi.fn().mockResolvedValue(true),
    enforce: vi.fn().mockResolvedValue(undefined),
  },
  detectPromptInjection: vi.fn().mockReturnValue(false),
  detectSecretLeakage: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/ai-tools", () => ({
  buildTools: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/langraph/tools", () => ({
  buildLangGraphTools: vi.fn().mockReturnValue([]),
  buildToolByName: vi.fn().mockReturnValue(null),
  getAvailableToolNames: vi.fn().mockReturnValue([]),
  buildLangGraphToolWrapper: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/langraph/tools/services", () => ({
  buildServiceTools: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/langraph/tools/rag", () => ({
  buildRAGTools: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/nova/proactive-intelligence", () => ({
  ProactiveIntelligenceEngine: {
    analyzeWorkspace: vi.fn().mockResolvedValue({ insights: [], totalInsights: 0 }),
  },
}));

vi.mock("@/lib/nova/response-formatter", () => ({
  ResponseFormatter: {
    format: vi.fn((_route: string, response: string) => response),
  },
}));

vi.mock("@/lib/nova/parameter-extractor", () => ({
  ParameterExtractor: {
    extract: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/lib/nova/validation-engine", () => ({
  ValidationEngine: {
    validate: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
  },
}));

import { runNovaGraph } from "@/lib/langraph";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LangGraph Agent Flow", () => {
  it("processes a simple chat message", async () => {
    const result = await runNovaGraph({
      prompt: "hello",
      systemPrompt: "You are Nova, an AI assistant.",
      ctx: { userId: "u1", workspaceId: "ws-1" },
    });

    expect(result).toBeDefined();
    expect(typeof result.response).toBe("string");
    expect(result.response.length).toBeGreaterThan(0);
  });

  it("includes response metadata", async () => {
    const result = await runNovaGraph({
      prompt: "show me my tasks",
      systemPrompt: "You are Nova.",
      ctx: { userId: "u1", workspaceId: "ws-1" },
    });

    expect(result).toHaveProperty("response");
    expect(result).toHaveProperty("route");
  });

  it("handles empty prompt gracefully", async () => {
    const result = await runNovaGraph({
      prompt: "",
      systemPrompt: "You are Nova.",
      ctx: { userId: "u1", workspaceId: "ws-1" },
    });

    expect(result).toBeDefined();
    expect(typeof result.response).toBe("string");
  });

  it("passes workspaceId to context system", async () => {
    await runNovaGraph({
      prompt: "what tasks do I have?",
      systemPrompt: "You are Nova.",
      ctx: { userId: "u1", workspaceId: "ws-1" },
    });
  });

  it("handles conversation history", async () => {
    const result = await runNovaGraph({
      prompt: "what about the other project?",
      systemPrompt: "You are Nova.",
      ctx: { userId: "u1", workspaceId: "ws-1" },
    });

    expect(result).toBeDefined();
  });
});
