import { prisma } from "../prisma";
import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";

export interface TeamVelocity {
  memberId: string;
  memberName: string;
  tasksCompleted: number;
  avgCompletionDays: number;
  velocityScore: number; // tasks per week
}

export interface ProjectRiskAssessment {
  projectId: string;
  projectName: string;
  overallRiskScore: number; // 0-100, higher = more risk
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  velocityRisk: number;
  capacityRisk: number;
  scheduleRisk: number;
  dependencyRisk: number;
  risks: Array<{
    type: string;
    severity: string;
    description: string;
    affectedItems: string[];
  }>;
  forecast: {
    estimatedCompletionDate: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    daysRemaining: number;
  } | null;
  llmAssessment: string | null;
  calculatedAt: Date;
}

const STATUS_DONE = ["done", "completed"];
const STATUS_IN_PROGRESS = ["in-progress", "in_progress"];
const STATUS_BLOCKED = ["blocked"];

export class RiskPredictionEngine {
  /**
   * Calculate team velocity: tasks completed per member over last 30 days
   */
  static async calculateTeamVelocity(
    workspaceId: string,
    projectId?: string,
  ): Promise<TeamVelocity[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const where: {
      workspaceId: string;
      status: { in: string[] };
      updatedAt: { gte: Date };
      projectId?: string;
    } = {
      workspaceId,
      status: { in: STATUS_DONE },
      updatedAt: { gte: thirtyDaysAgo },
    };
    if (projectId) where.projectId = projectId;

    const completedTasks = await prisma.task.findMany({
      where,
      select: {
        assigneeIds: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    // Group by member
    const memberStats = new Map<string, { count: number; totalDays: number }>();

    for (const task of completedTasks) {
      for (const memberId of task.assigneeIds) {
        const existing = memberStats.get(memberId) || { count: 0, totalDays: 0 };
        const completionDays = Math.max(1, Math.ceil(
          (new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        ));
        existing.count++;
        existing.totalDays += completionDays;
        memberStats.set(memberId, existing);
      }
    }

    // Get member names
    const memberIds = Array.from(memberStats.keys());
    const members = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true },
    });
    const memberNameMap = new Map(members.map(m => [m.id, m.name || "Unknown"]));

    // Calculate velocity scores
    const velocities: TeamVelocity[] = [];
    for (const [memberId, stats] of memberStats) {
      const avgDays = stats.count > 0 ? stats.totalDays / stats.count : 0;
      const velocityPerWeek = avgDays > 0 ? (stats.count / 30) * 7 : 0;

      velocities.push({
        memberId,
        memberName: memberNameMap.get(memberId) || "Unknown",
        tasksCompleted: stats.count,
        avgCompletionDays: Math.round(avgDays * 10) / 10,
        velocityScore: Math.round(velocityPerWeek * 10) / 10,
      });
    }

    return velocities.sort((a, b) => b.velocityScore - a.velocityScore);
  }

  /**
   * Assess risk for a specific project
   */
  static async assessProjectRisk(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectRiskAssessment> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true, name: true },
    });

    if (!project) {
      return this.emptyAssessment(projectId, "Project not found");
    }

    // Get all tasks for this project
    const tasks = await prisma.task.findMany({
      where: { projectId, workspaceId },
      include: { predecessors: true },
    });

    const now = new Date();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => STATUS_DONE.includes(t.status)).length;
    const activeTasks = tasks.filter(t => STATUS_IN_PROGRESS.includes(t.status));
    const overdueTasks = tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now && !STATUS_DONE.includes(t.status)
    );
    const blockedTasks = tasks.filter(t =>
      STATUS_BLOCKED.includes(t.status) || t.predecessors?.some((p: { type: string }) => p.type === "FS")
    );

    // Calculate velocity
    const velocity = await this.calculateTeamVelocity(workspaceId, projectId);
    const totalVelocity = velocity.reduce((sum, v) => sum + v.velocityScore, 0);

    // Calculate risk scores
    const velocityRisk = this.calculateVelocityRisk(activeTasks.length, totalVelocity);
    const capacityRisk = this.calculateCapacityRisk(activeTasks.length, velocity);
    const scheduleRisk = this.calculateScheduleRisk(overdueTasks.length, totalTasks);
    const dependencyRisk = this.calculateDependencyRisk(blockedTasks.length, totalTasks);

    const overallRiskScore = Math.round(
      (velocityRisk * 0.3 + capacityRisk * 0.25 + scheduleRisk * 0.3 + dependencyRisk * 0.15)
    );

    const riskLevel = overallRiskScore >= 75 ? "CRITICAL"
      : overallRiskScore >= 50 ? "HIGH"
      : overallRiskScore >= 25 ? "MEDIUM"
      : "LOW";

    // Build risks list
    const risks: ProjectRiskAssessment["risks"] = [];

    if (overdueTasks.length > 0) {
      risks.push({
        type: "SCHEDULE",
        severity: overdueTasks.length > 3 ? "CRITICAL" : "HIGH",
        description: `${overdueTasks.length} tasks past due date`,
        affectedItems: overdueTasks.map(t => t.title),
      });
    }

    if (blockedTasks.length > 0) {
      risks.push({
        type: "DEPENDENCY",
        severity: blockedTasks.length > 2 ? "HIGH" : "MEDIUM",
        description: `${blockedTasks.length} tasks blocked by dependencies`,
        affectedItems: blockedTasks.map(t => t.title),
      });
    }

    if (activeTasks.length > totalVelocity * 2) {
      risks.push({
        type: "CAPACITY",
        severity: "HIGH",
        description: `Active task count (${activeTasks.length}) exceeds team velocity capacity (${totalVelocity.toFixed(1)}/week)`,
        affectedItems: [],
      });
    }

    // Calculate forecast
    let forecast: ProjectRiskAssessment["forecast"] = null;
    if (completedTasks > 0 && totalVelocity > 0) {
      const remainingTasks = totalTasks - completedTasks;
      const daysRemaining = Math.ceil((remainingTasks / totalVelocity) * 7);
      const estimatedDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);

      forecast = {
        estimatedCompletionDate: estimatedDate.toISOString().split("T")[0],
        confidence: overallRiskScore < 25 ? "HIGH" : overallRiskScore < 50 ? "MEDIUM" : "LOW",
        daysRemaining,
      };
    }

    return {
      projectId,
      projectName: project.name,
      overallRiskScore,
      riskLevel,
      velocityRisk,
      capacityRisk,
      scheduleRisk,
      dependencyRisk,
      risks,
      forecast,
      llmAssessment: null,
      calculatedAt: now,
    };
  }

  /**
   * Generate LLM-based risk assessment for deeper insights
   */
  static async generateLLMRiskAssessment(
    assessment: ProjectRiskAssessment,
    velocity: TeamVelocity[],
  ): Promise<string> {
    const velocitySummary = velocity.length > 0
      ? velocity.map(v => `${v.memberName}: ${v.velocityScore}/week, ${v.avgCompletionDays} avg days`).join("\n")
      : "No velocity data available";

    const prompt = `You are a project risk analyst. Analyze this project's risk profile and provide actionable insights.

Project: ${assessment.projectName}
Overall Risk Score: ${assessment.overallRiskScore}/100 (${assessment.riskLevel})

Risk Breakdown:
- Velocity Risk: ${assessment.velocityRisk}/100
- Capacity Risk: ${assessment.capacityRisk}/100
- Schedule Risk: ${assessment.scheduleRisk}/100
- Dependency Risk: ${assessment.dependencyRisk}/100

Team Velocity (last 30 days):
${velocitySummary}

Active Risks:
${assessment.risks.map(r => `- [${r.severity}] ${r.type}: ${r.description}`).join("\n") || "None"}

Forecast: ${assessment.forecast ? `${assessment.forecast.estimatedCompletionDate} (${assessment.forecast.confidence} confidence)` : "N/A"}

Provide:
1. Top 3 specific actions to reduce risk
2. Risk趋势分析 (are things getting better or worse?)
3. One-paragraph executive summary

Be direct and specific. No filler.`;

    try {
      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "You are a concise project risk analyst. Be direct, no fluff.",
        prompt,
      );
      return response;
    } catch (error) {
      logger.warn("[RiskPrediction] LLM assessment failed:", error);
      return this.generateFallbackAssessment(assessment);
    }
  }

  /**
   * Assess risk for all projects in a workspace
   */
  static async assessWorkspaceRisks(
    workspaceId: string,
  ): Promise<ProjectRiskAssessment[]> {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true },
    });

    const assessments: ProjectRiskAssessment[] = [];

    for (const project of projects) {
      const assessment = await this.assessProjectRisk(workspaceId, project.id);

      // Generate LLM assessment for high-risk projects
      if (assessment.overallRiskScore >= 50) {
        const velocity = await this.calculateTeamVelocity(workspaceId, project.id);
        assessment.llmAssessment = await this.generateLLMRiskAssessment(assessment, velocity);
      }

      assessments.push(assessment);
    }

    return assessments.sort((a, b) => b.overallRiskScore - a.overallRiskScore);
  }

  private static calculateVelocityRisk(activeTasks: number, teamVelocity: number): number {
    if (teamVelocity === 0) return activeTasks > 0 ? 80 : 20;
    const ratio = activeTasks / (teamVelocity * 2); // 2 weeks of work
    return Math.min(100, Math.round(ratio * 50));
  }

  private static calculateCapacityRisk(activeTasks: number, velocity: TeamVelocity[]): number {
    if (velocity.length === 0) return activeTasks > 0 ? 70 : 10;
    const avgVelocity = velocity.reduce((sum, v) => sum + v.velocityScore, 0) / velocity.length;
    if (avgVelocity === 0) return 60;
    const imbalance = Math.max(...velocity.map(v => v.velocityScore)) / avgVelocity;
    return Math.min(100, Math.round(imbalance * 30));
  }

  private static calculateScheduleRisk(overdueTasks: number, totalTasks: number): number {
    if (totalTasks === 0) return 0;
    const overdueRate = overdueTasks / totalTasks;
    return Math.min(100, Math.round(overdueRate * 200));
  }

  private static calculateDependencyRisk(blockedTasks: number, totalTasks: number): number {
    if (totalTasks === 0) return 0;
    const blockedRate = blockedTasks / totalTasks;
    return Math.min(100, Math.round(blockedRate * 150));
  }

  private static generateFallbackAssessment(assessment: ProjectRiskAssessment): string {
    const lines: string[] = [];
    lines.push(`**Risk Assessment: ${assessment.projectName}**`);
    lines.push(`Overall Risk: ${assessment.overallRiskScore}/100 (${assessment.riskLevel})`);
    lines.push("");

    if (assessment.risks.length > 0) {
      lines.push("**Active Risks:**");
      assessment.risks.forEach(r => lines.push(`- ${r.description}`));
    }

    if (assessment.forecast) {
      lines.push("");
      lines.push(`**Forecast:** ${assessment.forecast.estimatedCompletionDate} (${assessment.forecast.confidence} confidence)`);
    }

    return lines.join("\n");
  }

  private static emptyAssessment(projectId: string, reason: string): ProjectRiskAssessment {
    return {
      projectId,
      projectName: reason,
      overallRiskScore: 0,
      riskLevel: "LOW",
      velocityRisk: 0,
      capacityRisk: 0,
      scheduleRisk: 0,
      dependencyRisk: 0,
      risks: [],
      forecast: null,
      llmAssessment: null,
      calculatedAt: new Date(),
    };
  }
}
