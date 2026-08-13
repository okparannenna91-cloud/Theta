import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  PLAN_LIMITS,
  isValidPlan,
  canCreateWorkspace,
  canCreateProject,
  canAddMember,
  canCreateTask,
  canCreateTeam,
  enforcePlanLimit,
  hasTimelineAccess,
  hasGanttAccess,
  hasAdvancedAnalyticsAccess,
  type PlanName,
} from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

describe("Plan Limits — isValidPlan", () => {
  it("accepts valid plan names", () => {
    expect(isValidPlan("free")).toBe(true);
    expect(isValidPlan("growth")).toBe(true);
    expect(isValidPlan("pro")).toBe(true);
    expect(isValidPlan("theta_plus")).toBe(true);
  });

  it("rejects invalid plan names", () => {
    expect(isValidPlan("enterprise")).toBe(false);
    expect(isValidPlan("")).toBe(false);
    expect(isValidPlan("FREE")).toBe(false);
    expect(isValidPlan("basic")).toBe(false);
  });
});

describe("Plan Limits — limits correctness", () => {
  it("free plan has correct limits", () => {
    const free = PLAN_LIMITS.free;
    expect(free.maxWorkspaces).toBe(1);
    expect(free.maxMembers).toBe(5);
    expect(free.maxNovaRequests).toBe(20);
    expect(free.maxMemoryItems).toBe(50);
    expect(free.hasCustomAutomation).toBe(false);
    expect(free.maxAutomations).toBe(0);
    expect(free.maxBoards).toBe(-1);
    expect(free.maxCustomFields).toBe(0);
  });

  it("growth plan is strictly greater than free", () => {
    const free = PLAN_LIMITS.free;
    const growth = PLAN_LIMITS.growth;
    expect(growth.maxMembers).toBeGreaterThan(free.maxMembers);
    expect(growth.maxNovaRequests).toBeGreaterThan(free.maxNovaRequests);
    expect(growth.maxAutomations).toBeGreaterThan(free.maxAutomations);
  });

  it("pro plan is strictly greater than growth", () => {
    const growth = PLAN_LIMITS.growth;
    const pro = PLAN_LIMITS.pro;
    expect(pro.maxMembers).toBeGreaterThan(growth.maxMembers);
    expect(pro.maxNovaRequests).toBeGreaterThan(growth.maxNovaRequests);
    // pro has unlimited automations (-1) which is effectively greater than growth's limit
    expect(pro.maxAutomations === -1 || pro.maxAutomations > growth.maxAutomations).toBe(true);
  });

  it("theta_plus has unlimited (-1) for most resources", () => {
    const tp = PLAN_LIMITS.theta_plus;
    expect(tp.maxProjects).toBe(-1);
    expect(tp.maxTasks).toBe(-1);
    expect(tp.maxMemoryItems).toBe(-1);
    expect(tp.maxChatMessages).toBe(-1);
    expect(tp.maxDocumentPages).toBe(-1);
  });

  it("all plans have Nova AI enabled", () => {
    for (const plan of ["free", "growth", "pro", "theta_plus"] as PlanName[]) {
      expect(PLAN_LIMITS[plan].hasNovaAI).toBe(true);
    }
  });

  it("timeline access requires Growth and above", () => {
    expect(hasTimelineAccess("free")).toBe(false);
    expect(hasTimelineAccess("growth")).toBe(true);
    expect(hasTimelineAccess("pro")).toBe(true);
    expect(hasTimelineAccess("theta_plus")).toBe(true);
  });

  it("gantt access requires Pro and above", () => {
    expect(hasGanttAccess("free")).toBe(false);
    expect(hasGanttAccess("growth")).toBe(false);
    expect(hasGanttAccess("pro")).toBe(true);
    expect(hasGanttAccess("theta_plus")).toBe(true);
  });

  it("gantt is strictly gated behind analytics on free/growth", () => {
    for (const plan of ["free", "growth"] as PlanName[]) {
      expect(hasGanttAccess(plan)).toBe(false);
      expect(hasAdvancedAnalyticsAccess(plan)).toBe(false);
    }
    for (const plan of ["pro", "theta_plus"] as PlanName[]) {
      expect(hasGanttAccess(plan)).toBe(true);
      expect(hasAdvancedAnalyticsAccess(plan)).toBe(true);
    }
  });

  it("custom fields scale by plan", () => {
    expect(PLAN_LIMITS.free.maxCustomFields).toBe(0);
    expect(PLAN_LIMITS.growth.maxCustomFields).toBe(5);
    expect(PLAN_LIMITS.pro.maxCustomFields).toBe(-1);
    expect(PLAN_LIMITS.theta_plus.maxCustomFields).toBe(-1);
  });

  it("kanban view (boards) is unlimited on all plans", () => {
    for (const plan of ["free", "growth", "pro", "theta_plus"] as PlanName[]) {
      expect(PLAN_LIMITS[plan].maxBoards).toBe(-1);
    }
  });
});

describe("Plan Limits — canCreate* functions", () => {
  it("canCreateWorkspace allows within limit", () => {
    expect(canCreateWorkspace("free", 0)).toBe(true);
    expect(canCreateWorkspace("free", 1)).toBe(false);
  });

  it("canCreateWorkspace allows unlimited for growth+", () => {
    expect(canCreateWorkspace("growth", 100)).toBe(true);
    expect(canCreateWorkspace("pro", 1000)).toBe(true);
  });

  it("canCreateProject respects -1 unlimited", () => {
    expect(canCreateProject("free", 99999)).toBe(true);
  });

  it("canAddMember blocks at limit", () => {
    expect(canAddMember("free", 4)).toBe(true);
    expect(canAddMember("free", 5)).toBe(false);
  });

  it("canCreateTask allows unlimited", () => {
    expect(canCreateTask("free", 999999)).toBe(true);
  });

  it("canCreateTeam blocks at limit", () => {
    expect(canCreateTeam("free", 0)).toBe(true);
    expect(canCreateTeam("free", 1)).toBe(false);
  });
});

describe("Plan Limits — enforcePlanLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when under limit", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "free", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "members", 3)
    ).resolves.not.toThrow();
  });

  it("throws when over member limit on free plan", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "free", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "members", 5)
    ).rejects.toThrow();
  });

  it("throws for deactivated workspace", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "pro", subscriptionStatus: "deactivated",
      members: [],
    });
    await expect(
      enforcePlanLimit("ws1", "tasks", 0)
    ).rejects.toThrow("deactivated");
  });

  it("blocks timeline on free plan", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "free", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "timeline", 0)
    ).rejects.toThrow("Timeline");
  });

  it("allows timeline on growth plan", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "growth", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "timeline", 0)
    ).resolves.not.toThrow();
  });

  it("blocks gantt on growth plan", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "growth", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "gantt", 0)
    ).rejects.toThrow("Gantt");
  });

  it("allows gantt on pro plan", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "pro", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "gantt", 0)
    ).resolves.not.toThrow();
  });

  it("blocks custom fields on free plan", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "free", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "custom_fields", 0)
    ).rejects.toThrow("Custom fields");
  });

  it("blocks custom fields over growth limit (5/project)", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "growth", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "custom_fields", 5)
    ).rejects.toThrow("Custom fields");
    await expect(
      enforcePlanLimit("ws1", "custom_fields", 4)
    ).resolves.not.toThrow();
  });

  it("allows unlimited custom fields on pro", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "pro", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "custom_fields", 100)
    ).resolves.not.toThrow();
  });

  it("blocks exports on free plan, allows on growth", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "free", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "exports", 0)
    ).rejects.toThrow("Export");

    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws1", plan: "growth", subscriptionStatus: "active",
      members: [{ user: { clerkId: "c1" } }],
    });
    await expect(
      enforcePlanLimit("ws1", "exports", 0)
    ).resolves.not.toThrow();
  });
});
