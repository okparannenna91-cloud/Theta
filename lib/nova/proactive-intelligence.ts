import { prisma } from "../prisma";
import { logger } from "@/lib/logger";
import { executeWithProvider } from "@/lib/langraph/model-router";

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

export interface ProactiveConfig {
  stallThresholdDays: number;
  upcomingDeadlineDays: number;
  overdueCriticalCount: number;
  unassignedHighCount: number;
  blockedCriticalCount: number;
  duplicateSimilarityThreshold: number;
  capacityImbalanceMultiplier: number;
}

const DEFAULT_CONFIG: ProactiveConfig = {
  stallThresholdDays: 3,
  upcomingDeadlineDays: 2,
  overdueCriticalCount: 3,
  unassignedHighCount: 5,
  blockedCriticalCount: 2,
  duplicateSimilarityThreshold: 0.7,
  capacityImbalanceMultiplier: 3,
};

function tokenize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export class ProactiveIntelligenceEngine {
  private static config: ProactiveConfig = { ...DEFAULT_CONFIG };

  public static configure(overrides: Partial<ProactiveConfig>): void {
    this.config = { ...DEFAULT_CONFIG, ...overrides };
  }

  public static async analyzeWorkspace(workspaceId: string): Promise<InsightSummary> {
    const insights: ProactiveInsight[] = [];

    try {
      const [
        deadlineInsights,
        unassignedInsights,
        blockedInsights,
        stalledInsights,
        dependencyInsights,
        milestoneInsights,
        duplicateInsights,
        capacityInsights,
      ] = await Promise.all([
        this.detectDeadlineRisks(workspaceId),
        this.detectUnassignedWork(workspaceId),
        this.detectBlockedTasks(workspaceId),
        this.detectStalledProgress(workspaceId),
        this.detectMissingDependencies(workspaceId),
        this.detectUpcomingMilestones(workspaceId),
        this.detectDuplicateWork(workspaceId),
        this.detectCapacityImbalance(workspaceId),
      ]);

      insights.push(
        ...deadlineInsights,
        ...unassignedInsights,
        ...blockedInsights,
        ...stalledInsights,
        ...dependencyInsights,
        ...milestoneInsights,
        ...duplicateInsights,
        ...capacityInsights,
      );

      insights.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      const criticalCount = insights.filter((i) => i.severity === "critical").length;
      const highCount = insights.filter((i) => i.severity === "high").length;
      const mediumCount = insights.filter((i) => i.severity === "medium").length;
      const lowCount = insights.filter((i) => i.severity === "low").length;

      const topRecommendation = this.determineTopRecommendation(insights);

      logger.info("[ProactiveIntelligence] Analyzed workspace", {
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
        severity: overdueTasks.length > this.config.overdueCriticalCount ? "critical" : "high",
        title: "Overdue Tasks Detected",
        message: `${overdueTasks.length} tasks are past their due date`,
        affectedItems: overdueTasks.map((t) => t.title),
        suggestedAction: "Review overdue tasks and either update due dates or reprioritize",
        detectedAt: new Date(),
      });
    }

    const upcomingDeadline = new Date();
    upcomingDeadline.setDate(upcomingDeadline.getDate() + this.config.upcomingDeadlineDays);

    const upcomingTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        dueDate: { gte: new Date(), lte: upcomingDeadline },
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
        message: `${upcomingTasks.length} tasks due in the next ${this.config.upcomingDeadlineDays} days`,
        affectedItems: upcomingTasks.map((t) => t.title),
        suggestedAction: "Consider rescheduling some tasks if workload is too high",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

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
        severity: unassignedTasks.length > this.config.unassignedHighCount ? "high" : "medium",
        title: "Unassigned Tasks",
        message: `${unassignedTasks.length} tasks don't have assignees`,
        affectedItems: unassignedTasks.map((t) => t.title),
        suggestedAction: "Assign tasks to team members to ensure accountability",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

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
        severity: blockedTasks.length > this.config.blockedCriticalCount ? "critical" : "high",
        title: "Blocked Tasks",
        message: `${blockedTasks.length} tasks are currently blocked`,
        affectedItems: blockedTasks.map((t) => t.title),
        suggestedAction: "Investigate blockers and resolve dependencies",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  private static async detectStalledProgress(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    const thresholdDate = new Date(
      Date.now() - this.config.stallThresholdDays * 24 * 60 * 60 * 1000,
    );

    const stalledTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        status: "in-progress",
        updatedAt: { lt: thresholdDate },
      },
      select: { title: true, updatedAt: true, assigneeIds: true },
    });

    const stalledWithAssignees = stalledTasks.filter((t) => t.assigneeIds.length > 0);
    const stalledWithoutAssignees = stalledTasks.filter((t) => t.assigneeIds.length === 0);

    if (stalledWithAssignees.length > 0) {
      insights.push({
        id: `stalled-assigned-${Date.now()}`,
        type: "STALLED_PROGRESS",
        severity: stalledWithAssignees.length > 2 ? "high" : "medium",
        title: "Stalled Assigned Tasks",
        message: `${stalledWithAssignees.length} assigned tasks haven't been updated in ${this.config.stallThresholdDays}+ days`,
        affectedItems: stalledWithAssignees.map((t) => t.title),
        suggestedAction: "Check in with assignees to unblock progress",
        detectedAt: new Date(),
      });
    }

    if (stalledWithoutAssignees.length > 0) {
      insights.push({
        id: `stalled-unassigned-${Date.now()}`,
        type: "STALLED_PROGRESS",
        severity: "high",
        title: "Stalled Unassigned Tasks",
        message: `${stalledWithoutAssignees.length} in-progress tasks have no assignee and haven't been updated in ${this.config.stallThresholdDays}+ days`,
        affectedItems: stalledWithoutAssignees.map((t) => t.title),
        suggestedAction: "Assign these tasks or move them back to todo",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  private static async detectMissingDependencies(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        status: { notIn: ["done", "completed", "cancelled"] },
      },
      include: { subtasks: true },
    });

    const tasksNeedingBreakdown = tasks.filter(
      (t) =>
        t.subtasks.length === 0 &&
        !t.estimatedHours &&
        t.status !== "done" &&
        (t.title.toLowerCase().includes("setup") ||
          t.title.toLowerCase().includes("implement") ||
          t.title.toLowerCase().includes("build") ||
          t.title.toLowerCase().includes("migrate") ||
          t.title.toLowerCase().includes("refactor")),
    );

    if (tasksNeedingBreakdown.length > 0) {
      insights.push({
        id: `missing-deps-${Date.now()}`,
        type: "MISSING_DEPENDENCIES",
        severity: "medium",
        title: "Tasks Needing Breakdown",
        message: `${tasksNeedingBreakdown.length} tasks look complex but have no subtasks or time estimates`,
        affectedItems: tasksNeedingBreakdown.map((t) => t.title),
        suggestedAction: "Break these into subtasks with time estimates for better tracking",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

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
        affectedItems: upcomingTasks.map((t) => t.title),
        suggestedAction: "Review progress on these tasks to ensure on-time delivery",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  private static async detectDuplicateWork(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    const activeTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        status: { notIn: ["done", "completed", "cancelled"] },
      },
      select: { id: true, title: true, projectId: true },
    });

    const tokenizedTasks = activeTasks.map((t) => ({
      ...t,
      tokens: tokenize(t.title),
    }));

    const duplicates: Array<{ a: string; b: string; similarity: number }> = [];

    for (let i = 0; i < tokenizedTasks.length; i++) {
      for (let j = i + 1; j < tokenizedTasks.length; j++) {
        const a = tokenizedTasks[i];
        const b = tokenizedTasks[j];

        if (a.projectId !== b.projectId) continue;

        const similarity = jaccardSimilarity(a.tokens, b.tokens);
        if (similarity >= this.config.duplicateSimilarityThreshold) {
          duplicates.push({ a: a.title, b: b.title, similarity });
        }
      }
    }

    if (duplicates.length > 0) {
      const affectedItems = duplicates.flatMap((d) => [d.a, d.b]);
      insights.push({
        id: `duplicate-${Date.now()}`,
        type: "DUPLICATE_WORK",
        severity: "medium",
        title: "Potential Duplicate Tasks",
        message: `${duplicates.length} pairs of tasks have very similar titles`,
        affectedItems: [...new Set(affectedItems)],
        suggestedAction: "Review these tasks — one may be a duplicate that should be merged or closed",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  private static async detectCapacityImbalance(workspaceId: string): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];

    const activeTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        status: { notIn: ["done", "completed", "cancelled"] },
      },
      select: { userId: true, assigneeIds: true },
    });

    if (activeTasks.length === 0) return insights;

    const memberTaskCount = new Map<string, number>();

    for (const task of activeTasks) {
      const current = memberTaskCount.get(task.userId) || 0;
      memberTaskCount.set(task.userId, current + 1);

      for (const assigneeId of task.assigneeIds) {
        const currentAssignee = memberTaskCount.get(assigneeId) || 0;
        memberTaskCount.set(assigneeId, currentAssignee + 1);
      }
    }

    const counts = Array.from(memberTaskCount.values());
    if (counts.length < 2) return insights;

    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const overloaded: string[] = [];

    for (const [memberId, count] of memberTaskCount) {
      if (count > avg * this.config.capacityImbalanceMultiplier) {
        overloaded.push(`${memberId} (${count} tasks, avg: ${avg.toFixed(1)})`);
      }
    }

    if (overloaded.length > 0) {
      insights.push({
        id: `capacity-${Date.now()}`,
        type: "CAPACITY_IMBALANCE",
        severity: "high",
        title: "Capacity Imbalance Detected",
        message: `${overloaded.length} member(s) have ${this.config.capacityImbalanceMultiplier}x+ more tasks than average`,
        affectedItems: overloaded,
        suggestedAction: "Redistribute tasks to balance workload across the team",
        detectedAt: new Date(),
      });
    }

    return insights;
  }

  private static determineTopRecommendation(insights: ProactiveInsight[]): string | null {
    if (insights.length === 0) return null;

    const criticalInsights = insights.filter((i) => i.severity === "critical");
    if (criticalInsights.length > 0) {
      return criticalInsights[0].suggestedAction;
    }

    const highInsights = insights.filter((i) => i.severity === "high");
    if (highInsights.length > 0) {
      return highInsights[0].suggestedAction;
    }

    return insights[0].suggestedAction;
  }

  public static async analyzeWithLLM(
    workspaceId: string,
    summary: InsightSummary,
  ): Promise<string> {
    if (summary.totalInsights === 0) {
      return "Everything looks good! No proactive insights to report.";
    }

    const prompt = `You are a project management AI assistant. Analyze these workspace insights and provide a prioritized summary with actionable recommendations.

Workspace ID: ${workspaceId}
Total Insights: ${summary.totalInsights}
Critical: ${summary.criticalCount} | High: ${summary.highCount} | Medium: ${summary.mediumCount} | Low: ${summary.lowCount}

Insights:
${summary.insights
  .map(
    (i, idx) => `
${idx + 1}. [${i.severity.toUpperCase()}] ${i.title}
   ${i.message}
   Affected: ${i.affectedItems.join(", ")}
   Suggested: ${i.suggestedAction}`,
  )
  .join("\n")}

Provide:
1. Top 3 priorities (most urgent actions)
2. Risk assessment (what could go wrong if ignored)
3. One-paragraph executive summary

Be direct and specific. No filler.`;

    try {
      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "You are a concise project management analyst. Be direct, no fluff.",
        prompt,
      );

      return response;
    } catch (error) {
      logger.warn("[ProactiveIntelligence] LLM analysis failed, using fallback:", error);
      return this.formatInsightsForDisplay(summary);
    }
  }

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
