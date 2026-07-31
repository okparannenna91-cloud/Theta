import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/langraph/model-router", () => ({
  executeWithProvider: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { classifyComplexity, generatePlan, sortPlanByDependencies, validatePlanDependencies } from "@/lib/nova/multi-step-planner";
import { executeWithProvider } from "@/lib/langraph/model-router";

const mockedExecute = vi.mocked(executeWithProvider);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("classifyComplexity (observation mode)", () => {
  it("always returns not complex without calling the LLM", async () => {
    const result = await classifyComplexity("create a project and add 3 tasks to it", "");
    expect(result.isComplex).toBe(false);
    expect(result.reasoning).toContain("Observation mode");
    expect(mockedExecute).not.toHaveBeenCalled();
  });
});

describe("generatePlan (observation mode)", () => {
  it("never generates a plan without calling the LLM", async () => {
    const result = await generatePlan("create a project and add tasks", "", ["create_project", "create_task"]);
    expect(result.needsPlan).toBe(false);
    expect(result.steps).toEqual([]);
    expect(result.reasoning).toContain("Observation mode");
    expect(mockedExecute).not.toHaveBeenCalled();
  });
});

describe("summarizePlan helpers", () => {
  it("sorts steps by dependencies", () => {
    const sorted = sortPlanByDependencies([
      { id: 2, description: "B", toolHint: "llm", params: {}, dependsOn: [1] },
      { id: 1, description: "A", toolHint: "llm", params: {} },
    ]);
    expect(sorted.map((s) => s.id)).toEqual([1, 2]);
  });

  it("throws on circular dependencies", () => {
    expect(() =>
      sortPlanByDependencies([
        { id: 1, description: "A", toolHint: "llm", params: {}, dependsOn: [2] },
        { id: 2, description: "B", toolHint: "llm", params: {}, dependsOn: [1] },
      ])
    ).toThrow(/Circular dependency/i);
  });

  it("reports missing dependencies", () => {
    const errors = validatePlanDependencies([
      { id: 1, description: "A", toolHint: "llm", params: {}, dependsOn: [99] },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("99");
  });
});
