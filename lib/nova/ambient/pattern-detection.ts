import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { MIN_OVERDUE_DUE_DATE } from "@/lib/overdue";
import type { ObservationContext, DetectedPattern } from "./types";

const STALL_THRESHOLD_DAYS = 3;
const INACTIVE_PROJECT_DAYS = 14;
const VELOCITY_DROP_THRESHOLD = 0.5;
const OVERDUE_CRITICAL_COUNT = 3;
const CAPACITY_IMBALANCE_MULTIPLIER = 2.5;
const SOLO_FOUNDER_OVERDUE_THRESHOLD = 3;

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

export class PatternDetector {
  static async detect(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    try {
      const results = await Promise.allSettled([
        this.detectDeadlineRisks(context),
        this.detectBlockedTasks(context),
        this.detectUnassignedWork(context),
        this.detectSprintRisks(context),
        this.detectStalledWork(context),
        this.detectWorkloadImbalance(context),
        this.detectDuplicateWork(context),
        this.detectProjectInactivity(context),
        this.detectDependencyCascades(context),
        this.detectForgottenWork(context),
        this.detectRecurringFailures(context),
        this.detectScopeCreep(context),
        this.detectVelocityDrop(context),
        this.detectMemberInactivity(context),
        this.detectSoloFounderRisks(context),
        this.detectCompletionTrends(context),
        this.detectWorkloadCollapse(context),
      ]);

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.length > 0) {
          patterns.push(...result.value);
        } else if (result.status === "rejected") {
          logger.warn("[PatternDetector] A detector failed:", result.reason?.message);
        }
      }
    } catch (error: any) {
      logger.warn("[PatternDetector] Detection error:", error.message);
    }

    return patterns.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
    });
  }

  private static async detectDeadlineRisks(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    const wsId = context.workspaceId;

    if (context.task && context.task.daysOverdue > 0) {
      const severity = context.task.daysOverdue > 7 ? "critical" : context.task.daysOverdue > 3 ? "high" : "medium";
      patterns.push({
        type: "DEADLINE_RISK",
        severity,
        title: "Task is overdue",
        message: `"${context.task.title}" is ${context.task.daysOverdue} day(s) overdue${context.task.blockingCount > 0 ? ` and blocking ${context.task.blockingCount} other task(s)` : ""}.`,
        confidence: 0.95,
        priority: context.task.blockingCount > 0 ? 9 : context.task.daysOverdue > 7 ? 8 : 6,
        urgency: Math.min(context.task.daysOverdue / 14, 1),
        affectedItems: [context.task.id],
        suggestedAction: context.task.blockingCount > 0
          ? `Resolve "${context.task.title}" — ${context.task.blockingCount} task(s) depend on it.`
          : `Review "${context.task.title}" and update the timeline or reassign.`,
        source: "detectDeadlineRisks",
      });
    }

    const overdueCount = await prisma.task.count({
      where: { workspaceId: wsId, dueDate: { gte: MIN_OVERDUE_DUE_DATE, lt: new Date() }, status: { notIn: ["done", "completed", "cancelled"] } },
    });

    if (overdueCount >= OVERDUE_CRITICAL_COUNT) {
      const uniqueAssignees = await prisma.task.groupBy({
        by: ["assigneeIds"],
        where: { workspaceId: wsId, dueDate: { gte: MIN_OVERDUE_DUE_DATE, lt: new Date() }, status: { notIn: ["done", "completed", "cancelled"] } },
        _count: true,
      });

      patterns.push({
        type: "DEADLINE_RISK",
        severity: "critical",
        title: "Multiple overdue tasks",
        message: `${overdueCount} tasks are overdue across the workspace, affecting ${uniqueAssignees.length} team member(s).`,
        confidence: 0.9,
        priority: 8,
        urgency: 0.8,
        affectedItems: [],
        suggestedAction: "Review overdue tasks and decide: reschedule, reassign, or descope.",
        source: "detectDeadlineRisks",
      });
    }

    const upcomingDeadlines = await prisma.task.findMany({
      where: {
        workspaceId: wsId,
        dueDate: { gte: new Date(), lte: new Date(Date.now() + 3 * 86400000) },
        status: { notIn: ["done", "completed", "cancelled"] },
      },
      select: { id: true, title: true, dueDate: true },
      take: 10,
    });

    if (upcomingDeadlines.length > 3) {
      patterns.push({
        type: "DEADLINE_RISK",
        severity: "medium",
        title: "Upcoming deadline cluster",
        message: `${upcomingDeadlines.length} tasks are due within the next 3 days.`,
        confidence: 0.8,
        priority: 5,
        urgency: 0.6,
        affectedItems: upcomingDeadlines.map((t) => t.id),
        suggestedAction: "Check if the team has capacity to meet these deadlines.",
        source: "detectDeadlineRisks",
      });
    }

    return patterns;
  }

  private static async detectBlockedTasks(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    if (context.task && context.task.isBlocked) {
      const blockers = await prisma.taskDependency.findMany({
        where: { taskId: context.task.id, predecessor: { status: { notIn: ["done", "completed"] } } },
        include: { predecessor: { select: { id: true, title: true, status: true, assigneeIds: true } } },
      });

      const blockCount = blockers.length;
      patterns.push({
        type: "BLOCKED_TASKS",
        severity: blockCount > 0 ? "high" : "medium",
        title: "Task is blocked",
        message: `"${context.task.title}" is blocked${blockCount > 0 ? ` by ${blockCount} unresolved dependent task(s)` : ""}.${context.task.blockingCount > 0 ? ` This task also blocks ${context.task.blockingCount} other(s).` : ""}`,
        confidence: 0.95,
        priority: blockCount > 0 ? 8 : 5,
        urgency: blockCount > 0 ? 0.8 : 0.4,
        affectedItems: [context.task.id, ...blockers.map((b) => b.predecessor.id)],
        suggestedAction: blockCount > 0
          ? `Resolve blockers: ${blockers.map((b) => `"${b.predecessor.title}"`).join(", ")}.`
          : "Unblock the task or flag it for discussion.",
        source: "detectBlockedTasks",
      });
    }

    const blockedCount = await prisma.task.count({
      where: { workspaceId: context.workspaceId, status: "blocked" },
    });

    if (blockedCount >= 3) {
      patterns.push({
        type: "BLOCKED_TASKS",
        severity: "high",
        title: "Multiple blocked tasks",
        message: `${blockedCount} tasks are blocked across the workspace.`,
        confidence: 0.85,
        priority: 7,
        urgency: 0.7,
        affectedItems: [],
        suggestedAction: "Review blocked tasks and identify common blockers. Resolve or reassign.",
        source: "detectBlockedTasks",
      });
    }

    const longBlocked = await prisma.task.count({
      where: {
        workspaceId: context.workspaceId,
        status: "blocked",
        updatedAt: { lt: new Date(Date.now() - 7 * 86400000) },
      },
    });

    if (longBlocked >= 2) {
      patterns.push({
        type: "BLOCKED_TASKS",
        severity: "critical",
        title: "Long-blocked tasks",
        message: `${longBlocked} task(s) have been blocked for over a week.`,
        confidence: 0.9,
        priority: 9,
        urgency: 0.9,
        affectedItems: [],
        suggestedAction: "Escalate long-blocked tasks. They may need stakeholder intervention.",
        source: "detectBlockedTasks",
      });
    }

    return patterns;
  }

  private static async detectUnassignedWork(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    if (context.task && context.task.assigneeIds.length === 0 && context.task.status !== "done" && context.task.status !== "completed") {
      const daysSinceCreation = context.task.daysSinceCreation;
      patterns.push({
        type: "UNASSIGNED_WORK",
        severity: daysSinceCreation > 7 ? "high" : "medium",
        title: "Unassigned task",
        message: `"${context.task.title}" has no assignee${daysSinceCreation > 0 ? ` (created ${daysSinceCreation} day(s) ago)` : ""}.`,
        confidence: 0.9,
        priority: daysSinceCreation > 7 ? 6 : 4,
        urgency: Math.min(daysSinceCreation / 14, 1),
        affectedItems: [context.task.id],
        suggestedAction: "Assign the task to a team member with available capacity.",
        source: "detectUnassignedWork",
      });
    }

    const unassignedCount = await prisma.task.count({
      where: {
        workspaceId: context.workspaceId,
        assigneeIds: { isEmpty: true },
        status: { notIn: ["done", "completed", "cancelled"] },
      },
    });

    if (unassignedCount > 5) {
      patterns.push({
        type: "UNASSIGNED_WORK",
        severity: "high",
        title: "Unassigned tasks piling up",
        message: `${unassignedCount} tasks have no assignee.`,
        confidence: 0.85,
        priority: 6,
        urgency: 0.5,
        affectedItems: [],
        suggestedAction: "Review and assign unowned tasks based on team workload.",
        source: "detectUnassignedWork",
      });
    }

    const oldUnassigned = await prisma.task.count({
      where: {
        workspaceId: context.workspaceId,
        assigneeIds: { isEmpty: true },
        status: { notIn: ["done", "completed", "cancelled"] },
        createdAt: { lt: new Date(Date.now() - 14 * 86400000) },
      },
    });

    if (oldUnassigned >= 3) {
      patterns.push({
        type: "FORGOTTEN_WORK",
        severity: "medium",
        title: "Forgotten unassigned tasks",
        message: `${oldUnassigned} unassigned task(s) have been sitting for over 2 weeks.`,
        confidence: 0.8,
        priority: 5,
        urgency: 0.4,
        affectedItems: [],
        suggestedAction: "Either assign these tasks or archive them to reduce noise.",
        source: "detectUnassignedWork",
      });
    }

    return patterns;
  }

  private static async detectSprintRisks(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    if (!context.sprint || context.sprint.remainingDays <= 0) return patterns;

    const { completedTasks, totalTasks, remainingDays, tasksAddedAfterStart, velocityPerDay } = context.sprint;

    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    const remainingTasks = totalTasks - completedTasks;
    const requiredRate = remainingDays > 0 ? remainingTasks / remainingDays : 99;

    if (requiredRate > velocityPerDay * 2 && remainingDays < 7) {
      patterns.push({
        type: "DEADLINE_RISK",
        severity: "critical",
        title: "Sprint at risk of failure",
        message: `Sprint "${context.sprint.name}" has ${remainingDays} day(s) left with ${remainingTasks} task(s) remaining. Current pace (${velocityPerDay}/day) is insufficient.`,
        confidence: 0.8,
        priority: 10,
        urgency: 1,
        affectedItems: [],
        suggestedAction: "Consider descoping low-priority tasks or reallocating team members.",
        source: "detectSprintRisks",
      });
    }

    if (tasksAddedAfterStart > 3) {
      patterns.push({
        type: "SCOPE_CREEP",
        severity: "medium",
        title: "Scope creep detected",
        message: `${tasksAddedAfterStart} task(s) were added to sprint "${context.sprint.name}" after it started.`,
        confidence: 0.75,
        priority: 5,
        urgency: 0.4,
        affectedItems: [],
        suggestedAction: "Review new additions. Consider moving non-critical items to the next sprint.",
        source: "detectSprintRisks",
      });
    }

    if (requiredRate > velocityPerDay * 1.5 && remainingDays < 14 && remainingDays > 3) {
      patterns.push({
        type: "SPRINT_OVERLOAD",
        severity: "high",
        title: "Sprint pace concern",
        message: `Sprint "${context.sprint.name}" needs ${requiredRate.toFixed(1)} tasks/day but current velocity is ${velocityPerDay}/day.`,
        confidence: 0.7,
        priority: 7,
        urgency: 0.6,
        affectedItems: [],
        suggestedAction: "Monitor progress closely. Prepare a descoping plan if velocity doesn't improve.",
        source: "detectSprintRisks",
      });
    }

    return patterns;
  }

  private static async detectStalledWork(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const stalledTasks = await prisma.task.findMany({
      where: {
        workspaceId: context.workspaceId,
        status: { in: ["in_progress", "in_review"] },
        updatedAt: { lt: new Date(Date.now() - STALL_THRESHOLD_DAYS * 86400000) },
      },
      select: { id: true, title: true, updatedAt: true, assigneeIds: true },
      take: 10,
    });

    if (stalledTasks.length > 0) {
      const daysSinceUpdate = Math.ceil((Date.now() - Math.min(...stalledTasks.map((t) => t.updatedAt.getTime()))) / 86400000);
      patterns.push({
        type: "STALLED_PROGRESS",
        severity: stalledTasks.length > 5 ? "high" : "medium",
        title: "Stalled tasks detected",
        message: `${stalledTasks.length} task(s) haven't been updated in ${STALL_THRESHOLD_DAYS}+ days (oldest: ${daysSinceUpdate} day(s)).`,
        confidence: 0.85,
        priority: stalledTasks.length > 5 ? 6 : 4,
        urgency: Math.min(daysSinceUpdate / 14, 1),
        affectedItems: stalledTasks.map((t) => t.id),
        suggestedAction: "Check stalled tasks. They may need unblocking, reassignment, or descoping.",
        source: "detectStalledWork",
      });
    }

    return patterns;
  }

  private static async detectWorkloadImbalance(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    if (!context.teamWorkload || context.teamWorkload.length < 2) return patterns;

    const workloads = context.teamWorkload.filter((w) => w.activeTasks > 0);
    if (workloads.length < 2) return patterns;

    const maxWorkload = Math.max(...workloads.map((w) => w.activeTasks));
    const minWorkload = Math.min(...workloads.map((w) => w.activeTasks));

    if (maxWorkload > 0 && maxWorkload / Math.max(1, minWorkload) > CAPACITY_IMBALANCE_MULTIPLIER) {
      const overloaded = context.teamWorkload.filter((w) => w.activeTasks === maxWorkload);
      const underloaded = context.teamWorkload.filter((w) => w.activeTasks === minWorkload);

      patterns.push({
        type: "CAPACITY_IMBALANCE",
        severity: "medium",
        title: "Workload imbalance detected",
        message: `${overloaded.map((w) => w.name || w.userId).join(", ")} is/are overloaded (${maxWorkload} tasks) while ${underloaded.map((w) => w.name || w.userId).join(", ")} has/have capacity (${minWorkload} tasks).`,
        confidence: 0.75,
        priority: 5,
        urgency: 0.4,
        affectedItems: [],
        suggestedAction: "Consider redistributing tasks from overloaded to underloaded team members.",
        source: "detectWorkloadImbalance",
      });
    }

    const criticalOverload = context.teamWorkload.filter((w) => w.activeTasks > 10 && w.overdueCount > 3);
    if (criticalOverload.length > 0) {
      patterns.push({
        type: "WORKLOAD_COLLAPSE",
        severity: "high",
        title: "Team members at risk of burnout",
        message: `${criticalOverload.map((w) => w.name || w.userId).join(", ")} ha(s/ve) ${criticalOverload[0]?.activeTasks || 0} active tasks with ${criticalOverload[0]?.overdueCount || 0} overdue.`,
        confidence: 0.7,
        priority: 7,
        urgency: 0.6,
        affectedItems: [],
        suggestedAction: "Reassign tasks or adjust deadlines for overloaded team members.",
        source: "detectWorkloadImbalance",
      });
    }

    return patterns;
  }

  private static async detectDuplicateWork(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const recentTasks = await prisma.task.findMany({
      where: { workspaceId: context.workspaceId, createdAt: { gte: new Date(Date.now() - 48 * 3600000) } },
      select: { id: true, title: true, projectId: true },
      take: 50,
    });

    if (recentTasks.length < 2) return patterns;

    const projectGroups = new Map<string, typeof recentTasks>();
    for (const task of recentTasks) {
      const key = task.projectId || "none";
      if (!projectGroups.has(key)) projectGroups.set(key, []);
      projectGroups.get(key)!.push(task);
    }

    for (const [, tasks] of projectGroups) {
      for (let i = 0; i < tasks.length; i++) {
        for (let j = i + 1; j < tasks.length; j++) {
          const similarity = jaccardSimilarity(tokenize(tasks[i].title), tokenize(tasks[j].title));
          if (similarity >= 0.5) {
            patterns.push({
              type: "DUPLICATE_WORK",
              severity: similarity >= 0.7 ? "medium" : "low",
              title: "Potential duplicate tasks",
              message: `"${tasks[i].title}" and "${tasks[j].title}" are ${Math.round(similarity * 100)}% similar.`,
              confidence: similarity,
              priority: similarity >= 0.7 ? 4 : 2,
              urgency: 0.3,
              affectedItems: [tasks[i].id, tasks[j].id],
              suggestedAction: "Verify and consolidate if they are duplicates.",
              source: "detectDuplicateWork",
            });
          }
        }
      }
    }

    return patterns;
  }

  private static async detectProjectInactivity(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const inactiveProjects = await prisma.project.findMany({
      where: {
        workspaceId: context.workspaceId,
        updatedAt: { lt: new Date(Date.now() - INACTIVE_PROJECT_DAYS * 86400000) },
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        _count: { select: { tasks: true } },
      },
    });

    for (const project of inactiveProjects) {
      if (project._count.tasks === 0) continue;

      const daysInactive = Math.ceil((Date.now() - project.updatedAt.getTime()) / 86400000);
      patterns.push({
        type: "PROJECT_INACTIVITY",
        severity: daysInactive > 30 ? "high" : "medium",
        title: "Inactive project",
        message: `Project "${project.name}" has had no updates in ${daysInactive} day(s) (${project._count.tasks} task(s)).`,
        confidence: 0.85,
        priority: daysInactive > 30 ? 6 : 4,
        urgency: Math.min(daysInactive / 60, 1),
        affectedItems: [project.id],
        suggestedAction: daysInactive > 30
          ? `Consider archiving "${project.name}" or scheduling a review.`
          : `Check if "${project.name}" needs attention or should be paused.`,
        source: "detectProjectInactivity",
      });
    }

    return patterns;
  }

  private static async detectDependencyCascades(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const chainBlockers = await prisma.task.findMany({
      where: {
        workspaceId: context.workspaceId,
        status: "blocked",
      },
      select: {
        id: true,
        title: true,
        _count: { select: { successors: true } },
      },
      take: 10,
    });

    for (const task of chainBlockers) {
      const blockingCount = task._count.successors;
      if (blockingCount >= 3) {
        patterns.push({
          type: "MISSING_DEPENDENCIES",
          severity: "critical",
          title: "Dependency cascade detected",
          message: `"${task.title}" is blocked but also blocks ${blockingCount} other task(s).`,
          confidence: 0.9,
          priority: 9,
          urgency: 0.9,
          affectedItems: [task.id],
          suggestedAction: `Resolving "${task.title}" will unblock ${blockingCount} dependent task(s). Prioritize this.`,
          source: "detectDependencyCascades",
        });
      }
    }

    return patterns;
  }

  private static async detectForgottenWork(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const neverStartedTasks = await prisma.task.findMany({
      where: {
        workspaceId: context.workspaceId,
        status: { in: ["todo", "backlog", "open"] },
        createdAt: { lt: new Date(Date.now() - 7 * 86400000) },
        assigneeIds: { isEmpty: false },
      },
      select: { id: true, title: true, createdAt: true, assigneeIds: true },
      take: 10,
    });

    if (neverStartedTasks.length >= 3) {
      const avgDays = Math.round(
        neverStartedTasks.reduce((sum, t) => sum + Math.ceil((Date.now() - t.createdAt.getTime()) / 86400000), 0) / neverStartedTasks.length
      );

      patterns.push({
        type: "FORGOTTEN_WORK",
        severity: avgDays > 14 ? "high" : "medium",
        title: "Tasks never started",
        message: `${neverStartedTasks.length} assigned task(s) haven't been started in ${avgDays} day(s) on average.`,
        confidence: 0.8,
        priority: avgDays > 14 ? 6 : 4,
        urgency: Math.min(avgDays / 30, 1),
        affectedItems: neverStartedTasks.map((t) => t.id),
        suggestedAction: "Review why these tasks haven't been started. Remove blockers or reassign.",
        source: "detectForgottenWork",
      });
    }

    return patterns;
  }

  private static async detectRecurringFailures(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    if (!context.memory?.recurringIssues) return patterns;

    const criticalIssues = context.memory.recurringIssues.filter((i) => i.frequency === "daily" || i.frequency === "weekly");
    if (criticalIssues.length === 0) return patterns;

    for (const issue of criticalIssues) {
      const daysSinceLast = Math.ceil((Date.now() - issue.lastOccurrence.getTime()) / 86400000);
      patterns.push({
        type: "RECURRING_FAILURE",
        severity: daysSinceLast < 2 ? "high" : "medium",
        title: "Recurring issue detected",
        message: `"${issue.issue}" has occurred ${issue.frequency === "daily" ? "multiple times this week" : "regularly"}. Last occurrence: ${daysSinceLast} day(s) ago.`,
        confidence: 0.7,
        priority: 6,
        urgency: daysSinceLast < 2 ? 0.7 : 0.4,
        affectedItems: [],
        suggestedAction: `Investigate root cause of recurring "${issue.issue}" issues. Consider a process change.`,
        source: "detectRecurringFailures",
      });
    }

    return patterns;
  }

  private static async detectScopeCreep(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    if (!context.sprint) return patterns;

    if (context.sprint.tasksAddedAfterStart > 5) {
      patterns.push({
        type: "SCOPE_CREEP",
        severity: "high",
        title: "Significant scope creep",
        message: `${context.sprint.tasksAddedAfterStart} tasks were added to sprint "${context.sprint.name}" after it started.`,
        confidence: 0.8,
        priority: 6,
        urgency: 0.5,
        affectedItems: [],
        suggestedAction: "Freeze scope for the current sprint. Move new items to the backlog.",
        source: "detectScopeCreep",
      });
    }

    return patterns;
  }

  private static async detectVelocityDrop(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const lastWeek = new Date(Date.now() - 7 * 86400000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);

    const [currentWeekCount, previousWeekCount] = await Promise.all([
      prisma.task.count({ where: { workspaceId: context.workspaceId, completedAt: { gte: lastWeek } } }),
      prisma.task.count({ where: { workspaceId: context.workspaceId, completedAt: { gte: twoWeeksAgo, lt: lastWeek } } }),
    ]);

    if (previousWeekCount > 0 && currentWeekCount < previousWeekCount * VELOCITY_DROP_THRESHOLD) {
      const dropPercent = Math.round((1 - currentWeekCount / previousWeekCount) * 100);
      patterns.push({
        type: "VELOCITY_DROP",
        severity: dropPercent > 50 ? "high" : "medium",
        title: "Completion velocity dropped",
        message: `Task completions dropped ${dropPercent}% this week (${currentWeekCount}) compared to last week (${previousWeekCount}).`,
        confidence: 0.75,
        priority: 5,
        urgency: 0.5,
        affectedItems: [],
        suggestedAction: "Investigate what's slowing the team down. Check for new blockers or workload changes.",
        source: "detectVelocityDrop",
      });
    }

    return patterns;
  }

  private static async detectMemberInactivity(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const inactiveMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: context.workspaceId,
        role: { notIn: ["viewer"] },
      },
      select: { userId: true, user: { select: { name: true } } },
    });

    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    const membersWithActivity = await prisma.activity.groupBy({
      by: ["userId"],
      where: { workspaceId: context.workspaceId, createdAt: { gte: threeDaysAgo } },
      _count: true,
    });

    const activeUserIds = new Set(membersWithActivity.map((m) => m.userId));
    const inactive = inactiveMembers.filter((m) => !activeUserIds.has(m.userId));

    if (inactive.length > 0 && inactive.length <= 3) {
      patterns.push({
        type: "MEMBER_INACTIVITY",
        severity: "medium",
        title: "Inactive team members",
        message: `${inactive.length} team member(s) haven't had activity in 3+ days: ${inactive.map((m) => m.user.name || m.userId).join(", ")}.`,
        confidence: 0.7,
        priority: 3,
        urgency: 0.2,
        affectedItems: [],
        suggestedAction: "Check in with inactive team members to see if they need support.",
        source: "detectMemberInactivity",
      });
    }

    return patterns;
  }

  private static async detectSoloFounderRisks(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    if (!context.workspace || context.workspace.memberCount > 1) return patterns;

    if (context.task && context.task.daysOverdue > SOLO_FOUNDER_OVERDUE_THRESHOLD) {
      patterns.push({
        type: "SOLO_FOUNDER_RISK",
        severity: context.task.daysOverdue > 7 ? "critical" : "high",
        title: "Overdue task — solo founder",
        message: `"${context.task.title}" is ${context.task.daysOverdue} day(s) overdue. As the only team member, each overdue task compounds your workload.`,
        confidence: 0.9,
        priority: 8,
        urgency: Math.min(context.task.daysOverdue / 10, 1),
        affectedItems: [context.task.id],
        suggestedAction: "Consider rescheduling or descoping low-priority items to stay focused.",
        source: "detectSoloFounderRisks",
      });
    }

    if (context.user && context.user.activeTaskCount > 8 && context.workspace.memberCount === 1) {
      patterns.push({
        type: "SOLO_FOUNDER_RISK",
        severity: "high",
        title: "Solo founder overload",
        message: `You have ${context.user.activeTaskCount} active tasks — high for a solo workspace. ${context.user.overdueTaskCount} are overdue.`,
        confidence: 0.8,
        priority: 7,
        urgency: 0.6,
        affectedItems: [],
        suggestedAction: "Prioritize your top 3 tasks for this week and move the rest to next week.",
        source: "detectSoloFounderRisks",
      });
    }

    return patterns;
  }

  private static async detectCompletionTrends(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const last30Days = new Date(Date.now() - 30 * 86400000);
    const completedCount = await prisma.task.count({
      where: { workspaceId: context.workspaceId, completedAt: { gte: last30Days } },
    });

    if (completedCount > 20) {
      patterns.push({
        type: "RECENT_ACHIEVEMENT",
        severity: "low",
        title: "Strong completion trend",
        message: `${completedCount} tasks completed in the last 30 days.`,
        confidence: 0.9,
        priority: 1,
        urgency: 0.1,
        affectedItems: [],
        suggestedAction: "Keep up the momentum. Consider setting a new velocity target.",
        source: "detectCompletionTrends",
      });
    }

    return patterns;
  }

  private static async detectWorkloadCollapse(context: ObservationContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    if (!context.user) return patterns;

    const highPriorityActive = await prisma.task.count({
      where: {
        assigneeIds: { has: context.user.id },
        status: { notIn: ["done", "completed", "cancelled"] },
        priority: { in: ["high", "critical", "urgent"] },
      },
    });

    if (highPriorityActive > 5) {
      patterns.push({
        type: "WORKLOAD_COLLAPSE",
        severity: "high",
        title: "High-priority workload critical",
        message: `You have ${highPriorityActive} high-priority active task(s). This exceeds a manageable workload.`,
        confidence: 0.75,
        priority: 8,
        urgency: 0.7,
        affectedItems: [],
        suggestedAction: "Focus on 2-3 high-priority tasks at a time. Move others to next sprint.",
        source: "detectWorkloadCollapse",
      });
    }

    return patterns;
  }
}
