import { prisma } from "./prisma";
import { PlanName, getPlanLimits, getUsagePercentage, getWarningLevel } from "./plan-limits";

export interface UsageStats {
    projects: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    tasks: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    teams: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    members: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    boards: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    calendar_events: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    storage: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    boots: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    chat_messages: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    integrations: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
}

/**
 * Get comprehensive usage statistics for a workspace
 */
export async function getUsageStats(workspaceId: string): Promise<UsageStats> {
    try {
        const { getPrismaClient } = await import("./prisma");
        const shardPrisma = getPrismaClient(workspaceId);

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                _count: {
                    select: {
                        members: true,
                    },
                },
            },
        });

        if (!workspace) {
            throw new Error("Workspace not found");
        }

        const isDeactivated = workspace.billingStatus === "deactivated";
        const plan = workspace.plan as PlanName;
        const limits = getPlanLimits(plan);

        const projectCount = await shardPrisma.project.count({ where: { workspaceId } });
        const taskCount = await shardPrisma.task.count({ where: { workspaceId } });
        const teamCount = await shardPrisma.team.count({ where: { workspaceId } });
        const boardCount = await shardPrisma.board.count({ where: { workspaceId } });
        const calendarEventCount = await shardPrisma.calendarEvent.count({ where: { workspaceId } });
        const chatMessageCount = await shardPrisma.chatMessage.count({ where: { workspaceId } });
        const integrationCount = await shardPrisma.integration.count({ where: { workspaceId } });

        const storageActivities = await shardPrisma.activity.findMany({
            where: { workspaceId, action: "file_upload" },
            select: { metadata: true }
        });

        const storageUsed = storageActivities.reduce((acc, curr) => {
            const metadata = curr.metadata as any;
            return acc + (metadata?.size || 0);
        }, 0) / (1024 * 1024);

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const bootsRequestCount = await shardPrisma.activity.count({
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
            projects: createStat(projectCount, limits.maxProjects),
            tasks: createStat(taskCount, limits.maxTasks),
            teams: createStat(teamCount, limits.maxTeams),
            members: createStat(workspace._count.members, limits.maxMembers),
            boards: createStat(boardCount, limits.maxBoards),
            calendar_events: createStat(calendarEventCount, limits.maxCalendarEvents),
            storage: createStat(storageUsed, limits.maxStorage),
            boots: createStat(bootsRequestCount, limits.maxBootsRequests),
            chat_messages: createStat(chatMessageCount, limits.maxChatMessages),
            integrations: createStat(integrationCount, limits.maxIntegrations),
        };
    } catch (error) {
        console.error("getUsageStats Error:", error);
        throw error;
    }
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
    const { getPrismaClient } = await import("./prisma");
    return await getPrismaClient(workspaceId).project.count({
        where: { workspaceId },
    });
}

export async function getTaskCount(workspaceId: string): Promise<number> {
    const { getPrismaClient } = await import("./prisma");
    return await getPrismaClient(workspaceId).task.count({
        where: { workspaceId },
    });
}

export async function getTeamCount(workspaceId: string): Promise<number> {
    const { getPrismaClient } = await import("./prisma");
    return await getPrismaClient(workspaceId).team.count({
        where: { workspaceId },
    });
}

export async function getMemberCount(workspaceId: string): Promise<number> {
    // Members are on Shard 1 with workspace metadata
    return await prisma.workspaceMember.count({
        where: { workspaceId },
    });
}

export async function calculateStorageUsed(workspaceId: string): Promise<number> {
    const { getPrismaClient } = await import("./prisma");
    const shardPrisma = getPrismaClient(workspaceId);
    
    const storageActivities = await shardPrisma.activity.findMany({
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

export async function getBootsRequestCount(workspaceId: string): Promise<number> {
    const { getPrismaClient } = await import("./prisma");
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return await getPrismaClient(workspaceId).activity.count({
        where: {
            workspaceId,
            action: "ai_generation",
            createdAt: { gte: firstDayOfMonth }
        }
    });
}

export async function getCalendarEventCount(workspaceId: string): Promise<number> {
    const { getPrismaClient } = await import("./prisma");
    return await getPrismaClient(workspaceId).calendarEvent.count({
        where: { workspaceId },
    });
}

export async function getIntegrationCount(workspaceId: string): Promise<number> {
    const { getPrismaClient } = await import("./prisma");
    return await getPrismaClient(workspaceId).integration.count({
        where: { workspaceId },
    });
}

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
