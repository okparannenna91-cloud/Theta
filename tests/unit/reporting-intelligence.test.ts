import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/redis/client", () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    scheduledReport: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/nova/context-system", () => ({
  ContextSystem: {
    getActiveContext: vi.fn().mockResolvedValue({
      structured: { workspace: { name: "Test Workspace", plan: "pro" } },
      promptString: "Workspace context",
    }),
  },
}));

vi.mock("@/lib/nova/security-guard", () => ({
  SecurityGuard: {
    validate: vi.fn().mockResolvedValue(true),
  },
}));

import { ReportingIntelligence, REPORT_TYPES, REPORT_FREQUENCIES, REPORT_CHANNELS } from "@/lib/nova/reporting-intelligence";
import { prisma } from "@/lib/prisma";

describe("ReportingIntelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateReport", () => {
    it("generates a PROJECT report", async () => {
      (prisma.task.count as any).mockResolvedValue(0);

      const report = await ReportingIntelligence.generateReport("PROJECT", "proj1", "ws1");

      expect(report).toContain("Project progress updates");
      expect(report).toContain("Nova Reporting Intelligence");
      expect(report).toContain("Key Metrics");
      expect(report).toContain("Risk Assessment");
      expect(report).toContain("Trends & Insights");
    });

    it("generates a SPRINT report", async () => {
      (prisma.task.count as any).mockResolvedValue(0);

      const report = await ReportingIntelligence.generateReport("SPRINT", "sprint1", "ws1");

      expect(report).toContain("Sprint performance");
    });

    it("generates a TEAM report", async () => {
      (prisma.task.count as any).mockResolvedValue(0);

      const report = await ReportingIntelligence.generateReport("TEAM", "team1", "ws1");

      expect(report).toContain("Workload analysis");
    });

    it("generates an EXECUTIVE report", async () => {
      (prisma.task.count as any).mockResolvedValue(0);

      const report = await ReportingIntelligence.generateReport("EXECUTIVE", "ws1", "ws1");

      expect(report).toContain("High-level summaries");
    });

    it("includes overdue task risk", async () => {
      (prisma.task.count as any)
        .mockResolvedValueOnce(5) // overdue tasks
        .mockResolvedValueOnce(0) // blocked tasks
        .mockResolvedValueOnce(20); // active tasks

      const report = await ReportingIntelligence.generateReport("PROJECT", "proj1", "ws1");

      expect(report).toContain("5 overdue");
    });

    it("includes velocity trend data", async () => {
      (prisma.task.count as any)
        .mockResolvedValueOnce(0) // overdue
        .mockResolvedValueOnce(0) // blocked
        .mockResolvedValueOnce(10) // active
        .mockResolvedValueOnce(8) // recent completed
        .mockResolvedValueOnce(5) // previous completed
        .mockResolvedValueOnce(20) // total tasks
        .mockResolvedValueOnce(15); // completed tasks

      const report = await ReportingIntelligence.generateReport("PROJECT", "proj1", "ws1");

      expect(report).toContain("IMPROVING");
    });
  });

  describe("scheduleReport", () => {
    it("schedules a report", async () => {
      (prisma.scheduledReport.upsert as any).mockResolvedValue({});

      await ReportingIntelligence.scheduleReport(
        "PROJECT",
        "WEEKLY",
        "proj1",
        "ws1",
        "user1"
      );

      expect(prisma.scheduledReport.upsert).toHaveBeenCalled();
    });
  });

  describe("constants", () => {
    it("has all report types", () => {
      expect(REPORT_TYPES).toHaveLength(5);
      expect(REPORT_TYPES.map(t => t.type)).toContain("PROJECT");
      expect(REPORT_TYPES.map(t => t.type)).toContain("SPRINT");
      expect(REPORT_TYPES.map(t => t.type)).toContain("TEAM");
      expect(REPORT_TYPES.map(t => t.type)).toContain("EXECUTIVE");
      expect(REPORT_TYPES.map(t => t.type)).toContain("CLIENT");
    });

    it("has all report frequencies", () => {
      expect(REPORT_FREQUENCIES).toContain("DAILY");
      expect(REPORT_FREQUENCIES).toContain("WEEKLY");
      expect(REPORT_FREQUENCIES).toContain("SPRINT");
      expect(REPORT_FREQUENCIES).toContain("MONTHLY");
      expect(REPORT_FREQUENCIES).toContain("QUARTERLY");
    });

    it("has all distribution channels", () => {
      expect(REPORT_CHANNELS).toContain("DASHBOARD");
      expect(REPORT_CHANNELS).toContain("EMAIL");
      expect(REPORT_CHANNELS).toContain("CLIENT_PORTAL");
      expect(REPORT_CHANNELS).toContain("NOTIFICATION");
    });
  });

  describe("getReportTypes", () => {
    it("returns report types", () => {
      const types = ReportingIntelligence.getReportTypes();
      expect(types).toBe(REPORT_TYPES);
    });
  });

  describe("getReportDefinitions", () => {
    it("returns all definitions", () => {
      const defs = ReportingIntelligence.getReportDefinitions();
      expect(defs.types).toBe(REPORT_TYPES);
      expect(defs.frequencies).toBe(REPORT_FREQUENCIES);
      expect(defs.channels).toBe(REPORT_CHANNELS);
    });
  });
});
