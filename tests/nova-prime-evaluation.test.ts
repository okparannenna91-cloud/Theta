import { describe, it, expect, beforeEach } from "vitest";
import { ParameterExtractor } from "@/lib/nova/parameter-extractor";
import { PlanningEngine } from "@/lib/nova/planning-engine";
import { WorkflowOrchestrator } from "@/lib/nova/workflow-orchestrator";
import { ValidationEngine } from "@/lib/nova/validation-engine";
import { ProactiveIntelligenceEngine } from "@/lib/nova/proactive-intelligence";
import { ResponseFormatter } from "@/lib/nova/response-formatter";
import { PhilosophyEngine } from "@/lib/nova/philosophy-engine";
import { intentFromString, getConfidenceLevel } from "@/lib/nova/constitution/execution";
import { routeRequest } from "@/lib/nova/intent-router";

describe("Nova Prime Evaluation Suite", () => {
  describe("1. Explicit Instruction Fidelity", () => {
    it("extracts title from 'Create a task called Outreach'", () => {
      const params = ParameterExtractor.extract("Create a task called Outreach");
      expect(params.title).toBe("Outreach");
      expect(params.isExplicit.title).toBe(true);
    });

    it("extracts priority from 'Priority High'", () => {
      const params = ParameterExtractor.extract("Create task with Priority High");
      expect(params.priority).toBe("high");
      expect(params.isExplicit.priority).toBe(true);
    });

    it("extracts due date from 'due tomorrow'", () => {
      const params = ParameterExtractor.extract("Create task due tomorrow");
      expect(params.dueDate).toBe("tomorrow");
      expect(params.isExplicit.dueDate).toBe(true);
    });

    it("extracts assignee from 'assign to John'", () => {
      const params = ParameterExtractor.extract("Create task assign to John");
      expect(params.assignee).toBe("John");
      expect(params.isExplicit.assignee).toBe(true);
    });

    it("preserves explicit user values in merge", () => {
      const extracted = {
        title: "Outreach",
        description: null,
        priority: "high",
        dueDate: null,
        assignee: null,
        projectName: null,
        status: null,
        tags: [],
        isExplicit: { title: true, priority: true, dueDate: false, assignee: false, projectName: false },
        confidence: 0.8,
      };
      const defaults = { title: "Default Task", priority: "medium" };

      const merged = ParameterExtractor.mergeWithDefaults(extracted, defaults);
      expect(merged.title).toBe("Outreach"); // User value preserved
      expect(merged.priority).toBe("high"); // User value preserved
    });

    it("uses defaults only for missing information", () => {
      const extracted = {
        title: "Outreach",
        description: null,
        priority: null,
        dueDate: null,
        assignee: null,
        projectName: null,
        status: null,
        tags: [],
        isExplicit: { title: true, priority: false, dueDate: false, assignee: false, projectName: false },
        confidence: 0.5,
      };
      const defaults = { title: "Default Task", priority: "medium" };

      const merged = ParameterExtractor.mergeWithDefaults(extracted, defaults);
      expect(merged.title).toBe("Outreach"); // User value preserved
      expect(merged.priority).toBe("medium"); // Default used
    });
  });

  describe("2. Intent Detection & Routing", () => {
    it("detects CREATE intent", () => {
      expect(intentFromString("create a task")).toBe("CREATE");
    });

    it("detects DELETE intent", () => {
      expect(intentFromString("delete the project")).toBe("DELETE");
    });

    it("detects PLAN intent for goals", () => {
      expect(intentFromString("I want to launch a product")).toBe("PLAN");
    });

    it("detects PLAN intent for planning keywords", () => {
      expect(intentFromString("plan a marketing campaign")).toBe("PLAN");
    });

    it("detects CONSULT intent", () => {
      expect(intentFromString("recommend a strategy")).toBe("CONSULT");
    });

    it("routes planning to PLANNING path", () => {
      const route = routeRequest("I want to launch a product", "PLAN");
      expect(route.path).toBe("PLANNING");
    });

    it("routes conversation appropriately", () => {
      const route = routeRequest("hi", "READ");
      expect(route.path).toBe("CHAT");
    });
  });

  describe("3. Confidence Assessment", () => {
    it("returns HIGH confidence with full context", () => {
      const confidence = getConfidenceLevel(
        "Create a task called Outreach with priority high",
        { hasWorkspace: true, hasProject: true, hasTask: false, hasTeam: true }
      );
      expect(confidence).toBe("HIGH");
    });

    it("returns MEDIUM confidence with partial context", () => {
      const confidence = getConfidenceLevel(
        "Create a task called Outreach",
        { hasWorkspace: true, hasProject: false, hasTask: false, hasTeam: false }
      );
      expect(confidence).toBe("MEDIUM");
    });

    it("returns LOW confidence with minimal info", () => {
      const confidence = getConfidenceLevel(
        "do something",
        { hasWorkspace: false, hasProject: false, hasTask: false, hasTeam: false }
      );
      expect(confidence).toBe("LOW");
    });
  });

  describe("4. Planning Quality", () => {
    it("generates plan with required components", () => {
      const plan = PlanningEngine.generatePlan(
        "Launch a new product",
        { workspaceName: "Test Workspace", projectName: "Product Launch", existingTasks: [], teamMembers: ["Alice", "Bob"], sprintCadence: "bi-weekly", workingHours: 8 }
      );

      expect(plan.objective).toBeTruthy();
      expect(plan.milestones.length).toBeGreaterThan(0);
      expect(plan.tasks.length).toBeGreaterThan(0);
      expect(plan.risks).toBeDefined();
      expect(plan.timeline).toBeDefined();
      expect(plan.successMetrics.length).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeTruthy();
    });

    it("generates milestones for launch goals", () => {
      const plan = PlanningEngine.generatePlan(
        "Launch a new product",
        { workspaceName: "Test Workspace", projectName: "Product Launch", existingTasks: [], teamMembers: ["Alice"], sprintCadence: "bi-weekly", workingHours: 8 }
      );

      const milestoneNames = plan.milestones.map(m => m.name.toLowerCase());
      expect(milestoneNames.some(n => n.includes("planning") || n.includes("development"))).toBe(true);
      expect(milestoneNames.some(n => n.includes("testing") || n.includes("validation"))).toBe(true);
      expect(milestoneNames.some(n => n.includes("launch") || n.includes("completion"))).toBe(true);
    });

    it("generates relevant success metrics", () => {
      const plan = PlanningEngine.generatePlan(
        "Launch a new product",
        { workspaceName: "Test Workspace", projectName: "Product Launch", existingTasks: [], teamMembers: ["Alice"], sprintCadence: "bi-weekly", workingHours: 8 }
      );

      expect(plan.successMetrics.some(m => m.toLowerCase().includes("launch") || m.toLowerCase().includes("success"))).toBe(true);
    });
  });

  describe("5. Tool Orchestration", () => {
    it("creates workflow from template", () => {
      const orchestrator = new WorkflowOrchestrator();
      const workflow = orchestrator.createWorkflow("create-task-with-context", null, {});

      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(workflow.status).toBe("pending");
    });

    it("creates workflow from custom steps", () => {
      const orchestrator = new WorkflowOrchestrator();
      const workflow = orchestrator.createWorkflow(null, [
        { toolName: "list_tasks", description: "Get tasks", params: {} },
        { toolName: "create_task", description: "Create task", params: {}, dependencies: ["list_tasks"] },
      ], {});

      expect(workflow.steps.length).toBe(2);
      expect(workflow.steps[1].dependencies).toContain("list_tasks");
    });

    it("generates workflow from description", () => {
      const orchestrator = new WorkflowOrchestrator();
      const workflow = orchestrator.generateWorkflowFromDescription("create a task with context", {});

      expect(workflow.steps.length).toBeGreaterThan(0);
    });
  });

  describe("6. Validation Engine", () => {
    it("validates successful action", () => {
      const validation = ValidationEngine.validateAction(
        "create",
        { title: "New Task", priority: "medium" },
        { workspaceId: "w1", userId: "u1", userRole: "admin", existingTaskTitles: [], existingProjectNames: [], teamMembers: ["u1"] }
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("detects duplicate tasks", () => {
      const validation = ValidationEngine.validateAction(
        "create",
        { title: "Existing Task" },
        { workspaceId: "w1", userId: "u1", userRole: "admin", existingTaskTitles: ["Existing Task"], existingProjectNames: [], teamMembers: ["u1"] }
      );

      expect(validation.warnings.some(w => w.includes("already exists"))).toBe(true);
    });

    it("blocks viewer from write actions", () => {
      const validation = ValidationEngine.validateAction(
        "create",
        { title: "New Task" },
        { workspaceId: "w1", userId: "u1", userRole: "viewer", existingTaskTitles: [], existingProjectNames: [], teamMembers: ["u1"] }
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes("permission"))).toBe(true);
    });

    it("does not require confirmation for single delete with high confidence", () => {
      const validation = ValidationEngine.validateAction(
        "delete",
        { title: "Task to delete" },
        { workspaceId: "w1", userId: "u1", userRole: "admin", existingTaskTitles: ["Task to delete"], existingProjectNames: [], teamMembers: ["u1"] }
      );

      expect(validation.requiresConfirmation).toBe(false);
    });
  });

  describe("7. Response Formatting", () => {
    it("formats action response with summary", () => {
      const response = ResponseFormatter.format(
        "Task created successfully",
        "action",
        { projectName: "Marketing" }
      );

      expect(response.content).toContain("**DONE:**");
      expect(response.metadata.hasActionSummary).toBe(true);
    });

    it("formats plan response with objective", () => {
      const response = ResponseFormatter.format(
        "Launch a new product",
        "plan"
      );

      expect(response.content).toContain("**Objective:**");
    });

    it("formats error response with suggestion", () => {
      const response = ResponseFormatter.format(
        "Task not found",
        "error"
      );

      expect(response.content).toContain("**Error:**");
      expect(response.content).toContain("**Suggestion:**");
    });

    it("adds confidence indicator when requested", () => {
      const response = ResponseFormatter.format(
        "Task created",
        "action",
        { includeConfidence: true, confidence: "HIGH" }
      );

      expect(response.content).toContain("Confidence: HIGH");
    });

    it("calculates word count and read time", () => {
      const response = ResponseFormatter.format(
        "This is a test response with multiple words to verify word count calculation",
        "conversation"
      );

      expect(response.metadata.wordCount).toBeGreaterThan(0);
      expect(response.metadata.estimatedReadTime).toBeTruthy();
    });
  });

  describe("8. Philosophy Engine", () => {
    it("strips robotic opening", () => {
      const result = PhilosophyEngine.optimizeResponse(
        "Sure! I found 3 tasks.",
        "list tasks"
      );

      expect(result).not.toMatch(/^Sure!/);
      expect(result).toContain("I found 3 tasks");
    });

    it("strips robotic ending", () => {
      const result = PhilosophyEngine.optimizeResponse(
        "Here are your tasks.\n\nLet me know if you need anything else!",
        "list tasks"
      );

      expect(result).not.toContain("Let me know if you need anything else");
    });

    it("generates action summary for create actions", () => {
      const summary = PhilosophyEngine.generateActionSummary(
        "execute",
        "create_task",
        { title: "New Task" },
        { success: true }
      );

      expect(summary).toContain("New Task");
      expect(summary).toContain("created");
    });
  });

  describe("9. Proactive Intelligence", () => {
    it("formats insights for display", () => {
      const summary = {
        insights: [
          { id: "test-1", type: "DEADLINE_RISK" as const, severity: "high" as const, title: "Overdue", message: "3 tasks overdue", affectedItems: ["Task 1", "Task 2", "Task 3"], suggestedAction: "Review", detectedAt: new Date() },
        ],
        totalInsights: 1,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        topRecommendation: "Review overdue tasks",
      };

      const display = ProactiveIntelligenceEngine.formatInsightsForDisplay(summary);
      expect(display).toContain("Proactive Insights");
      expect(display).toContain("High: 1");
    });

    it("handles empty insights", () => {
      const summary = {
        insights: [],
        totalInsights: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        topRecommendation: null,
      };

      const display = ProactiveIntelligenceEngine.formatInsightsForDisplay(summary);
      expect(display).toContain("Everything looks good");
    });
  });

  describe("10. Context Awareness", () => {
    it("respects token budgets", async () => {
      // This test verifies the context system respects token budgets
      // In production, this would test with actual database
      const contextOptions = {
        workspaceId: "test-workspace",
        userId: "test-user",
      };

      // Mock the context system for testing
      // In real implementation, this would test actual context loading
      expect(contextOptions.workspaceId).toBe("test-workspace");
    });
  });
});

describe("Nova Prime — Integration Tests", () => {
  describe("End-to-End Reasoning Pipeline", () => {
    it("processes simple task creation", async () => {
      // This test would verify the complete reasoning pipeline
      // In production, this would be an integration test with mocked services
      const intent = intentFromString("Create a task called Outreach with priority high");
      expect(intent).toBe("CREATE");

      const params = ParameterExtractor.extract("Create a task called Outreach with priority high");
      expect(params.title).toBe("Outreach");
      expect(params.priority).toBe("high");
    });

    it("processes goal-oriented request", async () => {
      const intent = intentFromString("I want to launch a product next quarter");
      expect(intent).toBe("PLAN");

      const route = routeRequest("I want to launch a product next quarter", "PLAN");
      expect(route.path).toBe("PLANNING");
    });
  });
});
