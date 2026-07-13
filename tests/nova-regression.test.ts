import { describe, it, expect } from "vitest";
import { detectInternalLeakage, detectToolNameExposure, detectAgentNameExposure, detectIdentityLeakage, ResponseQualityGate } from "@/lib/nova/output-validator";

describe("Nova Regression Tests", () => {
  describe("1. No internal reasoning leakage", () => {
    const internalPatterns = [
      "ContextSystem loaded the workspace",
      "MemorySystem fetched conversation history",
      "PhilosophyEngine optimized the response",
      "DecisionFramework classified the intent",
      "AgentFramework planned the execution",
      "NovaAgent executed the pipeline",
      "LangGraph processed the request",
      "TaskIntelligence analyzed the task",
      "ProjectIntelligence evaluated the project",
      "SecurityGuard enforced permissions",
      "OutputValidator validated the response",
      "executeWithFallback tried the providers",
      "routeModel selected the provider",
      "loadWorkspaceContext fetched the data",
      "loadMemory retrieved conversation history",
      "tryDirectAction handled the command",
      "planAndExecute decomposed the request",
      "streamText generated the response",
      "enforcePermission checked access",
      "saveConversationMemory persisted the data",
    ];

    for (const pattern of internalPatterns) {
      it(`detects: "${pattern.substring(0, 40)}..."`, () => {
        expect(detectInternalLeakage(pattern)).toBe(true);
      });
    }

    it("does not flag clean responses", () => {
      const cleanResponses = [
        "I found 3 overdue tasks in your Website project",
        "Your project health score is 85%",
        "I've created the task 'Fix login bug' with high priority",
        "The team has completed 12 tasks this sprint",
        "Looking at your workspace, you have 2 projects with 45 total tasks",
      ];

      for (const response of cleanResponses) {
        expect(detectInternalLeakage(response)).toBe(false);
      }
    });
  });

  describe("2. No tool names exposed", () => {
    const toolNames = [
      "create_task", "list_tasks", "update_task", "delete_task",
      "breakdown_task", "create_dependency", "set_estimation",
      "list_projects", "create_project", "update_project", "delete_project",
      "project_health_analysis", "create_sprint_board",
      "list_workspaces", "update_workspace", "list_members",
      "evaluate_risks", "get_suggestions", "generate_daily_brief",
      "generate_standup", "search_workspace", "create_document",
      "create_automation", "dispatch_ui_action", "orchestrate_agentic_workflow",
    ];

    for (const toolName of toolNames) {
      it(`detects tool name: "${toolName}"`, () => {
        expect(detectToolNameExposure(`I used ${toolName} to complete the action`)).toBe(true);
      });
    }

    it("does not flag friendly descriptions", () => {
      const friendly = [
        "I created a new task for you",
        "I listed your projects",
        "I ran a risk evaluation on your project",
        "I generated a standup report",
      ];

      for (const response of friendly) {
        expect(detectToolNameExposure(response)).toBe(false);
      }
    });
  });

  describe("3. No agent names exposed", () => {
    const agentNames = [
      "Sprint Agent", "Task Agent", "Reporting Agent", "Risk Agent",
      "Documentation Agent", "Automation Agent", "Research Agent", "Executive Agent",
    ];

    for (const agentName of agentNames) {
      it(`detects agent name: "${agentName}"`, () => {
        expect(detectAgentNameExposure(`The ${agentName} analyzed your data`)).toBe(true);
      });
    }

    it("does not flag 'I' as agent name", () => {
      expect(detectAgentNameExposure("I analyzed your data and found 3 issues")).toBe(false);
    });
  });

  describe("4. Uses workspace context", () => {
    it("quality gate passes with workspace context", () => {
      const result = ResponseQualityGate.review(
        "I found 3 tasks in your Website project:\n1. Fix login bug\n2. Update docs\n3. Review PR",
        {
          route: "CHAT",
          workspaceContext: "ACTIVE PROJECT: Website Redesign\nTasks: 15 total, 3 overdue",
          userPrompt: "list tasks",
        }
      );
      expect(result.passed).toBe(true);
    });
  });

  describe("5. Doesn't ask unnecessary questions", () => {
    it("quality gate flags 'which project' when context has project", () => {
      const result = ResponseQualityGate.review(
        "Which project would you like me to analyze?",
        {
          route: "CHAT",
          workspaceContext: "ACTIVE PROJECT: Website Redesign",
          userPrompt: "run health check",
        }
      );
      expect(result.revisedResponse).not.toContain("Which project");
    });
  });

  describe("6. Natural conversational tone", () => {
    const roboticOpenings = [
      "Sure! Here are your tasks.",
      "Of course! I can help with that.",
      "Absolutely! Let me check.",
      "I would be happy to help you with that. Let me look into it.",
      "Here is a summary of your tasks. You have 5 items due this week.",
    ];

    for (const opening of roboticOpenings) {
      it(`strips robotic opening: "${opening.substring(0, 30)}..."`, () => {
        const result = ResponseQualityGate.review(opening, {
          route: "CHAT",
          userPrompt: "show tasks",
        });
        expect(result.revisedResponse).not.toMatch(/^(sure|of course|absolutely|i would be happy to|here is)/i);
      });
    }
  });

  describe("7. Concise by default", () => {
    it("simple question gets concise response", () => {
      const longResponse = Array(50).fill("This is a sentence about your project status.").join(" ");
      const result = ResponseQualityGate.review(longResponse, {
        route: "CHAT",
        userPrompt: "how many tasks",
      });
      const wordCount = result.revisedResponse.split(/\s+/).length;
      expect(wordCount).toBeLessThan(300);
    });

    it("detailed request keeps detail", () => {
      const longResponse = Array(50).fill("This is a detailed analysis of your project.").join(" ");
      const result = ResponseQualityGate.review(longResponse, {
        route: "ANALYSIS",
        userPrompt: "give me a comprehensive breakdown",
      });
      const wordCount = result.revisedResponse.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(300);
    });
  });

  describe("8. No hallucinated data", () => {
    it("clean response passes validation", () => {
      const result = ResponseQualityGate.review(
        "You have 5 tasks in your workspace. 2 are overdue.",
        {
          route: "CHAT",
          workspaceContext: "Tasks: 5 total, 2 overdue",
          userPrompt: "list tasks",
        }
      );
      expect(result.passed).toBe(true);
    });
  });

  describe("9. Quality gate passes clean responses", () => {
    const cleanResponses = [
      "I found 3 overdue tasks in your Website project:\n1. **Fix login bug** — due yesterday\n2. **Update API docs** — due tomorrow\n3. **Review PR #42** — due Friday",
      "Your project health score is 85%. The main risk is the approaching deadline for the mobile app launch.",
      "I've created the task 'Implement auth flow' with high priority in the Website Redesign project.",
      "The team has completed 12 out of 20 tasks this sprint, putting you at 60% completion.",
    ];

    for (const response of cleanResponses) {
      it(`passes: "${response.substring(0, 50)}..."`, () => {
        const result = ResponseQualityGate.review(response, {
          route: "CHAT",
          workspaceContext: "Projects: Website Redesign, Mobile App",
          userPrompt: "show status",
        });
        expect(result.passed).toBe(true);
      });
    }
  });
});
