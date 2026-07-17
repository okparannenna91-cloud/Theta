import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: vi.fn() },
    project: { findMany: vi.fn(), findFirst: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/langraph/model-router", () => ({
  executeWithProvider: vi.fn().mockResolvedValue("Assessment: low risk"),
}));

import { RiskPredictionEngine } from "@/lib/nova/risk-prediction";
import { prisma } from "@/lib/prisma";

const mockedPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RiskPredictionEngine", () => {
  describe("calculateTeamVelocity", () => {
    it("returns empty velocity for no tasks", async () => {
      mockedPrisma.task.findMany.mockResolvedValue([]);
      mockedPrisma.user.findMany.mockResolvedValue([]);
      const result = await RiskPredictionEngine.calculateTeamVelocity("ws-1");
      expect(result).toEqual([]);
    });

    it("calculates velocity per assignee", async () => {
      const now = new Date();
      mockedPrisma.task.findMany.mockResolvedValue([
        { assigneeIds: ["u1"], updatedAt: now, createdAt: now },
        { assigneeIds: ["u1"], updatedAt: now, createdAt: now },
        { assigneeIds: ["u2"], updatedAt: now, createdAt: now },
      ]);
      mockedPrisma.user.findMany.mockResolvedValue([
        { id: "u1", name: "Alice" },
        { id: "u2", name: "Bob" },
      ]);

      const result = await RiskPredictionEngine.calculateTeamVelocity("ws-1");
      expect(result.length).toBe(2);
      expect(result.find(v => v.memberId === "u1")?.tasksCompleted).toBe(2);
      expect(result.find(v => v.memberId === "u2")?.tasksCompleted).toBe(1);
    });

    it("handles tasks with multiple assignees", async () => {
      const now = new Date();
      mockedPrisma.task.findMany.mockResolvedValue([
        { assigneeIds: ["u1", "u2"], updatedAt: now, createdAt: now },
      ]);
      mockedPrisma.user.findMany.mockResolvedValue([
        { id: "u1", name: "Alice" },
        { id: "u2", name: "Bob" },
      ]);

      const result = await RiskPredictionEngine.calculateTeamVelocity("ws-1");
      expect(result.length).toBe(2);
    });

    it("filters by projectId when provided", async () => {
      mockedPrisma.task.findMany.mockResolvedValue([]);
      mockedPrisma.user.findMany.mockResolvedValue([]);
      await RiskPredictionEngine.calculateTeamVelocity("ws-1", "p1");
      expect(mockedPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: "p1",
          }),
        })
      );
    });
  });

  describe("assessProjectRisk", () => {
    it("returns low risk for healthy project", async () => {
      const now = new Date();
      mockedPrisma.project.findFirst.mockResolvedValue({ id: "p1", name: "Test" });
      mockedPrisma.task.findMany.mockResolvedValue([
        { id: "t1", status: "done", dueDate: now, updatedAt: now, createdAt: now, assigneeIds: ["u1"], predecessors: [], title: "Task 1" },
        { id: "t2", status: "done", dueDate: now, updatedAt: now, createdAt: now, assigneeIds: ["u1"], predecessors: [], title: "Task 2" },
        { id: "t3", status: "in-progress", dueDate: new Date(Date.now() + 7 * 86400000), updatedAt: now, createdAt: now, assigneeIds: ["u1"], predecessors: [], title: "Task 3" },
      ]);
      mockedPrisma.user.findMany.mockResolvedValue([{ id: "u1", name: "Alice" }]);

      const result = await RiskPredictionEngine.assessProjectRisk("ws-1", "p1");
      expect(result).toBeDefined();
      expect(result.risks).toBeDefined();
    });

    it("detects high risk when many tasks are overdue", async () => {
      const pastDate = new Date(Date.now() - 5 * 86400000);
      const now = new Date();
      mockedPrisma.project.findFirst.mockResolvedValue({ id: "p1", name: "Test" });
      mockedPrisma.task.findMany.mockResolvedValue([
        { id: "t1", status: "todo", dueDate: pastDate, updatedAt: pastDate, createdAt: pastDate, assigneeIds: [], predecessors: [], title: "Overdue 1" },
        { id: "t2", status: "todo", dueDate: pastDate, updatedAt: pastDate, createdAt: pastDate, assigneeIds: [], predecessors: [], title: "Overdue 2" },
        { id: "t3", status: "todo", dueDate: pastDate, updatedAt: pastDate, createdAt: pastDate, assigneeIds: [], predecessors: [], title: "Overdue 3" },
      ]);
      mockedPrisma.user.findMany.mockResolvedValue([]);

      const result = await RiskPredictionEngine.assessProjectRisk("ws-1", "p1");
      expect(result).toBeDefined();
      expect(result.risks.length).toBeGreaterThan(0);
    });

    it("returns empty assessment for nonexistent project", async () => {
      mockedPrisma.project.findFirst.mockResolvedValue(null);

      const result = await RiskPredictionEngine.assessProjectRisk("ws-1", "nonexistent");
      expect(result).toBeDefined();
      expect(result.riskLevel).toBe("LOW");
    });
  });
});
