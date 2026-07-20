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
});
