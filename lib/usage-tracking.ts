import { prisma } from "./prisma";
import { PlanName, getPlanLimits, getUsagePercentage, getWarningLevel } from "./plan-limits";
import { logger } from "./logger";

export interface UsageStats {
    projects: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    tasks: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    teams: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    members: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    boards: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    calendar_events: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    storage: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    nova: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    chat_messages: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    integrations: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
    automations: { current: number; max: number; percentage: number; warning: "ok" | "warning" | "critical" };
}

export async function getUsageStats(workspaceId: string): Promise<UsageStats> {
    try {
        const memberCount = await prisma.workspaceMember.count({
            where: {
                workspaceId,
                OR: [
                    { status: "active" },
                    { status: { isSet: false } }
                ]
            }
        });

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId }
        });

        if (!workspace) {
            throw new Error("Workspace not found");
        }

        const isDeactivated = (workspace.subscriptionStatus ?? workspace.billingStatus) === "deactivated";
        const plan = workspace.plan as PlanName;
        const limits = getPlanLimits(plan);

        const projectCount = await prisma.project.count({ where: { workspaceId } });
        const taskCount = await prisma.task.count({ where: { workspaceId } });
        const teamCount = await prisma.team.count({ where: { workspaceId } });
        const boardCount = await prisma.board.count({ where: { workspaceId } });
        const calendarEventCount = await prisma.calendarEvent.count({ where: { workspaceId } });
        const chatMessageCount = await prisma.chatMessage.count({ where: { workspaceId } });
        const integrationCount = await prisma.integration.count({ where: { workspaceId } });
        const automationCount = await prisma.automation.count({ where: { workspaceId } });

        const storageActivities = await prisma.activity.findMany({
            where: { workspaceId, action: "file_upload" },
            select: { metadata: true }
        });

        const storageUsed = storageActivities.reduce((acc, curr) => {
            const metadata = curr.metadata as any;
            return acc + (metadata?.size || 0);
        }, 0) / (1024 * 1024);

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const novaRequestCount = await prisma.activity.count({
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
            members: createStat(memberCount, limits.maxMembers),
            boards: createStat(boardCount, limits.maxBoards),
            calendar_events: createStat(calendarEventCount, limits.maxCalendarEvents),
            storage: createStat(storageUsed, limits.maxStorage),
            nova: createStat(novaRequestCount, limits.maxNovaRequests),
            chat_messages: createStat(chatMessageCount, limits.maxChatMessages),
            integrations: createStat(integrationCount, limits.maxIntegrations),
            automations: createStat(automationCount, limits.maxAutomations),
        };
    } catch (error) {
        logger.error("getUsageStats Error:", error);
        throw error;
    }
}

export async function checkLimitExceeded(
    workspaceId: string,
    resource: keyof UsageStats
): Promise<boolean> {
    const stats = await getUsageStats(workspaceId);
    return stats[resource].percentage >= 100;
}

export async function getProjectCount(workspaceId: string): Promise<number> {
    return await prisma.project.count({
        where: { workspaceId },
    });
}

export async function getTaskCount(workspaceId: string): Promise<number> {
    return await prisma.task.count({
        where: { workspaceId },
    });
}

export async function getTeamCount(workspaceId: string): Promise<number> {
    return await prisma.team.count({
        where: { workspaceId },
    });
}

export async function getMemberCount(workspaceId: string): Promise<number> {
    return await prisma.workspaceMember.count({
        where: { 
            workspaceId,
            OR: [
                { status: "active" },
                { status: { isSet: false } }
            ]
        },
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

    return totalBytes / (1024 * 1024);
}

export async function getNovaRequestCount(workspaceId: string): Promise<number> {
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

export async function getCalendarEventCount(workspaceId: string): Promise<number> {
    return await prisma.calendarEvent.count({
        where: { workspaceId },
    });
}

export async function getIntegrationCount(workspaceId: string): Promise<number> {
    return await prisma.integration.count({
        where: { workspaceId },
    });
}

export async function incrementNovaUsage(workspaceId: string, userId: string): Promise<void> {
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

export async function isBillingActive(workspaceId: string): Promise<boolean> {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { subscriptionStatus: true, billingStatus: true }
    });

    const status = workspace?.subscriptionStatus ?? workspace?.billingStatus;
    return status === "active" || status === "past_due" || status === "trialing";
}
