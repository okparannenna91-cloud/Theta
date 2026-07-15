import { logger } from "@/lib/logger";

export interface Plan {
  id: string;
  objective: string;
  description: string;
  milestones: Milestone[];
  tasks: PlanTask[];
  dependencies: Dependency[];
  risks: Risk[];
  timeline: Timeline;
  successMetrics: string[];
  estimatedDuration: string;
  createdAt: Date;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  targetDate: string | null;
  tasks: string[];
  status: "pending" | "in-progress" | "completed";
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  assignee: string | null;
  estimatedHours: number | null;
  dependencies: string[];
  milestoneId: string | null;
  status: "todo" | "in-progress" | "done";
}

export interface Dependency {
  taskId: string;
  dependsOn: string;
  type: "finish-to-start" | "start-to-start" | "finish-to-finish";
}

export interface Risk {
  id: string;
  description: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigation: string;
}

export interface Timeline {
  startDate: string;
  endDate: string;
  phases: Phase[];
}

export interface Phase {
  name: string;
  startDate: string;
  endDate: string;
  tasks: string[];
}

export interface PlanningContext {
  workspaceName: string;
  projectName: string | null;
  existingTasks: string[];
  teamMembers: string[];
  sprintCadence: string | null;
  workingHours: number | null;
}

export class PlanningEngine {
  /**
   * Generate comprehensive plan from user goal
   */
  public static generatePlan(
    goal: string,
    context: PlanningContext
  ): Plan {
    const startTime = performance.now();

    // Generate plan components
    const objective = this.refineObjective(goal);
    const milestones = this.generateMilestones(goal, context);
    const tasks = this.generateTasks(goal, milestones, context);
    const dependencies = this.identifyDependencies(tasks);
    const risks = this.identifyRisks(goal, tasks, context);
    const timeline = this.generateTimeline(milestones, tasks, context);
    const successMetrics = this.generateSuccessMetrics(goal);
    const estimatedDuration = this.estimateDuration(timeline);

    const plan: Plan = {
      id: `plan-${Date.now()}`,
      objective,
      description: goal,
      milestones,
      tasks,
      dependencies,
      risks,
      timeline,
      successMetrics,
      estimatedDuration,
      createdAt: new Date(),
    };

    const elapsed = performance.now() - startTime;
    logger.info("[NovaPrime-Planning] Generated plan", {
      planId: plan.id,
      milestoneCount: milestones.length,
      taskCount: tasks.length,
      riskCount: risks.length,
      estimatedDuration,
      generationLatencyMs: Math.round(elapsed),
    });

    return plan;
  }

  /**
   * Refine user goal into clear objective
   */
  private static refineObjective(goal: string): string {
    // Clean up the goal and make it actionable
    let objective = goal.trim();

    // Remove common prefixes
    objective = objective.replace(/^(?:i want to|we need to|let's|can you|please|help me)\s+/i, "");

    // Capitalize first letter
    objective = objective.charAt(0).toUpperCase() + objective.slice(1);

    // Ensure it ends with period
    if (!objective.endsWith(".") && !objective.endsWith("!")) {
      objective += ".";
    }

    return objective;
  }

  /**
   * Generate milestones from goal
   */
  private static generateMilestones(goal: string, context: PlanningContext): Milestone[] {
    const milestones: Milestone[] = [];
    const lower = goal.toLowerCase();

    // Default milestones based on goal type
    if (lower.includes("launch") || lower.includes("release")) {
      milestones.push(
        { id: "m1", name: "Planning & Design", description: "Complete planning and design phase", targetDate: null, tasks: [], status: "pending" },
        { id: "m2", name: "Development", description: "Complete development work", targetDate: null, tasks: [], status: "pending" },
        { id: "m3", name: "Testing & QA", description: "Complete testing and quality assurance", targetDate: null, tasks: [], status: "pending" },
        { id: "m4", name: "Launch", description: "Successful launch", targetDate: null, tasks: [], status: "pending" }
      );
    } else if (lower.includes("campaign") || lower.includes("marketing")) {
      milestones.push(
        { id: "m1", name: "Strategy & Planning", description: "Define strategy and plan", targetDate: null, tasks: [], status: "pending" },
        { id: "m2", name: "Content Creation", description: "Create all required content", targetDate: null, tasks: [], status: "pending" },
        { id: "m3", name: "Execution", description: "Execute the campaign", targetDate: null, tasks: [], status: "pending" },
        { id: "m4", name: "Measurement", description: "Measure results and optimize", targetDate: null, tasks: [], status: "pending" }
      );
    } else if (lower.includes("improve") || lower.includes("optimize")) {
      milestones.push(
        { id: "m1", name: "Assessment", description: "Assess current state", targetDate: null, tasks: [], status: "pending" },
        { id: "m2", name: "Implementation", description: "Implement improvements", targetDate: null, tasks: [], status: "pending" },
        { id: "m3", name: "Validation", description: "Validate improvements", targetDate: null, tasks: [], status: "pending" }
      );
    } else {
      // Generic milestones
      milestones.push(
        { id: "m1", name: "Planning", description: "Complete planning phase", targetDate: null, tasks: [], status: "pending" },
        { id: "m2", name: "Execution", description: "Execute the plan", targetDate: null, tasks: [], status: "pending" },
        { id: "m3", name: "Completion", description: "Complete and validate", targetDate: null, tasks: [], status: "pending" }
      );
    }

    return milestones;
  }

  /**
   * Generate tasks from goal and milestones
   */
  private static generateTasks(goal: string, milestones: Milestone[], context: PlanningContext): PlanTask[] {
    const tasks: PlanTask[] = [];
    const lower = goal.toLowerCase();

    // Generate tasks for each milestone
    milestones.forEach((milestone, index) => {
      const milestoneTasks = this.generateTasksForMilestone(milestone, lower, context);
      milestoneTasks.forEach(task => {
        task.milestoneId = milestone.id;
        tasks.push(task);
      });
      milestone.tasks = milestoneTasks.map(t => t.id);
    });

    return tasks;
  }

  /**
   * Generate tasks for a specific milestone
   */
  private static generateTasksForMilestone(
    milestone: Milestone,
    goalLower: string,
    context: PlanningContext
  ): PlanTask[] {
    const tasks: PlanTask[] = [];
    const milestoneName = milestone.name.toLowerCase();

    // Generate tasks based on milestone type
    if (milestoneName.includes("planning") || milestoneName.includes("strategy")) {
      tasks.push(
        this.createTask("Define objectives and scope", "high", milestone.id),
        this.createTask("Gather requirements", "high", milestone.id),
        this.createTask("Create project plan", "medium", milestone.id),
        this.createTask("Identify resources needed", "medium", milestone.id)
      );
    } else if (milestoneName.includes("development") || milestoneName.includes("execution")) {
      tasks.push(
        this.createTask("Set up environment", "high", milestone.id),
        this.createTask("Implement core functionality", "high", milestone.id),
        this.createTask("Integrate components", "medium", milestone.id),
        this.createTask("Document implementation", "low", milestone.id)
      );
    } else if (milestoneName.includes("testing") || milestoneName.includes("validation")) {
      tasks.push(
        this.createTask("Write test cases", "high", milestone.id),
        this.createTask("Execute tests", "high", milestone.id),
        this.createTask("Fix issues found", "high", milestone.id),
        this.createTask("Final validation", "medium", milestone.id)
      );
    } else if (milestoneName.includes("launch") || milestoneName.includes("completion")) {
      tasks.push(
        this.createTask("Final review", "high", milestone.id),
        this.createTask("Deploy/release", "high", milestone.id),
        this.createTask("Monitor post-launch", "medium", milestone.id),
        this.createTask("Document outcomes", "low", milestone.id)
      );
    } else {
      // Generic tasks
      tasks.push(
        this.createTask(`Complete ${milestone.name}`, "high", milestone.id),
        this.createTask(`Validate ${milestone.name}`, "medium", milestone.id)
      );
    }

    return tasks;
  }

  /**
   * Create a task with defaults
   */
  private static createTask(
    title: string,
    priority: "high" | "medium" | "low",
    milestoneId: string
  ): PlanTask {
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: "",
      priority,
      assignee: null,
      estimatedHours: null,
      dependencies: [],
      milestoneId,
      status: "todo",
    };
  }

  /**
   * Identify dependencies between tasks
   */
  private static identifyDependencies(tasks: PlanTask[]): Dependency[] {
    const dependencies: Dependency[] = [];

    // Simple dependency detection based on task titles
    tasks.forEach(task => {
      const lower = task.title.toLowerCase();
      if (lower.includes("test") || lower.includes("validate")) {
        // Testing tasks depend on implementation tasks
        const implTasks = tasks.filter(t =>
          t.title.toLowerCase().includes("implement") ||
          t.title.toLowerCase().includes("create") ||
          t.title.toLowerCase().includes("build")
        );
        if (implTasks.length > 0) {
          dependencies.push({
            taskId: task.id,
            dependsOn: implTasks[0].id,
            type: "finish-to-start",
          });
        }
      }
    });

    return dependencies;
  }

  /**
   * Identify risks
   */
  private static identifyRisks(goal: string, tasks: PlanTask[], context: PlanningContext): Risk[] {
    const risks: Risk[] = [];

    // Check for common risks
    if (tasks.length > 10) {
      risks.push({
        id: "risk-1",
        description: "Large number of tasks may indicate scope creep",
        probability: "medium",
        impact: "medium",
        mitigation: "Review scope regularly and prioritize critical tasks",
      });
    }

    if (context.teamMembers.length === 0) {
      risks.push({
        id: "risk-2",
        description: "No team members assigned",
        probability: "high",
        impact: "high",
        mitigation: "Assign team members before starting execution",
      });
    }

    // Goal-specific risks
    const lower = goal.toLowerCase();
    if (lower.includes("launch") || lower.includes("release")) {
      risks.push({
        id: "risk-3",
        description: "Launch dates are hard to move",
        probability: "medium",
        impact: "high",
        mitigation: "Build buffer time into the schedule",
      });
    }

    return risks;
  }

  /**
   * Generate timeline
   */
  private static generateTimeline(
    milestones: Milestone[],
    tasks: PlanTask[],
    context: PlanningContext
  ): Timeline {
    const startDate = new Date();
    const endDate = new Date();

    // Estimate duration based on task count
    const totalTasks = tasks.length;
    const estimatedDays = Math.max(7, totalTasks * 2); // At least 7 days, 2 days per task
    endDate.setDate(startDate.getDate() + estimatedDays);

    // Generate phases
    const phases: Phase[] = milestones.map((milestone, index) => {
      const phaseStart = new Date(startDate);
      phaseStart.setDate(startDate.getDate() + (index * Math.floor(estimatedDays / milestones.length)));

      const phaseEnd = new Date(phaseStart);
      phaseEnd.setDate(phaseStart.getDate() + Math.floor(estimatedDays / milestones.length));

      return {
        name: milestone.name,
        startDate: phaseStart.toISOString().split("T")[0],
        endDate: phaseEnd.toISOString().split("T")[0],
        tasks: milestone.tasks,
      };
    });

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      phases,
    };
  }

  /**
   * Generate success metrics
   */
  private static generateSuccessMetrics(goal: string): string[] {
    const metrics: string[] = [];
    const lower = goal.toLowerCase();

    // Goal-specific metrics
    if (lower.includes("launch") || lower.includes("release")) {
      metrics.push(
        "Successful launch with no critical issues",
        "All planned features implemented",
        "Performance benchmarks met"
      );
    } else if (lower.includes("campaign") || lower.includes("marketing")) {
      metrics.push(
        "Campaign objectives met",
        "Target audience reached",
        "ROI positive"
      );
    } else if (lower.includes("improve") || lower.includes("optimize")) {
      metrics.push(
        "Measurable improvement in target metric",
        "No regression in other areas",
        "Sustainable changes implemented"
      );
    } else {
      // Generic metrics
      metrics.push(
        "Goal achieved successfully",
        "Completed within timeline",
        "Quality standards met"
      );
    }

    return metrics;
  }

  /**
   * Estimate duration
   */
  private static estimateDuration(timeline: Timeline): string {
    const start = new Date(timeline.startDate);
    const end = new Date(timeline.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 7) return `${days} days`;
    if (days <= 30) return `${Math.ceil(days / 7)} weeks`;
    return `${Math.ceil(days / 30)} months`;
  }
}
