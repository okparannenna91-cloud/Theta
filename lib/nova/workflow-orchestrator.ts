import { logger } from "@/lib/logger";

export type ToolStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface ToolStep {
  id: string;
  toolName: string;
  description: string;
  params: Record<string, unknown>;
  status: ToolStatus;
  result: unknown | null;
  error: string | null;
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: ToolStep[];
  status: "pending" | "running" | "completed" | "failed";
  createdAt: Date;
  completedAt: Date | null;
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  steps: Array<{
    toolName: string;
    description: string;
    params: Record<string, unknown>;
    dependencies?: string[];
  }>;
}

const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  "create-task-with-context": {
    name: "Create Task with Context",
    description: "Create a task with full context and dependencies",
    steps: [
      { toolName: "list_projects", description: "Find available projects", params: {} },
      { toolName: "create_task", description: "Create the task", params: {}, dependencies: ["list_projects"] },
      { toolName: "create_dependency", description: "Set up dependencies", params: {}, dependencies: ["create_task"] },
    ],
  },
  "project-setup": {
    name: "Project Setup",
    description: "Set up a complete project with tasks and milestones",
    steps: [
      { toolName: "create_project", description: "Create the project", params: {} },
      { toolName: "create_task", description: "Create initial tasks", params: {}, dependencies: ["create_project"] },
      { toolName: "create_dependency", description: "Set up task dependencies", params: {}, dependencies: ["create_task"] },
    ],
  },
  "sprint-planning": {
    name: "Sprint Planning",
    description: "Plan a sprint with tasks and assignments",
    steps: [
      { toolName: "list_tasks", description: "Get backlog tasks", params: {} },
      { toolName: "project_health_analysis", description: "Analyze capacity", params: {}, dependencies: ["list_tasks"] },
      { toolName: "create_task", description: "Create sprint tasks", params: {}, dependencies: ["project_health_analysis"] },
    ],
  },
  "report-generation": {
    name: "Report Generation",
    description: "Generate a comprehensive report",
    steps: [
      { toolName: "list_tasks", description: "Gather task data", params: {} },
      { toolName: "project_health_analysis", description: "Analyze project health", params: {}, dependencies: ["list_tasks"] },
      { toolName: "generate_standup", description: "Generate summary", params: {}, dependencies: ["project_health_analysis"] },
    ],
  },
};

export class WorkflowOrchestrator {
  private workflows: Map<string, Workflow> = new Map();

  /**
   * Create a new workflow from template or custom steps
   */
  public createWorkflow(
    templateName: string | null,
    customSteps: Array<{
      toolName: string;
      description: string;
      params: Record<string, unknown>;
      dependencies?: string[];
    }> | null,
    context: Record<string, unknown>
  ): Workflow {
    let steps: ToolStep[];

    if (templateName && WORKFLOW_TEMPLATES[templateName]) {
      const template = WORKFLOW_TEMPLATES[templateName];
      steps = template.steps.map((step, index) => ({
        id: `step-${index}`,
        toolName: step.toolName,
        description: step.description,
        params: { ...step.params, ...context },
        status: "pending" as ToolStatus,
        result: null,
        error: null,
        dependencies: step.dependencies || [],
        retryCount: 0,
        maxRetries: 3,
      }));
    } else if (customSteps) {
      steps = customSteps.map((step, index) => ({
        id: `step-${index}`,
        toolName: step.toolName,
        description: step.description,
        params: { ...step.params, ...context },
        status: "pending" as ToolStatus,
        result: null,
        error: null,
        dependencies: step.dependencies || [],
        retryCount: 0,
        maxRetries: 3,
      }));
    } else {
      throw new Error("Either templateName or customSteps must be provided");
    }

    const workflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: templateName || "Custom Workflow",
      description: `Workflow with ${steps.length} steps`,
      steps,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
    };

    this.workflows.set(workflow.id, workflow);

    logger.info("[NovaPrime-Orchestrator] Created workflow", {
      workflowId: workflow.id,
      stepCount: steps.length,
      templateName,
    });

    return workflow;
  }

  /**
   * Execute a workflow step by step
   */
  public async executeWorkflow(
    workflowId: string,
    executor: (toolName: string, params: Record<string, unknown>) => Promise<unknown>
  ): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = "running";

    try {
      for (const step of workflow.steps) {
        // Check if dependencies are met
        const dependenciesMet = step.dependencies.every(depId => {
          const depStep = workflow.steps.find(s => s.id === depId);
          return depStep?.status === "completed";
        });

        if (!dependenciesMet) {
          step.status = "skipped";
          step.error = "Dependencies not met";
          continue;
        }

        // Execute step
        step.status = "running";

        try {
          const result = await executor(step.toolName, step.params);
          step.result = result;
          step.status = "completed";

          logger.info("[NovaPrime-Orchestrator] Step completed", {
            workflowId,
            stepId: step.id,
            toolName: step.toolName,
          });
        } catch (error) {
          step.error = error instanceof Error ? error.message : "Unknown error";
          step.retryCount++;

          if (step.retryCount < step.maxRetries) {
            // Retry
            step.status = "pending";
            logger.warn("[NovaPrime-Orchestrator] Step failed, retrying", {
              workflowId,
              stepId: step.id,
              retryCount: step.retryCount,
            });
          } else {
            step.status = "failed";
            logger.error("[NovaPrime-Orchestrator] Step failed permanently", {
              workflowId,
              stepId: step.id,
              error: step.error,
            });
          }
        }
      }

      // Check if workflow completed successfully
      const allCompleted = workflow.steps.every(s => s.status === "completed" || s.status === "skipped");
      const anyFailed = workflow.steps.some(s => s.status === "failed");

      workflow.status = anyFailed ? "failed" : allCompleted ? "completed" : "failed";
      workflow.completedAt = new Date();

    } catch (error) {
      workflow.status = "failed";
      logger.error("[NovaPrime-Orchestrator] Workflow failed", {
        workflowId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return workflow;
  }

  /**
   * Get workflow status
   */
  public getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get available templates
   */
  public getTemplates(): WorkflowTemplate[] {
    return Object.values(WORKFLOW_TEMPLATES);
  }

  /**
   * Generate workflow from natural language description
   */
  public generateWorkflowFromDescription(
    description: string,
    context: Record<string, unknown>
  ): Workflow {
    const lower = description.toLowerCase();

    // Determine workflow type based on description
    if (lower.includes("create") && lower.includes("task")) {
      return this.createWorkflow("create-task-with-context", null, context);
    } else if (lower.includes("project") && (lower.includes("setup") || lower.includes("create"))) {
      return this.createWorkflow("project-setup", null, context);
    } else if (lower.includes("sprint") && lower.includes("plan")) {
      return this.createWorkflow("sprint-planning", null, context);
    } else if (lower.includes("report") || lower.includes("summary")) {
      return this.createWorkflow("report-generation", null, context);
    } else {
      // Default to custom workflow
      return this.createWorkflow(null, [
        { toolName: "list_tasks", description: "Gather context", params: {} },
        { toolName: "create_task", description: "Execute action", params: {}, dependencies: ["list_tasks"] },
      ], context);
    }
  }
}
