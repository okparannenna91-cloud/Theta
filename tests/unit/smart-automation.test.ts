import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/langraph/model-router", () => ({
  executeWithProvider: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { SmartAutomationEngine } from "@/lib/nova/smart-automation";
import { executeWithProvider } from "@/lib/langraph/model-router";

const mockedExecute = vi.mocked(executeWithProvider);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SmartAutomationEngine", () => {
  describe("parseNaturalLanguage", () => {
    it("parses a valid automation rule", async () => {
      mockedExecute.mockResolvedValue(JSON.stringify({
        name: "Notify on task completion",
        description: "Send notification when tasks are done",
        trigger: { type: "TASK_COMPLETED", conditions: [] },
        actions: [{ type: "SEND_NOTIFICATION", params: { message: "Task done!" } }],
        enabled: true,
      }));

      const result = await SmartAutomationEngine.parseNaturalLanguage("notify me when tasks are completed");
      expect(result).toBeDefined();
      expect(result.name).toBe("Notify on task completion");
      expect(result.trigger.type).toBe("TASK_COMPLETED");
    });

    it("throws for unparseable input", async () => {
      mockedExecute.mockResolvedValue("not json");
      await expect(SmartAutomationEngine.parseNaturalLanguage("asdfghjkl")).rejects.toThrow();
    });

    it("throws when LLM throws", async () => {
      mockedExecute.mockRejectedValue(new Error("API error"));
      await expect(SmartAutomationEngine.parseNaturalLanguage("test")).rejects.toThrow("API error");
    });
  });

  describe("validateRule", () => {
    it("validates a correct rule", () => {
      const result = SmartAutomationEngine.validateRule({
        name: "Test",
        description: "Test rule",
        trigger: { type: "TASK_CREATED", conditions: [] },
        actions: [{ type: "SEND_NOTIFICATION", params: {} }],
        enabled: true,
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects invalid trigger type", () => {
      const result = SmartAutomationEngine.validateRule({
        name: "Test",
        description: "Test",
        trigger: { type: "INVALID_TRIGGER" as any, conditions: [] },
        actions: [{ type: "SEND_NOTIFICATION", params: {} }],
        enabled: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("trigger"))).toBe(true);
    });

    it("rejects invalid action type", () => {
      const result = SmartAutomationEngine.validateRule({
        name: "Test",
        description: "Test",
        trigger: { type: "TASK_CREATED", conditions: [] },
        actions: [{ type: "INVALID_ACTION" as any, params: {} }],
        enabled: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("action"))).toBe(true);
    });

    it("rejects empty actions", () => {
      const result = SmartAutomationEngine.validateRule({
        name: "Test",
        description: "Test",
        trigger: { type: "TASK_CREATED", conditions: [] },
        actions: [],
        enabled: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("At least one"))).toBe(true);
    });

    it("rejects too many actions", () => {
      const result = SmartAutomationEngine.validateRule({
        name: "Test",
        description: "Test",
        trigger: { type: "TASK_CREATED", conditions: [] },
        actions: [
          { type: "SEND_NOTIFICATION", params: {} },
          { type: "SEND_NOTIFICATION", params: {} },
          { type: "SEND_NOTIFICATION", params: {} },
          { type: "SEND_NOTIFICATION", params: {} },
          { type: "SEND_NOTIFICATION", params: {} },
          { type: "SEND_NOTIFICATION", params: {} },
        ],
        enabled: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("Maximum"))).toBe(true);
    });
  });

  describe("explainRule", () => {
    it("generates a human-readable explanation", () => {
      const explanation = SmartAutomationEngine.explainRule({
        name: "Test Rule",
        description: "A test",
        trigger: { type: "TASK_COMPLETED", conditions: [] },
        actions: [{ type: "SEND_NOTIFICATION", params: { message: "Done!" } }],
        enabled: true,
      });
      expect(typeof explanation).toBe("string");
      expect(explanation.length).toBeGreaterThan(0);
    });
  });
});
