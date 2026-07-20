import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/langraph/model-router", () => ({
  executeWithProvider: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: vi.fn() },
    activity: { findMany: vi.fn() },
  },
}));

import { SmartAutomation } from "@/lib/nova/smart-automation";
import { executeWithProvider } from "@/lib/langraph/model-router";

const mockedExecute = vi.mocked(executeWithProvider);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SmartAutomation", () => {
  describe("parseNLToRule", () => {
    it("parses a valid automation rule from LLM", async () => {
      mockedExecute.mockResolvedValue(JSON.stringify({
        name: "Notify on task completion",
        trigger: { type: "TASK_COMPLETED", conditions: {} },
        actions: [{ type: "SEND_NOTIFICATION", params: { message: "Task done!" } }],
        explanation: "Sends a notification when any task is completed",
      }));

      const result = await SmartAutomation.parseNLToRule("notify me when tasks are completed");
      expect(result).toBeDefined();
      expect(result.name).toBe("Notify on task completion");
      expect(result.trigger.type).toBe("TASK_COMPLETED");
      expect(result.actions.length).toBe(1);
    });

    it("falls back to keyword matching on invalid JSON", async () => {
      mockedExecute.mockResolvedValue("not json at all");

      const result = await SmartAutomation.parseNLToRule("notify me when tasks are completed");
      expect(result).toBeDefined();
      expect(result.trigger).toBeDefined();
      expect(result.actions).toBeDefined();
    });

    it("falls back to keyword matching on LLM error", async () => {
      mockedExecute.mockRejectedValue(new Error("API error"));

      const result = await SmartAutomation.parseNLToRule("send email when task is overdue");
      expect(result).toBeDefined();
      expect(result.trigger).toBeDefined();
    });
  });

  describe("previewRule", () => {
    it("generates a preview explanation", async () => {
      const rule = {
        name: "Test Rule",
        trigger: { type: "TASK_COMPLETED", conditions: {} },
        actions: [{ type: "SEND_NOTIFICATION", params: { message: "Done!" } }],
        explanation: "Test",
      };

      const result = await SmartAutomation.previewRule(rule);
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
