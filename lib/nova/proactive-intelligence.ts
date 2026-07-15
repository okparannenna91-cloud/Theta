import { prisma } from "../prisma";
import { logger } from "@/lib/logger";

export type InsightType =
  | "DEADLINE_RISK"
  | "UNASSIGNED_WORK"
  | "BLOCKED_TASKS"
  | "SPRINT_OVERLOAD"
  | "DUPLICATE_WORK"
  | "MISSING_DEPENDENCIES"
  | "STALLED_PROGRESS"
  | "CAPACITY_IMBALANCE"
  | "UPCOMING_MILESTONE"
  | "RECENT_ACHIEVEMENT";

export type InsightSeverity = "low" | "medium" | "high" | "critical";

export interface ProactiveInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  affectedItems: string[];
  suggestedAction: string;
  detectedAt: Date;
}

export interface InsightSummary {
  insights: ProactiveInsight[];
  totalInsights: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topRecommendation: string | null;
}

export class ProactiveIntelligenceEngine {
  /**
   * Analyze workspace and generate proactive insights
   */
  public static async analyzeWorkspace(workspaceId: string): Promise<InsightSummary> {
    const insights: ProactiveInsight[] = [];

    try {
      // Run all analysis in parallel
      const [
        deadlineInsights,
        unassignedInsights,
        blockedInsights,
        stalledInsights,
        dependencyInsights,
        milestoneInsights,
      ] = await Promise.all([
        this.detectDeadlineRisks(workspaceId),
        this.detectUnassignedWork(workspaceId),
        this.detectBlockedTasks(workspaceId),
        this.detectStalledProgress(workspaceId),
        this.detectMissingDependencies(workspaceId),
        this.detectUpcomingMilestones(workspaceId),
      ]);

      insights.push(
        ...deadlineInsights,
        ...unassignedInsights,
        ...blockedInsights,
        ...stalledInsights,
        ...dependencyInsights,
        ...milestoneInsights
      );

      // Sort by severity
      insights.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      // Calculate summary
      const criticalCount = insights.filter(i => i.severity === "critical").length;
      const highCount = insights.filter(i => i.severity === "high").length;
      const mediumCount = insights.filter(i => i.severity === "medium").length;
      const lowCount = insights.filter(i => i.severity === "low").length;

      // Determine top recommendation
      const topRecommendation = this.determineTopRecommendation(insights);

      logger.info("[NovaPrime-Proactive] Analyzed workspace", {
        workspaceId,
        totalInsights: insights.length,
        criticalCount,
        highCount,
      });

      return {
        insights,
        totalInsights: insights.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        topRecommendation,
      };
    } catch (error) {
      logger.warn("[ProactiveIntelligence] Failed to analyze workspace:", error);
      return {
        insights: [],
        totalInsights: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        topRecommendation: null,
      };
    }
  }

  /**
   * Detect tasks at risk of missing deadline
   */
  private static async detectDeadlineRisks(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    const overdueTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        dueDate: { lt: new Date() },
        status: { notIn: ["done", "completed", "cancelled"] },
      },
      select: { title: true, dueDate: true },
    });

    if (overdueTasks.length > 0) {
      insights.push({
        id: `deadline-risk-${Date.now()}`,
        type: "DEADLINE_RISK",
        severity: overdueTasks.length > 3 ? "critical" : "high",
        title: "Overdue Tasks Detected",
        message: `${overdueTasks.length} tasks are past their due date`,
        affectedItems: overdueTasks.map(t => t.title),
        suggestedAction: "Review overdue tasks and either update due dates or reprioritize",
        detectedAt: new Date(),
      });
    }

    // Check for tasks due in next 2 days
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const upcomingTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        dueDate: { gte: new Date(), lte: twoDaysFromNow },
        status: { notIn: ["done", "completed", "cancelled"] },
      },
      select: { title: true, dueDate: true },
    });

    if (upcomingTasks.length > 3) {
      insights.push({
        id: `deadline-pressure-${Date.now()}`,
        type: "DEADLINE_RISK",
        severity: "medium",
        title: "Deadline Pressure Ahead",
        message: `${upcomingTasks.length} tasks due in the next 2 days`,
        affectedItems: upcomingTasks.map(t => t.title),
        suggestedAction: "Consider rescheduling some tasks if workload is too high",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Detect unassigned work
   */
  private static async detectUnassignedWork(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    const unassignedTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        userId: undefined,
        status: { notIn: ["done", "completed", "cancelled"] },
      },
      select: { title: true, priority: true },
    });

    if (unassignedTasks.length > 0) {
      insights.push({
        id: `unassigned-${Date.now()}`,
        type: "UNASSIGNED_WORK",
        severity: unassignedTasks.length > 5 ? "high" : "medium",
        title: "Unassigned Tasks",
        message: `${unassignedTasks.length} tasks don't have assignees`,
        affectedItems: unassignedTasks.map(t => t.title),
        suggestedAction: "Assign tasks to team members to ensure accountability",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Detect blocked tasks
   */
  private static async detectBlockedTasks(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    const blockedTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        status: "blocked",
      },
      select: { title: true },
    });

    if (blockedTasks.length > 0) {
      insights.push({
        id: `blocked-${Date.now()}`,
        type: "BLOCKED_TASKS",
        severity: blockedTasks.length > 2 ? "critical" : "high",
        title: "Blocked Tasks",
        message: `${blockedTasks.length} tasks are currently blocked`,
        affectedItems: blockedTasks.map(t => t.title),
        suggestedAction: "Investigate blockers and resolve dependencies",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Detect stalled progress
   */
  private static async detectStalledProgress(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

    const stalledTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        status: "in-progress",
        updatedAt: { lt: fourDaysAgo },
      },
      select: { title: true, updatedAt: true },
    });

    if (stalledTasks.length > 0) {
      insights.push({
        id: `stalled-${Date.now()}`,
        type: "STALLED_PROGRESS",
        severity: stalledTasks.length > 2 ? "high" : "medium",
        title: "Stalled Progress",
        message: `${stalledTasks.length} tasks haven't been updated in 4+ days`,
        affectedItems: stalledTasks.map(t => t.title),
        suggestedAction: "Check in with assignees to unblock progress",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Detect missing dependencies
   */
  private static async detectMissingDependencies(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    // This is a simplified check - in production, you'd analyze task relationships
    const tasksWithSubtasks = await prisma.task.findMany({
      where: {
        workspaceId,
        status: { notIn: ["done", "completed", "cancelled"] },
      },
      include: { subtasks: true },
    });

    const tasksWithoutSubtasks = tasksWithSubtasks.filter(t =>
      t.subtasks.length === 0 && t.title.toLowerCase().includes("launch")
    );

    if (tasksWithoutSubtasks.length > 0) {
      insights.push({
        id: `missing-deps-${Date.now()}`,
        type: "MISSING_DEPENDENCIES",
        severity: "medium",
        title: "Potential Missing Dependencies",
        message: "Some complex tasks may need subtasks or dependencies",
        affectedItems: tasksWithoutSubtasks.map(t => t.title),
        suggestedAction: "Consider breaking down complex tasks into subtasks",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Detect upcoming milestones
   */
  private static async detectUpcomingMilestones(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const upcomingTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        dueDate: { gte: new Date(), lte: oneWeekFromNow },
        status: { notIn: ["done", "completed", "cancelled"] },
      },
      select: { title: true, dueDate: true },
    });

    if (upcomingTasks.length > 0) {
      insights.push({
        id: `upcoming-milestone-${Date.now()}`,
        type: "UPCOMING_MILESTONE",
        severity: "low",
        title: "Upcoming Deadlines",
        message: `${upcomingTasks.length} tasks due in the next week`,
        affectedItems: upcomingTasks.map(t => t.title),
        suggestedAction: "Review progress on these tasks to ensure on-time delivery",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Determine top recommendation based on insights
   */
  private static determineTopRecommendation(insights: ProactiveInsight[]): string | null {
    if (insights.length === 0) return null;

    const criticalInsights = insights.filter(i => i.severity === "critical");
    if (criticalInsights.length > 0) {
      return criticalInsights[0].suggestedAction;
    }

    const highInsights = insights.filter(i => i.severity === "high");
    if (highInsights.length > 0) {
      return highInsights[0].suggestedAction;
    }

    return insights[0].suggestedAction;
  }

  /**
   * Format insights for display
   */
  public static formatInsightsForDisplay(summary: InsightSummary): string {
    if (summary.totalInsights === 0) {
      return "Everything looks good! No proactive insights to report.";
    }

    const lines: string[] = [];
    lines.push(`**Proactive Insights** (${summary.totalInsights} detected)`);
    lines.push("");

    if (summary.criticalCount > 0) {
      lines.push(`🔴 Critical: ${summary.criticalCount}`);
    }
    if (summary.highCount > 0) {
      lines.push(`🟠 High: ${summary.highCount}`);
    }
    if (summary.mediumCount > 0) {
      lines.push(`🟡 Medium: ${summary.mediumCount}`);
    }
    if (summary.lowCount > 0) {
      lines.push(`🟢 Low: ${summary.lowCount}`);
    }

    if (summary.topRecommendation) {
      lines.push("");
      lines.push(`**Top Recommendation:** ${summary.topRecommendation}`);
    }

    return lines.join("\n");
  }
}
