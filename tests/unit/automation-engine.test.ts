import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  workspace: {
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
  },
  project: {
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
  },
  task: {
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    groupBy: vi.fn().mockResolvedValue([]),
    aggregate: vi.fn().mockResolvedValue({ _sum: {}, _count: {}, _avg: {} }),
  },
  taskDependency: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
  workspaceMember: {
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
  sprint: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
  activity: {
    findMany: vi.fn().mockResolvedValue([]),
    groupBy: vi.fn().mockResolvedValue([]),
  },
  aiMemory: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  proactiveInsight: {
    create: vi.fn().mockResolvedValue({}),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  },
  agentAction: {
    create: vi.fn().mockResolvedValue({}),
    findMany: vi.fn().mockResolvedValue([]),
  },
  chatMessage: {
    create: vi.fn().mockResolvedValue({}),
  },
  automation: {
    findMany: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/redis/client", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    eval: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("@/lib/langraph/model-router", () => ({
  executeWithProvider: vi.fn().mockResolvedValue(
    JSON.stringify({
      shouldSpeak: false,
      level: 0,
      message: "",
      reasoning: "test",
      category: "SUMMARY",
      tone: "neutral",
    })
  ),
}));

vi.mock("@/lib/notification-engine", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
}));

vi.mock("@/lib/ably", () => ({
  publishToChannel: vi.fn().mockResolvedValue(undefined),
}));

import { processAutomations, type AutomationTrigger } from "@/lib/automations/engine";
import { inngest } from "@/lib/inngest/client";
import { NovaEventBus } from "@/lib/nova/ambient/event-bus";

const TRIGGER_TO_EVENT: Record<AutomationTrigger, string> = {
  TASK_CREATED: "task:created",
  TASK_STATUS_UPDATED: "task:updated",
  TASK_COMPLETED: "task:completed",
  TASK_ASSIGNED: "task:assigned",
  TASK_PRIORITY_CHANGED: "task:updated",
  DUE_DATE_PASSED: "deadline:passed",
  PROJECT_CREATED: "project:created",
  SPRINT_STARTED: "sprint:started",
  SPRINT_COMPLETED: "sprint:updated",
  FORM_SUBMITTED: "comment:created",
  DOCUMENT_UPDATED: "workspace:updated",
  USER_INVITED: "member:joined",
  MEMBER_ADDED: "member:joined",
};

describe("Automation Engine — processAutomations (observation mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    NovaEventBus.getInstance().clearHistory();
  });

  it("emits a mapped event to the Nova event bus instead of executing rules", async () => {
    await processAutomations("ws1", "TASK_CREATED", { userId: "u1", taskId: "t1" });

    const events = NovaEventBus.getInstance().getHistory("task:created");
    expect(events).toHaveLength(1);
    expect(events[0].workspaceId).toBe("ws1");
    expect(events[0].userId).toBe("u1");
    expect(events[0].taskId).toBe("t1");
    expect(events[0].metadata?.trigger).toBe("TASK_CREATED");
  });

  it("never fires automation rule executions (observation only)", async () => {
    await processAutomations("ws1", "TASK_CREATED", { userId: "u1" });
    await processAutomations("ws1", "SPRINT_COMPLETED", { userId: "u1" });

    expect(inngest.send).not.toHaveBeenCalled();
    expect(prismaMock.automation.findMany).not.toHaveBeenCalled();
  });

  it("maps each legacy trigger to its canonical event type", async () => {
    const triggers = Object.keys(TRIGGER_TO_EVENT) as AutomationTrigger[];
    expect(triggers).toHaveLength(13);

    for (const trigger of triggers) {
      const workspaceId = `ws-${trigger}`;
      const bus = NovaEventBus.getInstance();
      bus.clearHistory();

      await expect(
        processAutomations(workspaceId, trigger, { userId: "u1" })
      ).resolves.not.toThrow();

      const events = bus.getHistory(TRIGGER_TO_EVENT[trigger]);
      expect(events.some((e) => e.workspaceId === workspaceId)).toBe(true);
    }
  });

  it("carries task context into the event metadata", async () => {
    await processAutomations("ws1", "TASK_STATUS_UPDATED", {
      userId: "u1",
      taskId: "t1",
      taskTitle: "Fix login",
      oldValue: "todo",
      newValue: "done",
    });

    const events = NovaEventBus.getInstance().getHistory("task:updated");
    expect(events[0].metadata).toMatchObject({
      trigger: "TASK_STATUS_UPDATED",
      taskTitle: "Fix login",
      oldValue: "todo",
      newValue: "done",
    });
  });

  it("handles missing optional context fields", async () => {
    await processAutomations("ws1", "TASK_CREATED", {});

    const events = NovaEventBus.getInstance().getHistory("task:created");
    expect(events[0].userId).toBeUndefined();
    expect(events[0].taskId).toBeUndefined();
  });

  it("catches and logs errors without throwing", async () => {
    prismaMock.workspace.findUnique.mockRejectedValueOnce(new Error("DB error"));

    await expect(
      processAutomations("ws1", "TASK_CREATED", { userId: "u1" })
    ).resolves.not.toThrow();
  });
});
