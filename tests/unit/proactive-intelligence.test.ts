import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: vi.fn(), count: vi.fn() },
    project: { findMany: vi.fn() },
    workspaceMember: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/langraph/model-router", () => ({
  executeWithProvider: vi.fn().mockResolvedValue("[]"),
}));

vi.mock("@/lib/super-admin", () => ({
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/cache", () => ({
  cacheGetOrSet: vi.fn((_key: string, fn: () => Promise<any>) => fn()),
  cacheKey: vi.fn((...parts: string[]) => parts.join(":")),
}));

import { ProactiveIntelligenceEngine } from "@/lib/nova/proactive-intelligence";
import { prisma } from "@/lib/prisma";

const mockedPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  ProactiveIntelligenceEngine.configure({
    stallThresholdDays: 3,
    upcomingDeadlineDays: 2,
    overdueCriticalCount: 3,
    unassignedHighCount: 5,
    blockedCriticalCount: 2,
  });
});

describe("ProactiveIntelligenceEngine", () => {
  describe("analyzeWorkspace", () => {
    it("returns empty insights for empty workspace", async () => {
      mockedPrisma.task.findMany.mockResolvedValue([]);
      const result = await ProactiveIntelligenceEngine.analyzeWorkspace("ws-1");
      expect(result.insights).toEqual([]);
      expect(result.totalInsights).toBe(0);
    });

    it("detects overdue tasks", async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
      mockedPrisma.task.findMany.mockResolvedValue([
        { title: "Overdue task 1", status: "todo", dueDate: twoDaysAgo, assigneeIds: ["u1"], userId: "u1", updatedAt: new Date(), projectId: "p1", subtasks: [], estimatedHours: null },
        { title: "Overdue task 2", status: "todo", dueDate: twoDaysAgo, assigneeIds: ["u2"], userId: "u2", updatedAt: new Date(), projectId: "p1", subtasks: [], estimatedHours: null },
        { title: "Overdue task 3", status: "todo", dueDate: twoDaysAgo, assigneeIds: ["u3"], userId: "u3", updatedAt: new Date(), projectId: "p1", subtasks: [], estimatedHours: null },
      ]);

      const result = await ProactiveIntelligenceEngine.analyzeWorkspace("ws-1");
      expect(result.insights.some(i => i.type === "DEADLINE_RISK")).toBe(true);
    });

    it("detects stalled tasks", async () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);
      const now = new Date();
      mockedPrisma.task.findMany.mockImplementation(async (args: any) => {
        const w = args?.where || {};
        if (w.status === "in-progress" && w.updatedAt) {
          return [{ title: "Stalled task", status: "in-progress", dueDate: null, assigneeIds: ["u1"], userId: "u1", updatedAt: fiveDaysAgo, projectId: "p1", subtasks: [], estimatedHours: null }];
        }
        return [];
      });

      const result = await ProactiveIntelligenceEngine.analyzeWorkspace("ws-1");
      expect(result.insights.some(i => i.type === "STALLED_PROGRESS")).toBe(true);
    });

    it("detects unassigned tasks", async () => {
      mockedPrisma.task.findMany.mockImplementation(async (args: any) => {
        const w = args?.where || {};
        if (w.userId === undefined && w.status?.notIn) {
          return [
            { title: "Unassigned 1", status: "todo", dueDate: null, assigneeIds: [], userId: undefined, updatedAt: new Date(), projectId: "p1", subtasks: [], estimatedHours: null },
            { title: "Unassigned 2", status: "todo", dueDate: null, assigneeIds: [], userId: undefined, updatedAt: new Date(), projectId: "p1", subtasks: [], estimatedHours: null },
            { title: "Unassigned 3", status: "todo", dueDate: null, assigneeIds: [], userId: undefined, updatedAt: new Date(), projectId: "p1", subtasks: [], estimatedHours: null },
            { title: "Unassigned 4", status: "todo", dueDate: null, assigneeIds: [], userId: undefined, updatedAt: new Date(), projectId: "p1", subtasks: [], estimatedHours: null },
            { title: "Unassigned 5", status: "todo", dueDate: null, assigneeIds: [], userId: undefined, updatedAt: new Date(), projectId: "p1", subtasks: [], estimatedHours: null },
          ];
        }
        return [];
      });

      const result = await ProactiveIntelligenceEngine.analyzeWorkspace("ws-1");
      expect(result.insights.some(i => i.type === "UNASSIGNED_WORK")).toBe(true);
    });

    it("counts severity breakdown correctly", async () => {
      mockedPrisma.task.findMany.mockResolvedValue([]);
      const result = await ProactiveIntelligenceEngine.analyzeWorkspace("ws-1");
      expect(result.criticalCount + result.highCount + result.mediumCount + result.lowCount).toBe(0);
    });
  });

  describe("configure", () => {
    it("accepts custom config", () => {
      ProactiveIntelligenceEngine.configure({ stallThresholdDays: 7 });
    });
  });
});
