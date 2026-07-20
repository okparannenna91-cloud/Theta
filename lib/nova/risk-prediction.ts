import { prisma } from "@/lib/prisma";
import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";

const STATUS_DONE = ["done", "completed"];
const STATUS_IN_PROGRESS = ["in-progress", "in_progress"];
const STATUS_BLOCKED = ["blocked"];

export interface VelocityEntry {
  memberId: string;
  name: string;
  velocity: number;
  trend: "improving" | "stable" | "declining";
}

export interface RiskFactor {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  factors: string[];
  assessment: string;
  recommendations: string[];
}

export interface WorkspaceRiskOverview {
  projectId: string;
  projectName: string;
  risk: RiskFactor;
}

export class RiskPredictionEngine {
  static async calculateTeamVelocity(
    workspaceId: string,
    projectId?: string,
    days: number = 30,
  ): Promise<VelocityEntry[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const halfCutoff = new Date(Date.now() - (days / 2) * 24 * 60 * 60 * 1000);

    const where: {
      workspaceId: string;
      status: { in: string[] };
      updatedAt: { gte: Date };
      projectId?: string;
    } = {
      workspaceId,
      status: { in: STATUS_DONE },
      updatedAt: { gte: cutoff },
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

    const allMemberStats = new Map<string, { count: number; totalDays: number }>();
    const recentMemberStats = new Map<string, { count: number; totalDays: number }>();

    for (const task of completedTasks) {
      const completionDays = Math.max(
        1,
        Math.ceil(
          (new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );

      const isRecent = new Date(task.updatedAt) >= halfCutoff;

      for (const memberId of task.assigneeIds) {
        const existing = allMemberStats.get(memberId) || { count: 0, totalDays: 0 };
        existing.count++;
        existing.totalDays += completionDays;
        allMemberStats.set(memberId, existing);

        if (isRecent) {
          const recent = recentMemberStats.get(memberId) || { count: 0, totalDays: 0 };
          recent.count++;
          recent.totalDays += completionDays;
          recentMemberStats.set(memberId, recent);
        }
      }
    }

    const memberIds = Array.from(allMemberStats.keys());
    if (memberIds.length === 0) return [];

    const members = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(members.map((m) => [m.id, m.name || "Unknown"]));

    const entries: VelocityEntry[] = [];
    for (const [memberId, stats] of allMemberStats) {
      const velocity = Math.round((stats.count / days) * 10) / 10;

      const recentStats = recentMemberStats.get(memberId);
      const recentVelocity = recentStats
        ? Math.round((recentStats.count / (days / 2)) * 10) / 10
        : velocity;

      let trend: VelocityEntry["trend"] = "stable";
      if (recentVelocity > velocity * 1.2) trend = "improving";
      else if (recentVelocity < velocity * 0.8) trend = "declining";

      entries.push({
        memberId,
        name: nameMap.get(memberId) || "Unknown",
        velocity,
        trend,
      });
    }

    return entries.sort((a, b) => b.velocity - a.velocity);
  }

  static async predictProjectRisk(
    workspaceId: string,
    projectId: string,
  ): Promise<RiskFactor> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true, name: true },
    });

    if (!project) {
      return { score: 0, level: "low", factors: [], assessment: "Project not found.", recommendations: [] };
    }

    const tasks = await prisma.task.findMany({
      where: { projectId, workspaceId },
      include: { predecessors: true },
    });

    const now = new Date();
    const totalTasks = tasks.length;
    if (totalTasks === 0) {
      return { score: 0, level: "low", factors: [], assessment: "No tasks in this project.", recommendations: ["Add tasks to the project to enable risk analysis."] };
    }

    const completedTasks = tasks.filter((t) => STATUS_DONE.includes(t.status));
    const openTasks = tasks.filter((t) => !STATUS_DONE.includes(t.status));
    const overdueTasks = openTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now
    );
    const blockedTasks = tasks.filter(
      (t) =>
        STATUS_BLOCKED.includes(t.status) ||
        t.predecessors?.some((p: { type: string }) => p.type === "FS")
    );

    const totalEstimatedHours = openTasks.reduce(
      (sum, t) => sum + (t.estimatedHours || 0),
      0
    );

    const velocity = await this.calculateTeamVelocity(workspaceId, projectId);
    const teamVelocity = velocity.reduce((sum, v) => sum + v.velocity, 0);

    let daysRemaining: number | null = null;
    const projectTasksWithDue = tasks.filter((t) => t.dueDate);
    if (projectTasksWithDue.length > 0) {
      const latestDue = projectTasksWithDue.reduce((max, t) => {
        const d = new Date(t.dueDate!);
        return d > max ? d : max;
      }, new Date(0));
      daysRemaining = Math.max(0, Math.ceil((latestDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const factors: string[] = [];
    let score = 0;

    // Workload vs velocity gap
    if (teamVelocity > 0) {
      const daysOfWork = totalEstimatedHours > 0
        ? totalEstimatedHours / (teamVelocity * 8)
        : openTasks.length / teamVelocity;
      if (daysRemaining !== null && daysOfWork > daysRemaining) {
        const gap = Math.round(((daysOfWork - daysRemaining) / daysRemaining) * 100);
        score += Math.min(40, gap);
        factors.push(`Workload exceeds capacity by ${gap}% (estimated ${Math.round(daysOfWork)} days vs ${daysRemaining} days remaining)`);
      }
    } else if (openTasks.length > 0) {
      score += 30;
      factors.push("No team velocity data — cannot complete work forecast");
    }

    // Overdue tasks percentage
    if (openTasks.length > 0) {
      const overduePercent = Math.round((overdueTasks.length / openTasks.length) * 100);
      if (overduePercent > 0) {
        score += Math.min(30, overduePercent);
        factors.push(`${overdueTasks.length} of ${openTasks.length} open tasks are overdue (${overduePercent}%)`);
      }
    }

    // Blocked tasks
    if (blockedTasks.length > 0) {
      const blockedPercent = Math.round((blockedTasks.length / totalTasks) * 100);
      score += Math.min(20, blockedPercent * 2);
      factors.push(`${blockedTasks.length} task(s) blocked by dependencies`);
    }

    // Dependency chain depth
    const dependencyChainDepth = this.calculateDependencyDepth(tasks);
    if (dependencyChainDepth > 3) {
      score += Math.min(10, (dependencyChainDepth - 3) * 2);
      factors.push(`Dependency chain depth of ${dependencyChainDepth} levels increases risk`);
    }

    score = Math.min(100, Math.round(score));

    const level: RiskFactor["level"] =
      score >= 75 ? "critical"
      : score >= 50 ? "high"
      : score >= 25 ? "medium"
      : "low";

    let assessment = "";
    let recommendations: string[] = [];

    try {
      const velocitySummary = velocity.length > 0
        ? velocity.map((v) => `${v.name}: ${v.velocity}/day (${v.trend})`).join(", ")
        : "No velocity data";

      const prompt = `You are a project risk analyst. Analyze this project and provide a concise risk assessment.

Project: ${project.name}
Risk Score: ${score}/100 (${level})
Open tasks: ${openTasks.length} | Completed: ${completedTasks.length} | Overdue: ${overdueTasks.length} | Blocked: ${blockedTasks.length}
Total estimated hours: ${totalEstimatedHours}h
Days remaining: ${daysRemaining ?? "unknown"}
Team velocity: ${teamVelocity} tasks/day
Team: ${velocitySummary}

Risk factors:
${factors.map((f) => `- ${f}`).join("\n") || "None detected"}

Provide:
1. A 2-3 sentence risk assessment paragraph
2. 3-5 specific, actionable recommendations to reduce risk

Be direct and specific. No filler.`;

      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "You are a concise project risk analyst. Return JSON with keys: assessment (string), recommendations (string[]).",
        prompt
      );

      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        assessment = parsed.assessment || response;
        recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
      } catch {
        assessment = response;
      }
    } catch (error) {
      logger.warn("[RiskPrediction] LLM assessment failed, using fallback:", error);
      assessment = this.generateFallbackAssessment(project.name, score, level, factors);
      recommendations = this.generateFallbackRecommendations(level, overdueTasks.length, blockedTasks.length);
    }

    if (recommendations.length === 0) {
      recommendations = this.generateFallbackRecommendations(level, overdueTasks.length, blockedTasks.length);
    }

    return { score, level, factors, assessment, recommendations };
  }

  static async getWorkspaceRiskOverview(workspaceId: string): Promise<WorkspaceRiskOverview[]> {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });

    const results: WorkspaceRiskOverview[] = [];

    for (const project of projects) {
      try {
        const risk = await this.predictProjectRisk(workspaceId, project.id);
        results.push({
          projectId: project.id,
          projectName: project.name,
          risk,
        });
      } catch (error) {
        logger.warn(`[RiskPrediction] Failed for project ${project.id}:`, error);
        results.push({
          projectId: project.id,
          projectName: project.name,
          risk: { score: 0, level: "low", factors: [], assessment: "Analysis failed.", recommendations: [] },
        });
      }
    }

    return results.sort((a, b) => b.risk.score - a.risk.score);
  }

  private static calculateDependencyDepth(
    tasks: Array<{ predecessors?: Array<{ predecessorId: string }> }>
  ): number {
    const taskIds = new Set(tasks.map((t) => {
      const anyT = t as { id?: string };
      return anyT.id || "";
    }));
    const dependencyMap = new Map<string, string[]>();

    for (const task of tasks) {
      const anyT = task as { id?: string; predecessors?: Array<{ predecessorId: string }> };
      if (anyT.id && anyT.predecessors) {
        dependencyMap.set(
          anyT.id,
          anyT.predecessors.map((p) => p.predecessorId)
        );
      }
    }

    let maxDepth = 0;

    const visited = new Set<string>();
    const dfs = (taskId: string, depth: number): void => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      maxDepth = Math.max(maxDepth, depth);

      const deps = dependencyMap.get(taskId) || [];
      for (const depId of deps) {
        if (taskIds.has(depId)) {
          dfs(depId, depth + 1);
        }
      }
      visited.delete(taskId);
    };

    for (const taskId of taskIds) {
      if (taskId) dfs(taskId, 0);
    }

    return maxDepth;
  }

  private static generateFallbackAssessment(
    name: string,
    score: number,
    level: string,
    factors: string[],
  ): string {
    const lines = [
      `Project "${name}" has a risk score of ${score}/100 (${level}).`,
      "",
    ];
    if (factors.length > 0) {
      lines.push("Key factors:");
      factors.forEach((f) => lines.push(`- ${f}`));
    } else {
      lines.push("No significant risk factors detected.");
    }
    return lines.join("\n");
  }

  private static generateFallbackRecommendations(
    level: string,
    overdueCount: number,
    blockedCount: number,
  ): string[] {
    const recs: string[] = [];

    if (overdueCount > 0) {
      recs.push(`Address ${overdueCount} overdue task(s) by updating deadlines or reprioritizing`);
    }
    if (blockedCount > 0) {
      recs.push(`Resolve ${blockedCount} blocked task(s) to unblock the dependency chain`);
    }
    if (level === "critical" || level === "high") {
      recs.push("Consider reducing scope or adding team members to meet deadlines");
      recs.push("Schedule a risk review meeting with the team this week");
    }
    if (recs.length === 0) {
      recs.push("Continue monitoring project health and maintain current pace");
    }

    return recs;
  }
}
