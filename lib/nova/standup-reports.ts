import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis/client";
import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";

const STATUS_DONE = ["done", "completed"];
const STATUS_IN_PROGRESS = ["in-progress", "in_progress"];
const STATUS_BLOCKED = ["blocked"];

export interface StandupReport {
  summary: string;
  completed: string[];
  inProgress: string[];
  blockers: string[];
  upcoming: string[];
  aiInsights: string;
}

export class StandupReports {
  static async generateStandup(
    userId: string,
    workspaceId: string,
    period: "daily" | "weekly" = "daily",
  ): Promise<StandupReport> {
    const now = new Date();
    const periodStart =
      period === "daily"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const upcomingDeadline =
      period === "daily"
        ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [completedTasks, inProgressTasks, blockedTasks, upcomingTasks, user] =
      await Promise.all([
        prisma.activity.findMany({
          where: {
            workspaceId,
            userId,
            entityType: "task",
            action: { in: ["completed", "status_changed", "TASK_COMPLETED"] },
            createdAt: { gte: periodStart, lte: now },
          },
          select: {
            entityId: true,
            metadata: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.task.findMany({
          where: {
            workspaceId,
            assigneeIds: { has: userId },
            status: { in: STATUS_IN_PROGRESS },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            estimatedHours: true,
            project: { select: { name: true } },
          },
        }),
        prisma.task.findMany({
          where: {
            workspaceId,
            assigneeIds: { has: userId },
            status: { in: STATUS_BLOCKED },
          },
          select: {
            id: true,
            title: true,
            predecessors: {
              select: {
                predecessorId: true,
                task: {
                  select: {
                    title: true,
                    status: true,
                    assigneeIds: true,
                  },
                },
              },
            },
          },
        }),
        prisma.task.findMany({
          where: {
            workspaceId,
            assigneeIds: { has: userId },
            status: { notIn: [...STATUS_DONE, ...STATUS_BLOCKED] },
            dueDate: { gte: now, lte: upcomingDeadline },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            priority: true,
            project: { select: { name: true } },
          },
          orderBy: { dueDate: "asc" },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        }),
      ]);

    // Resolve completed task titles
    const completedTaskIds = completedTasks
      .map((a) => a.entityId)
      .filter(Boolean);

    const completedTaskTitles =
      completedTaskIds.length > 0
        ? await prisma.task.findMany({
            where: { id: { in: completedTaskIds } },
            select: { id: true, title: true },
          })
        : [];

    const titleMap = new Map(completedTaskTitles.map((t) => [t.id, t.title]));

    const completed = completedTasks.map((a) => {
      const title = titleMap.get(a.entityId) || (a.metadata as Record<string, unknown>)?.taskTitle as string || "Task";
      return title;
    });

    const inProgress = inProgressTasks.map(
      (t) =>
        `${t.title}${t.project ? ` (${t.project.name})` : ""}${t.dueDate ? ` — due ${new Date(t.dueDate).toLocaleDateString()}` : ""}`
    );

    const blockers = blockedTasks.map((t) => {
      const depDetails = t.predecessors
        .filter(
          (p: { task: { status: string } }) =>
            !STATUS_DONE.includes(p.task.status)
        )
        .map(
          (p: { task: { title: string; status: string } }) =>
            `"${p.task.title}" [${p.task.status}]`
        )
        .join(", ");
      return `"${t.title}" blocked by: ${depDetails || "unknown"}`;
    });

    const upcoming = upcomingTasks.map(
      (t) =>
        `${t.title}${t.project ? ` (${t.project.name})` : ""} — due ${new Date(t.dueDate!).toLocaleDateString()} [${t.priority}]`
    );

    // Generate AI-enhanced standup
    let aiInsights = "";
    const userName = user?.name || "Team member";

    try {
      const prompt = `You are a standup meeting assistant. Generate a concise, natural-language standup summary.

User: ${userName}
Period: ${period === "daily" ? "yesterday" : "last week"}

Completed (${completed.length}):
${completed.length > 0 ? completed.map((c) => `- ${c}`).join("\n") : "- None"}

In Progress (${inProgress.length}):
${inProgress.length > 0 ? inProgress.map((i) => `- ${i}`).join("\n") : "- None"}

Blockers (${blockers.length}):
${blockers.length > 0 ? blockers.map((b) => `- ${b}`).join("\n") : "- None"}

Upcoming (${upcoming.length}):
${upcoming.length > 0 ? upcoming.map((u) => `- ${u}`).join("\n") : "- None"}

Generate a 2-4 sentence standup summary in first person. Be natural and conversational. Highlight:
1. What was accomplished
2. What's being worked on
3. Any blockers or risks
4. What's coming up next

Keep it under 150 words. Be specific with task names.`;

      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "You are a concise standup assistant. Be natural and direct.",
        prompt
      );

      aiInsights = response;
    } catch (error) {
      logger.warn("[StandupReports] LLM generation failed, using fallback:", error);
      aiInsights = this.generateFallbackSummary(
        completed,
        inProgress,
        blockers,
        upcoming,
        userName,
      );
    }

    return {
      summary: aiInsights,
      completed,
      inProgress,
      blockers,
      upcoming,
      aiInsights,
    };
  }

  static async generateTeamStandup(
    teamId: string,
    workspaceId: string,
  ): Promise<StandupReport> {
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId },
      select: { userId: true },
    });

    if (teamMembers.length === 0) {
      return {
        summary: "No team members found.",
        completed: [],
        inProgress: [],
        blockers: [],
        upcoming: [],
        aiInsights: "",
      };
    }

    const memberStandups = await Promise.all(
      teamMembers.map((m) => this.generateStandup(m.userId, workspaceId))
    );

    const allCompleted = memberStandups.flatMap((s) => s.completed);
    const allInProgress = memberStandups.flatMap((s) => s.inProgress);
    const allBlockers = memberStandups.flatMap((s) => s.blockers);
    const allUpcoming = memberStandups.flatMap((s) => s.upcoming);

    // Deduplicate
    const uniqueCompleted = [...new Set(allCompleted)];
    const uniqueInProgress = [...new Set(allInProgress)];
    const uniqueBlockers = [...new Set(allBlockers)];
    const uniqueUpcoming = [...new Set(allUpcoming)];

    let aiInsights = "";

    try {
      const teamMemberNames = await Promise.all(
        teamMembers.map(async (m) => {
          const user = await prisma.user.findUnique({
            where: { id: m.userId },
            select: { name: true },
          });
          return user?.name || "Unknown";
        })
      );

      const prompt = `You are a team standup facilitator. Generate a team standup summary.

Team members: ${teamMemberNames.join(", ")}
Team size: ${teamMembers.length}

Team completed (${uniqueCompleted.length}):
${uniqueCompleted.slice(0, 15).map((c) => `- ${c}`).join("\n") || "- None"}

Team in progress (${uniqueInProgress.length}):
${uniqueInProgress.slice(0, 15).map((i) => `- ${i}`).join("\n") || "- None"}

Team blockers (${uniqueBlockers.length}):
${uniqueBlockers.map((b) => `- ${b}`).join("\n") || "- None"}

Team upcoming (${uniqueUpcoming.length}):
${uniqueUpcoming.slice(0, 10).map((u) => `- ${u}`).join("\n") || "- None"}

Generate a team standup summary:
1. Overall team progress (2-3 sentences)
2. Key blockers that need attention
3. Team capacity assessment
4. Recommendations

Be concise and action-oriented. Under 200 words.`;

      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "You are a concise team standup facilitator. Be direct and action-oriented.",
        prompt
      );

      aiInsights = response;
    } catch (error) {
      logger.warn("[StandupReports] Team LLM generation failed:", error);
      aiInsights = `Team standup: ${uniqueCompleted.length} completed, ${uniqueInProgress.length} in progress, ${uniqueBlockers.length} blocked, ${uniqueUpcoming.length} upcoming.`;
    }

    return {
      summary: aiInsights,
      completed: uniqueCompleted,
      inProgress: uniqueInProgress,
      blockers: uniqueBlockers,
      upcoming: uniqueUpcoming,
      aiInsights,
    };
  }

  static async scheduleDailyStandup(
    workspaceId: string,
  ): Promise<{ scheduled: number; errors: number }> {
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    });

    let scheduled = 0;
    let errors = 0;

    for (const member of workspaceMembers) {
      try {
        const standup = await this.generateStandup(member.userId, workspaceId);

        const cacheKey = `standup:${workspaceId}:${member.userId}:${new Date().toISOString().slice(0, 10)}`;
        await redis.set(
          cacheKey,
          JSON.stringify({
            ...standup,
            generatedAt: new Date().toISOString(),
            period: "daily",
          }),
          { ex: 172800 }
        );

        scheduled++;
      } catch (error) {
        logger.warn(`[StandupReports] Failed to generate standup for user ${member.userId}:`, error);
        errors++;
      }
    }

    logger.info("[StandupReports] Scheduled daily standups", {
      workspaceId,
      scheduled,
      errors,
    });

    return { scheduled, errors };
  }

  private static generateFallbackSummary(
    completed: string[],
    inProgress: string[],
    blockers: string[],
    upcoming: string[],
    userName: string,
  ): string {
    const parts: string[] = [];

    parts.push(`Yesterday I completed ${completed.length} task(s).`);
    if (completed.length > 0 && completed.length <= 3) {
      parts.push(`Specifically: ${completed.join(", ")}.`);
    }

    if (inProgress.length > 0) {
      parts.push(`Currently working on ${inProgress.length} task(s): ${inProgress.slice(0, 3).join(", ")}.`);
    }

    if (blockers.length > 0) {
      parts.push(`I have ${blockers.length} blocker(s) that need attention: ${blockers.join("; ")}.`);
    }

    if (upcoming.length > 0) {
      parts.push(`Coming up: ${upcoming.slice(0, 3).join(", ")}.`);
    }

    if (parts.length === 1) {
      parts.push("No significant activity to report.");
    }

    return parts.join(" ");
  }
}
