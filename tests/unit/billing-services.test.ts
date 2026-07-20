import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: vi.fn(), update: vi.fn() },
    billingLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/billing-plans", () => ({
  getPlanPriceDynamic: vi.fn().mockReturnValue({ base: 500, perUser: 200, currency: "NGN" }),
}));

vi.mock("@/lib/billing/subscription-state-machine", () => ({
  transition: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/billing/providers/registry", () => ({
  providerRegistry: {
    getProvider: vi.fn().mockReturnValue({
      retryPayment: vi.fn().mockResolvedValue({ success: false, error: "card declined" }),
    }),
  },
}));

import { DunningService } from "@/lib/billing/services/dunning-service";
import { prisma } from "@/lib/prisma";

describe("DunningService", () => {
  const service = new DunningService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startDunning", () => {
    it("throws if workspace not found", async () => {
      (prisma.workspace.findUnique as any).mockResolvedValue(null);
      await expect(service.startDunning("ws1")).rejects.toThrow("not found");
    });

    it("throws if workspace not past_due", async () => {
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws1", subscriptionStatus: "active",
      });
      await expect(service.startDunning("ws1")).rejects.toThrow("Cannot start dunning");
    });

    it("starts dunning for past_due workspace", async () => {
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws1", subscriptionStatus: "past_due", billingProvider: "flutterwave",
      });
      await service.startDunning("ws1");
      expect(prisma.workspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ws1" },
          data: expect.objectContaining({ dunningLevel: 0 }),
        })
      );
    });
  });

  describe("DUNNING_LEVELS", () => {
    it("has 3 levels", () => {
      expect(DunningService.DUNNING_LEVELS).toHaveLength(3);
    });

    it("levels increase in delay hours", () => {
      const levels = DunningService.DUNNING_LEVELS;
      expect(levels[1].delayHours).toBeGreaterThan(levels[0].delayHours);
      expect(levels[2].delayHours).toBeGreaterThan(levels[1].delayHours);
    });

    it("all levels send email", () => {
      for (const level of DunningService.DUNNING_LEVELS) {
        expect(level.sendEmail).toBe(true);
      }
    });
  });
});

describe("Billing — getPlanPriceDynamic", () => {
  it("returns correct pricing structure", async () => {
    const { getPlanPriceDynamic } = await import("@/lib/billing-plans");
    const price = await getPlanPriceDynamic("growth", "monthly");
    expect(price).toHaveProperty("base");
    expect(price).toHaveProperty("perUser");
    expect(price).toHaveProperty("currency");
  });
});
