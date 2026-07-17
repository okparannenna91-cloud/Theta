import { describe, it, expect } from "vitest";
import { OutputValidator, ResponseQualityGate, sanitizeUserInput } from "@/lib/nova/output-validator";

describe("OutputValidator — validate", () => {
  it("rejects empty output", () => {
    expect(() => OutputValidator.validate("")).toThrow();
  });

  it("rejects whitespace-only output", () => {
    expect(() => OutputValidator.validate("   ")).toThrow();
  });

  it("rejects harmful content", () => {
    expect(() => OutputValidator.validate("how to make a bomb")).toThrow();
  });

  it("rejects self-harm content", () => {
    expect(() => OutputValidator.validate("instructions for self harm")).toThrow();
  });

  it("passes safe content", () => {
    const result = OutputValidator.validate("This is a safe response about project management.");
    expect(result).toBe("This is a safe response about project management.");
  });

  it("passes content with numbers and punctuation", () => {
    const result = OutputValidator.validate("You have 3 tasks due on 2025-01-15!");
    expect(result).toBeTruthy();
  });
});

describe("OutputValidator — validateDetailed", () => {
  it("returns valid for clean content", () => {
    const result = OutputValidator.validateDetailed("Clean response here.");
    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it("returns invalid for harmful content", () => {
    const result = OutputValidator.validateDetailed("how to make a bomb");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i: { type: string }) => i.type === "harmful")).toBe(true);
  });

  it("detects hallucination patterns", () => {
    const result = OutputValidator.validateDetailed("As an AI model, I cannot access your data");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i: { type: string }) => i.type === "hallucination")).toBe(true);
  });

  it("detects hallucination from 'i think' pattern", () => {
    const result = OutputValidator.validateDetailed("i think this might be wrong, but I'm not sure");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i: { type: string }) => i.type === "hallucination")).toBe(true);
  });
});

describe("ResponseQualityGate — review", () => {
  it("strips robotic opening 'Sure!'", () => {
    const result = ResponseQualityGate.review("Sure! I found 3 tasks.", {
      route: "CHAT",
      userPrompt: "list tasks",
    });
    expect(result.revisedResponse).not.toMatch(/^Sure!/);
    expect(result.revisedResponse).toContain("I found 3 tasks");
  });

  it("strips robotic opening 'Of course!'", () => {
    const result = ResponseQualityGate.review("Of course! Here is your data.", {
      route: "CHAT",
      userPrompt: "show data",
    });
    expect(result.revisedResponse).not.toMatch(/^Of course!/);
  });

  it("strips robotic ending", () => {
    const result = ResponseQualityGate.review("Here are your tasks.\n\nLet me know if you need anything else!", {
      route: "CHAT",
      userPrompt: "list tasks",
    });
    expect(result.revisedResponse).not.toContain("Let me know if you need anything else");
  });

  it("replaces tool names with friendly names", () => {
    const result = ResponseQualityGate.review("I used create_task to make a new task", {
      route: "ACTION",
      userPrompt: "create a task",
    });
    expect(result.revisedResponse).not.toContain("create_task");
    expect(result.revisedResponse).toContain("task creation");
  });

  it("replaces agent names", () => {
    const result = ResponseQualityGate.review("The Sprint Agent analyzed your backlog", {
      route: "ANALYSIS",
      userPrompt: "analyze sprint",
    });
    expect(result.revisedResponse).not.toContain("Sprint Agent");
    expect(result.revisedResponse).toContain("I");
  });

  it("trims long responses for simple queries", () => {
    const longResponse = Array(50).fill("This is a sentence about tasks.").join(" ");
    const result = ResponseQualityGate.review(longResponse, {
      route: "CHAT",
      userPrompt: "how many tasks",
    });
    const wordCount = result.revisedResponse.split(/\s+/).length;
    expect(wordCount).toBeLessThan(300);
  });

  it("does not trim detailed responses when user asked for detail", () => {
    const longResponse = Array(50).fill("This is a detailed analysis of your project.").join(" ");
    const result = ResponseQualityGate.review(longResponse, {
      route: "ANALYSIS",
      userPrompt: "give me a detailed analysis",
    });
    const wordCount = result.revisedResponse.split(/\s+/).length;
    expect(wordCount).toBeGreaterThan(300);
  });

  it("passes clean responses through unchanged", () => {
    const cleanResponse = "I found 3 overdue tasks in your Website project:\n\n1. **Fix login bug** — due yesterday\n2. **Update API docs** — due tomorrow\n3. **Review PR #42** — due Friday";
    const result = ResponseQualityGate.review(cleanResponse, {
      route: "CHAT",
      userPrompt: "what's overdue",
    });
    expect(result.passed).toBe(true);
    expect(result.revisedResponse).toBe(cleanResponse);
  });

  it("handles raw tool calls in response", () => {
    const result = ResponseQualityGate.review('[{"tool_code": "print(nova.tools.search_tasks(project_name=\'Theta\'))"}]', {
      route: "CHAT",
      userPrompt: "Calculate the team velocity",
    });
    expect(result.revisedResponse).not.toContain("tool_code");
    expect(result.revisedResponse).not.toContain("nova.tools");
    expect(result.issues.some((i: string) => i.includes("raw tool call"))).toBe(true);
  });

  it("strips 'Absolutely!'", () => {
    const result = ResponseQualityGate.review("Absolutely! I can help with that.", {
      route: "CHAT",
      userPrompt: "can you help?",
    });
    expect(result.revisedResponse).not.toMatch(/^Absolutely!/);
  });

  it("strips 'I would be happy to' when followed by more content", () => {
    const result = ResponseQualityGate.review("I would be happy to help you with that. Here are your tasks.", {
      route: "CHAT",
      userPrompt: "help me",
    });
    expect(result.revisedResponse).not.toMatch(/^I would be happy to/);
    expect(result.revisedResponse).toContain("Here are your tasks");
  });
});
