import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    automation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

import { processAutomations, type AutomationTrigger, type TriggerContext } from "@/lib/automations/engine";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

describe("Automation Engine — processAutomations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fires no events when no matching rules exist", async () => {
    (prisma.automation.findMany as any).mockResolvedValue([]);
    await processAutomations("ws1", "TASK_CREATED", { userId: "u1" });
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("fires one event per matching rule", async () => {
    (prisma.automation.findMany as any).mockResolvedValue([
      { id: "rule1", name: "Rule 1" },
      { id: "rule2", name: "Rule 2" },
    ]);
    await processAutomations("ws1", "TASK_CREATED", { userId: "u1", taskId: "t1" });
    expect(inngest.send).toHaveBeenCalledTimes(2);
    expect(inngest.send).toHaveBeenCalledWith({
      name: "automation/triggered",
      data: {
        ruleId: "rule1",
        triggerType: "TASK_CREATED",
        context: expect.objectContaining({ workspaceId: "ws1", userId: "u1", taskId: "t1" }),
      },
    });
  });

  it("queries with correct trigger type", async () => {
    await processAutomations("ws1", "SPRINT_COMPLETED", { userId: "u1" });
    expect(prisma.automation.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", active: true, trigger: "SPRINT_COMPLETED" },
      select: { id: true, name: true },
    });
  });

  it("only queries active automations", async () => {
    await processAutomations("ws1", "TASK_CREATED", { userId: "u1" });
    expect(prisma.automation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ active: true }),
      })
    );
  });

  it("includes all context fields in event data", async () => {
    (prisma.automation.findMany as any).mockResolvedValue([{ id: "r1", name: "R1" }]);
    const ctx: Omit<TriggerContext, "workspaceId"> = {
      userId: "u1",
      taskId: "t1",
      projectId: "p1",
      taskTitle: "Test Task",
      taskPriority: "high",
      oldValue: "todo",
      newValue: "done",
    };
    await processAutomations("ws1", "TASK_COMPLETED", ctx);
    expect(inngest.send).toHaveBeenCalledWith({
      name: "automation/triggered",
      data: {
        ruleId: "r1",
        triggerType: "TASK_COMPLETED",
        context: expect.objectContaining({
          workspaceId: "ws1",
          ...ctx,
        }),
      },
    });
  });

  it("handles all 13 trigger types without error", async () => {
    const triggers: AutomationTrigger[] = [
      "TASK_CREATED", "TASK_STATUS_UPDATED", "TASK_COMPLETED",
      "TASK_ASSIGNED", "TASK_PRIORITY_CHANGED", "DUE_DATE_PASSED",
      "PROJECT_CREATED", "SPRINT_STARTED", "SPRINT_COMPLETED",
      "FORM_SUBMITTED", "DOCUMENT_UPDATED", "USER_INVITED", "MEMBER_ADDED",
    ];
    for (const trigger of triggers) {
      await expect(
        processAutomations("ws1", trigger, { userId: "u1" })
      ).resolves.not.toThrow();
    }
  });

  it("catches and logs errors without throwing", async () => {
    (prisma.automation.findMany as any).mockRejectedValue(new Error("DB error"));
    await expect(
      processAutomations("ws1", "TASK_CREATED", { userId: "u1" })
    ).resolves.not.toThrow();
  });
});
