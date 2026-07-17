import { prisma } from "../prisma";
import { PROJECT_STRUCTURE_STANDARDS, PROJECT_CREATION_FLOW, PROJECT_INTELLIGENCE_CAPABILITIES, PROJECT_MONITORING_AREAS } from "./constitution/project-standards";
import { STATUS_DONE, STATUS_IN_PROGRESS, STATUS_BLOCKED } from "../constants/status";

export { PROJECT_STRUCTURE_STANDARDS, PROJECT_CREATION_FLOW, PROJECT_INTELLIGENCE_CAPABILITIES, PROJECT_MONITORING_AREAS } from "./constitution/project-standards";

export interface ProjectHealthReport {
  healthScore: number;
  status: "CRITICAL" | "AT_RISK" | "HEALTHY";
  metrics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    stalledTasks: number;
    blockedTasks: number;
    completionRate: string;
    overdueRate: string;
    taskCompletionRate: string;
  };
  risks: ProjectRisk[];
  forecast?: ProjectForecast;
  recommendation: string;
}

export interface ProjectRisk {
  type: "SCHEDULE" | "CAPACITY" | "RESOURCE" | "DEPENDENCY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  affectedItems: string[];
}

export interface ProjectForecast {
  estimatedCompletionDate: string;
  deliveryConfidence: "HIGH" | "MEDIUM" | "LOW";
  projectedOverdueTasks: number;
}

export class ProjectIntelligence {
  public static async analyzeHealth(workspaceId: string, projectId: string): Promise<ProjectHealthReport> {
    // TENANT ISOLATION: Verify project belongs to workspace
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) {
      return {
        healthScore: 0,
        status: "CRITICAL",
        metrics: { totalTasks: 0, completedTasks: 0, overdueTasks: 0, stalledTasks: 0, blockedTasks: 0, completionRate: "0%", overdueRate: "0%", taskCompletionRate: "0%" },
        risks: [{ type: "SCHEDULE", severity: "CRITICAL", description: "Project not found in this workspace", affectedItems: [] }],
        recommendation: "Project not found in this workspace.",
      };
    }

    const tasks = await prisma.task.findMany({
      where: { projectId, workspaceId },
      include: { predecessors: true },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === STATUS_DONE).length;

    const now = new Date();
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== STATUS_DONE).length;

    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const stalledTasks = tasks.filter(t => t.status === STATUS_IN_PROGRESS && new Date(t.updatedAt) < fourDaysAgo).length;

    const blockedTasks = tasks.filter(t =>
      t.status === STATUS_BLOCKED || t.predecessors?.some((d: { type: string }) => d.type === "FS")
    ).length;

    const rate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
    const completionRate = `${Math.round(rate)}%`;
    const overdueRate = totalTasks > 0 ? `${Math.round((overdueTasks / totalTasks) * 100)}%` : "0%";
    const taskCompletionRate = totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "100%";

    let healthScore = Math.round(100 - (overdueTasks * 12) - (stalledTasks * 6) - (blockedTasks * 8));
    if (healthScore < 0) healthScore = 0;

    const risks: ProjectRisk[] = [];
    if (overdueTasks > 0) {
      risks.push({ type: "SCHEDULE", severity: overdueTasks > 3 ? "CRITICAL" : "HIGH", description: `${overdueTasks} tasks past due date`, affectedItems: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== STATUS_DONE).map(t => t.title) });
    }
    if (stalledTasks > 0) {
      risks.push({ type: "CAPACITY", severity: stalledTasks > 2 ? "HIGH" : "MEDIUM", description: `${stalledTasks} tasks stalled without updates`, affectedItems: tasks.filter(t => t.status === STATUS_IN_PROGRESS && new Date(t.updatedAt) < fourDaysAgo).map(t => t.title) });
    }
    if (blockedTasks > 2) {
      risks.push({ type: "DEPENDENCY", severity: "HIGH", description: `${blockedTasks} tasks blocked by dependencies`, affectedItems: [] });
    }

    let status: "CRITICAL" | "AT_RISK" | "HEALTHY" = "HEALTHY";
    let recommendation = "Project milestones are on schedule. Maintain current sprint pace.";

    if (healthScore < 45) {
      status = "CRITICAL";
      recommendation = `CRITICAL ACTION: Project has ${overdueTasks} overdue tasks and ${stalledTasks} stalled operations. Immediate resource reallocation is required.`;
    } else if (healthScore < 80) {
      status = "AT_RISK";
      recommendation = `WARNING: Project is at risk. ${overdueTasks} overdue tasks, ${stalledTasks} stalled. Consider re-estimating overdue assignments.`;
    }

    let forecast: ProjectForecast | undefined;
    if (totalTasks > 0 && completedTasks > 0) {
      const completionRateVal = completedTasks / totalTasks;
      const daysSinceStart = tasks.length > 0
        ? Math.max(1, Math.floor((now.getTime() - Math.min(...tasks.map(t => new Date(t.createdAt).getTime()))) / (1000 * 60 * 60 * 24)))
        : 1;
      const dailyCompletionRate = completedTasks / daysSinceStart;
      const remainingTasks = totalTasks - completedTasks;
      const estimatedDaysRemaining = dailyCompletionRate > 0 ? Math.ceil(remainingTasks / dailyCompletionRate) : 30;

      const estimatedDate = new Date(now.getTime() + estimatedDaysRemaining * 24 * 60 * 60 * 1000);
      forecast = {
        estimatedCompletionDate: estimatedDate.toISOString().split("T")[0],
        deliveryConfidence: healthScore > 80 ? "HIGH" : healthScore > 50 ? "MEDIUM" : "LOW",
        projectedOverdueTasks: Math.ceil(overdueTasks + (stalledTasks * 0.5)),
      };
    }

    return {
      healthScore,
      status,
      metrics: { totalTasks, completedTasks, overdueTasks, stalledTasks, blockedTasks, completionRate, overdueRate, taskCompletionRate },
      risks,
      forecast,
      recommendation,
    };
  }
}
