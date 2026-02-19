import { prisma } from "./prisma";
import { PlanName, getPlanLimits, getUsagePercentage, getWarningLevel } from "./plan-limits";

export interface UsageStats {
    projects: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    tasks: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    teams: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    members: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    boards: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    calendarEvents: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    storage: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    bootsRequests: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    chatMessages: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
}

/**
 * Get comprehensive usage statistics for a workspace
 */
export async function getUsageStats(workspaceId: string): Promise<UsageStats> {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
            _count: {
                select: {
                    projects: true,
                    tasks: true,
                    teams: true,
                    members: true,
                },
            },
        },
    });

    if (!workspace) {
        throw new Error("Workspace not found");
    }

    // Check if billing is deactivated
    const isDeactivated = workspace.billingStatus === "deactivated";

    const plan = workspace.plan as PlanName;
    const limits = getPlanLimits(plan);

    // Get additional counts
    const boardCount = await prisma.board.count({
        where: { workspaceId },
    });

    const calendarEventCount = await prisma.calendarEvent.count({
        where: { workspaceId },
    });

    const chatMessageCount = await prisma.chatMessage.count({
        where: { workspaceId },
    });

    // Calculate storage
    const storageActivities = await prisma.activity.findMany({
        where: {
            workspaceId,
            action: "file_upload"
        },
        select: {
            metadata: true
        }
    });

    const storageUsed = storageActivities.reduce((acc, curr) => {
        const metadata = curr.metadata as any;
        return acc + (metadata?.size || 0);
    }, 0) / (1024 * 1024); // Convert to MB

    // Get Boots AI usage for current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Track Boots AI requests (assuming an Activity log exists for 'ai_generation')
    const bootsRequestCount = await prisma.activity.count({
        where: {
            workspaceId,
            action: "ai_generation",
            createdAt: { gte: firstDayOfMonth }
        }
    });

    const createStat = (current: number, max: number) => {
        const percentage = isDeactivated ? 100 : getUsagePercentage(current, max);
        return {
            current,
            max,
            percentage,
            warning: isDeactivated ? "critical" : getWarningLevel(percentage),
        };
    };

    return {
        projects: createStat(workspace._count.projects, limits.maxProjects),
        tasks: createStat(workspace._count.tasks, limits.maxTasks),
        teams: createStat(workspace._count.teams, limits.maxTeams),
        members: createStat(workspace._count.members, limits.maxMembers),
        boards: createStat(boardCount, limits.maxBoards),
        calendarEvents: createStat(calendarEventCount, limits.maxCalendarEvents),
        storage: createStat(storageUsed, limits.maxStorage),
        bootsRequests: createStat(bootsRequestCount, limits.maxBootsRequests),
        chatMessages: createStat(chatMessageCount, limits.maxChatMessages),
    };
}

/**
 * Check if a specific resource limit is exceeded
 */
export async function checkLimitExceeded(
    workspaceId: string,
    resource: keyof UsageStats
): Promise<boolean> {
    const stats = await getUsageStats(workspaceId);
    return stats[resource].percentage >= 100;
}

/**
 * Get project count for workspace
 */
export async function getProjectCount(workspaceId: string): Promise<number> {
    return await prisma.project.count({
        where: { workspaceId },
    });
}

/**
 * Get task count for workspace
 */
export async function getTaskCount(workspaceId: string): Promise<number> {
    return await prisma.task.count({
        where: { workspaceId },
    });
}

/**
 * Get team count for workspace
 */
export async function getTeamCount(workspaceId: string): Promise<number> {
    return await prisma.team.count({
        where: { workspaceId },
    });
}

/**
 * Get member count for workspace
 */
export async function getMemberCount(workspaceId: string): Promise<number> {
    return await prisma.workspaceMember.count({
        where: { workspaceId },
    });
}

export async function calculateStorageUsed(workspaceId: string): Promise<number> {
    const storageActivities = await prisma.activity.findMany({
        where: {
            workspaceId,
            action: "file_upload"
        },
        select: {
            metadata: true
        }
    });

    const totalBytes = storageActivities.reduce((acc, curr) => {
        const metadata = curr.metadata as any;
        return acc + (metadata?.size || 0);
    }, 0);

    return totalBytes / (1024 * 1024); // in MB
}

/**
 * Get Boots AI request count for current month
 */
export async function getBootsRequestCount(workspaceId: string): Promise<number> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return await prisma.activity.count({
        where: {
            workspaceId,
            action: "ai_generation",
            createdAt: { gte: firstDayOfMonth }
        }
    });
}

/**
 * Increment Boots AI usage counter (via Activity log)
 */
export async function incrementBootsUsage(workspaceId: string, userId: string): Promise<void> {
    const { createActivity } = await import("./activity");
    await createActivity(
        userId,
        workspaceId,
        "ai_generation",
        "ai",
        "boots",
        { timestamp: new Date() }
    );
}

/**
 * Check if a workspace has active billing access
 */
export async function isBillingActive(workspaceId: string): Promise<boolean> {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { billingStatus: true }
    });

    return workspace?.billingStatus === "active" || workspace?.billingStatus === "past_due";
}
