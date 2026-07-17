import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/langraph/model-router", () => ({
  executeWithProvider: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { classifyComplexity, generatePlan } from "@/lib/nova/multi-step-planner";
import { executeWithProvider } from "@/lib/langraph/model-router";

const mockedExecute = vi.mocked(executeWithProvider);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("classifyComplexity", () => {
  it("classifies simple request as not complex", async () => {
    mockedExecute.mockResolvedValue('{"isComplex": false, "reasoning": "Single action"}');
    const result = await classifyComplexity("show me my tasks", "");
    expect(result.isComplex).toBe(false);
    expect(result.reasoning).toBe("Single action");
  });

  it("classifies multi-step request as complex", async () => {
    mockedExecute.mockResolvedValue('{"isComplex": true, "reasoning": "Multiple dependent actions"}');
    const result = await classifyComplexity("create a project and add 3 tasks to it", "");
    expect(result.isComplex).toBe(true);
  });

  it("handles LLM returning malformed JSON gracefully", async () => {
    mockedExecute.mockResolvedValue("not json at all");
    const result = await classifyComplexity("test", "");
    expect(result.isComplex).toBe(false);
    expect(result.reasoning).toContain("defaulting to simple");
  });

  it("handles LLM throwing an error", async () => {
    mockedExecute.mockRejectedValue(new Error("API error"));
    const result = await classifyComplexity("test", "");
    expect(result.isComplex).toBe(false);
  });

  it("passes workspace context to LLM", async () => {
    mockedExecute.mockResolvedValue('{"isComplex": false, "reasoning": "Simple"}');
    await classifyComplexity("test", "Workspace has 5 tasks");
    expect(mockedExecute).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.stringContaining("Workspace has 5 tasks")
    );
  });
});

describe("generatePlan", () => {
  it("generates a plan for complex request", async () => {
    mockedExecute.mockResolvedValue(JSON.stringify({
      needsPlan: true,
      steps: [
        { id: 1, description: "Create project", toolHint: "create_project", params: { name: "Test" } },
        { id: 2, description: "Add tasks", toolHint: "create_task", params: { title: "Task 1" } },
      ],
      reasoning: "Two-step process",
    }));

    const result = await generatePlan("create a project and add tasks", "", ["create_project", "create_task"]);
    expect(result.needsPlan).toBe(true);
    expect(result.steps.length).toBe(2);
    expect(result.steps[0].toolHint).toBe("create_project");
  });

  it("returns needsPlan false for simple request", async () => {
    mockedExecute.mockResolvedValue(JSON.stringify({
      needsPlan: false,
      steps: [],
      reasoning: "Single action",
    }));

    const result = await generatePlan("show tasks", "", ["list_tasks"]);
    expect(result.needsPlan).toBe(false);
  });

  it("handles LLM failure gracefully", async () => {
    mockedExecute.mockRejectedValue(new Error("timeout"));
    const result = await generatePlan("test", "", []);
    expect(result.needsPlan).toBe(false);
    expect(result.steps).toEqual([]);
  });

  it("handles malformed JSON from LLM", async () => {
    mockedExecute.mockResolvedValue("{invalid json");
    const result = await generatePlan("test", "", []);
    expect(result.needsPlan).toBe(false);
  });

  it("passes available tools to LLM", async () => {
    mockedExecute.mockResolvedValue('{"needsPlan": false, "steps": [], "reasoning": "Simple"}');
    await generatePlan("test", "", ["list_tasks", "create_task"]);
    expect(mockedExecute).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.stringContaining("list_tasks, create_task")
    );
  });
});
