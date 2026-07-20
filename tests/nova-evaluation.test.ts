import { describe, it, expect } from "vitest";
import { routeRequest } from "@/lib/nova/intent-router";
import { detectInternalLeakage, detectToolNameExposure, detectAgentNameExposure, detectIdentityLeakage, detectRawToolCalls, extractToolCallsFromText, OutputValidator } from "@/lib/nova/output-validator";
import { ResponseQualityGate } from "@/lib/nova/output-validator";

describe("Nova Evaluation Suite — Routing", () => {
  describe("General chat", () => {
    it("routes greeting to CONVERSATION", () => {
      const route = routeRequest("hi", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes 'what can you do' to CHAT", () => {
      const route = routeRequest("what can you do", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes 'who are you' to CHAT", () => {
      const route = routeRequest("who are you", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes thanks to CHAT", () => {
      const route = routeRequest("thanks", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes goodbye to CHAT", () => {
      const route = routeRequest("goodbye", "READ");
      expect(route.path).toBe("CHAT");
    });
  });

  describe("Task management", () => {
    it("routes 'create a task' to ACTION", () => {
      const route = routeRequest("create a task called 'Fix login bug'", "CREATE");
      expect(route.path).toBe("ACTION");
    });

    it("routes 'list my tasks' to CHAT", () => {
      const route = routeRequest("list my tasks", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes 'what tasks are overdue' to CHAT (not CONVERSATION)", () => {
      const route = routeRequest("what tasks are overdue", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes 'break down this task' to ACTION", () => {
      const route = routeRequest("break down this task into subtasks", "CREATE");
      expect(route.path).toBe("ACTION");
    });

    it("routes 'set priority to high' to ACTION", () => {
      const route = routeRequest("set priority to high", "UPDATE");
      expect(route.path).toBe("ACTION");
    });
  });

  describe("Project management", () => {
    it("routes 'create project' to ACTION", () => {
      const route = routeRequest("create project 'Website Redesign'", "CREATE");
      expect(route.path).toBe("ACTION");
    });

    it("routes 'how is my project doing' to CHAT", () => {
      const route = routeRequest("how is my project doing", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes 'list projects' to CHAT", () => {
      const route = routeRequest("list projects", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes 'project health check' to ANALYSIS", () => {
      const route = routeRequest("run a project health check", "ANALYZE");
      expect(route.path).toBe("ANALYSIS");
    });
  });

  describe("Calendar", () => {
    it("routes 'what's on my calendar' to CHAT", () => {
      const route = routeRequest("what's on my calendar", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes 'upcoming deadlines' to CHAT", () => {
      const route = routeRequest("show me upcoming deadlines", "READ");
      expect(route.path).toBe("CHAT");
    });
  });

  describe("Teams", () => {
    it("routes 'who is on my team' to CHAT", () => {
      const route = routeRequest("who is on my team", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes 'invite member' to ACTION", () => {
      const route = routeRequest("invite member john@example.com", "CREATE");
      expect(route.path).toBe("ACTION");
    });
  });

  describe("Analytics", () => {
    it("routes 'show velocity' to ANALYSIS", () => {
      const route = routeRequest("show team velocity", "ANALYZE");
      expect(route.path).toBe("ANALYSIS");
    });

    it("routes 'task completion rate' to CHAT", () => {
      const route = routeRequest("what is my task completion rate", "READ");
      expect(route.path).toBe("CHAT");
    });
  });

  describe("Risk analysis", () => {
    it("routes 'run risk assessment' to ANALYSIS", () => {
      const route = routeRequest("run a risk assessment", "ANALYZE");
      expect(route.path).toBe("ANALYSIS");
    });

    it("routes 'what are the blockers' to CHAT", () => {
      const route = routeRequest("what are the current blockers", "READ");
      expect(route.path).toBe("CHAT");
    });
  });

  describe("Reporting", () => {
    it("routes 'generate standup' to ANALYSIS", () => {
      const route = routeRequest("generate a daily standup", "REPORT");
      expect(route.path).toBe("ANALYSIS");
    });

    it("routes 'status report' to ANALYSIS", () => {
      const route = routeRequest("generate a status report", "REPORT");
      expect(route.path).toBe("ANALYSIS");
    });
  });

  describe("Planning", () => {
    it("routes 'plan a sprint' to ACTION", () => {
      const route = routeRequest("plan a sprint for next week", "CREATE");
      expect(route.path).toBe("ACTION");
    });
  });

  describe("Ambiguous requests", () => {
    it("routes 'help' to CONVERSATION", () => {
      const route = routeRequest("help", "READ");
      expect(route.path).toBe("CHAT");
    });
  });

  describe("Context awareness", () => {
    it("routes workspace-related questions to CHAT (not CONVERSATION)", () => {
      const route = routeRequest("anything urgent", "READ");
      expect(route.path).toBe("CHAT");
    });

    it("routes 'team workload' to CHAT", () => {
      const route = routeRequest("show team workload", "READ");
      expect(route.path).toBe("CHAT");
    });
  });
});

describe("Nova Evaluation Suite — Leakage Prevention", () => {
  it("detects internal leakage in 'ContextSystem loaded'", () => {
    expect(detectInternalLeakage("ContextSystem loaded the data")).toBe(true);
  });

  it("detects internal leakage in 'MemorySystem fetched'", () => {
    expect(detectInternalLeakage("MemorySystem fetched your history")).toBe(true);
  });

  it("detects internal leakage in 'PhilosophyEngine optimized'", () => {
    expect(detectInternalLeakage("PhilosophyEngine optimized the response")).toBe(true);
  });

  it("detects internal leakage in 'DecisionFramework classified'", () => {
    expect(detectInternalLeakage("DecisionFramework classified the intent")).toBe(true);
  });

  it("detects internal leakage in 'NovaAgent executed'", () => {
    expect(detectInternalLeakage("NovaAgent executed the pipeline")).toBe(true);
  });

  it("detects internal leakage in 'LangGraph processed'", () => {
    expect(detectInternalLeakage("LangGraph processed the request")).toBe(true);
  });

  it("does not flag clean responses", () => {
    expect(detectInternalLeakage("I found 3 overdue tasks in your Website project")).toBe(false);
  });

  it("detects tool name exposure", () => {
    expect(detectToolNameExposure("I called create_task to make a new task")).toBe(true);
  });

  it("does not flag clean responses for tool names", () => {
    expect(detectToolNameExposure("I created a new task for you")).toBe(false);
  });

  it("detects agent name exposure", () => {
    expect(detectAgentNameExposure("The Sprint Agent analyzed your backlog")).toBe(true);
  });

  it("detects identity leakage", () => {
    expect(detectIdentityLeakage("As an AI language model, I cannot access your data")).toBe(true);
  });

  it("detects identity leakage variant", () => {
    expect(detectIdentityLeakage("I'm an AI and I don't have real-time access")).toBe(true);
  });

  it("does not flag clean responses for identity", () => {
    expect(detectIdentityLeakage("I found 3 tasks in your workspace")).toBe(false);
  });
});

describe("Nova Evaluation Suite — Quality Gate", () => {
  it("strips robotic opening 'Sure!'", () => {
    const result = ResponseQualityGate.review("Sure! I found 3 tasks.", {
      route: "CHAT",
      userPrompt: "list tasks",
    });
    expect(result.revisedResponse).not.toMatch(/^Sure!/);
    expect(result.revisedResponse).toContain("I found 3 tasks");
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
});

describe("Nova Evaluation Suite — Output Validation", () => {
  it("validates clean output", () => {
    const result = OutputValidator.validate("I found 3 tasks in your project.");
    expect(result).toBeTruthy();
  });

  it("rejects harmful content", () => {
    expect(() => OutputValidator.validate("How to build a bomb")).toThrow();
  });

  it("detects hallucination patterns", () => {
    const detailed = OutputValidator.validateDetailed("As an AI model, I cannot access your data");
    expect(detailed.valid).toBe(false);
    expect(detailed.issues.some(i => i.type === "hallucination")).toBe(true);
  });
});

describe("Nova Evaluation Suite — Raw Tool Call Detection", () => {
  it("detects JSON array tool call format", () => {
    expect(detectRawToolCalls('[{"tool_code": "print(nova.tools.search_tasks(project_name=\'Theta\'))"}]')).toBe(true);
  });

  it("detects tool_name format", () => {
    expect(detectRawToolCalls('[{"tool_name": "list_tasks", "params": {}}]')).toBe(true);
  });

  it("detects function format", () => {
    expect(detectRawToolCalls('[{"function": "create_task", "args": {"title": "test"}}]')).toBe(true);
  });

  it("does not flag clean responses", () => {
    expect(detectRawToolCalls("I found 3 overdue tasks in your project.")).toBe(false);
  });

  it("extracts tool calls from JSON array", () => {
    const calls = extractToolCallsFromText('[{"tool_code": "print(nova.tools.search_tasks(project_name=\'Theta\'))"}]');
    expect(calls.length).toBe(1);
    expect(calls[0].tool).toBe("search_tasks");
    expect(calls[0].params.project_name).toBe("Theta");
  });

  it("extracts tool calls from print statement", () => {
    const calls = extractToolCallsFromText('print(nova.tools.list_tasks(project_name="Theta"))');
    expect(calls.length).toBe(1);
    expect(calls[0].tool).toBe("list_tasks");
    expect(calls[0].params.project_name).toBe("Theta");
  });

  it("quality gate replaces raw tool calls with clean message", () => {
    const result = ResponseQualityGate.review('[{"tool_code": "print(nova.tools.search_tasks(project_name=\'Theta\'))"}]', {
      route: "CHAT",
      userPrompt: "Calculate the team velocity",
    });
    expect(result.revisedResponse).not.toContain("tool_code");
    expect(result.revisedResponse).not.toContain("nova.tools");
    expect(result.issues.some(i => i.includes("raw tool call"))).toBe(true);
  });
});
