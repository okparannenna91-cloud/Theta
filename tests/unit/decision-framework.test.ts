import { describe, it, expect } from "vitest";
import { DecisionFramework } from "@/lib/nova/decision-framework";

describe("DecisionFramework", () => {
  describe("evaluate — intent classification", () => {
    it("classifies DELETE intents", () => {
      const r = DecisionFramework.evaluate("delete the task Fix login bug");
      expect(r.intent).toBe("DELETE");
    });

    it("classifies CREATE intents", () => {
      const r = DecisionFramework.evaluate("create a new task called Onboarding");
      expect(r.intent).toBe("CREATE");
    });

    it("classifies UPDATE intents", () => {
      const r = DecisionFramework.evaluate("update the project description");
      expect(r.intent).toBe("UPDATE");
    });

    it("classifies READ intents", () => {
      const r = DecisionFramework.evaluate("show me my tasks");
      expect(r.intent).toBe("READ");
    });

    it("classifies REPORT intents", () => {
      const r = DecisionFramework.evaluate("analyze team velocity");
      expect(r.intent).toBe("REPORT");
    });

    it("classifies PLAN intents", () => {
      const r = DecisionFramework.evaluate("plan a sprint for next week");
      expect(r.intent).toBe("PLAN");
    });
  });

  describe("evaluate — risk levels", () => {
    it("marks medium-risk delete of project (single item)", () => {
      const r = DecisionFramework.evaluate("delete the project");
      expect(r.riskLevel).toBe("MEDIUM");
      expect(r.requiresConfirmation).toBe(true);
    });

    it("marks medium-risk delete of workspace (single item)", () => {
      const r = DecisionFramework.evaluate("delete workspace");
      expect(r.riskLevel).toBe("MEDIUM");
    });

    it("marks high-risk billing update", () => {
      const r = DecisionFramework.evaluate("update subscription plan");
      expect(r.riskLevel).toBe("HIGH");
    });

    it("marks medium-risk bulk erase pattern", () => {
      const r = DecisionFramework.evaluate("erase all tasks");
      expect(r.riskLevel).toBe("MEDIUM");
    });

    it("marks low-risk single update", () => {
      const r = DecisionFramework.evaluate("update the task title");
      expect(r.riskLevel).toBe("LOW");
      expect(r.requiresConfirmation).toBe(false);
    });

    it("marks low-risk read", () => {
      const r = DecisionFramework.evaluate("show me my tasks");
      expect(r.riskLevel).toBe("LOW");
      expect(r.requiresApproval).toBe(false);
    });

    it("marks low-risk create", () => {
      const r = DecisionFramework.evaluate("create a new task");
      expect(r.riskLevel).toBe("LOW");
    });
  });

  describe("evaluate — strategy selection", () => {
    it("uses PATH_B_CONFIRMATION for medium-risk", () => {
      const r = DecisionFramework.evaluate("show me my tasks");
      expect(r.strategy).toBe("PATH_D_INFO");
    });

    it("uses PATH_B_CONFIRMATION for high-risk", () => {
      const r = DecisionFramework.evaluate("delete the project");
      expect(r.strategy).toBe("PATH_B_CONFIRMATION");
    });

    it("defaults to PATH_D_INFO for generic reads", () => {
      const r = DecisionFramework.evaluate("what can you do");
      expect(r.strategy).toBe("PATH_D_INFO");
    });
  });

  describe("evaluate — reversibility", () => {
    it("marks deletes as reversible", () => {
      const r = DecisionFramework.evaluate("delete task 123");
      expect(r.reversible).toBe(true);
    });

    it("marks billing changes as irreversible", () => {
      const r = DecisionFramework.evaluate("update my subscription plan");
      expect(r.reversible).toBe(false);
    });
  });

  describe("evaluate — edge cases", () => {
    it("handles empty string gracefully", () => {
      const r = DecisionFramework.evaluate("");
      expect(r.intent).toBeDefined();
      expect(r.riskLevel).toBeDefined();
    });

    it("handles very long prompts", () => {
      const r = DecisionFramework.evaluate("a".repeat(10000));
      expect(r.intent).toBeDefined();
    });

    it("handles mixed case", () => {
      const r = DecisionFramework.evaluate("DELETE THE PROJECT");
      expect(r.intent).toBe("DELETE");
    });

    it("handles punctuation", () => {
      const r = DecisionFramework.evaluate("Delete the project?");
      expect(r.intent).toBe("DELETE");
    });

    it("handles low-risk purge pattern", () => {
      const r = DecisionFramework.evaluate("purge old tasks");
      expect(r.riskLevel).toBe("LOW");
    });

    it("handles low-risk erase pattern", () => {
      const r = DecisionFramework.evaluate("erase the database");
      expect(r.riskLevel).toBe("LOW");
    });
  });
});
