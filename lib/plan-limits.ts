export type PlanName = "free" | "growth" | "pro" | "theta_plus";

export interface PlanLimits {
    // Core Resources
    maxProjects: number;              // -1 = unlimited
    maxTasks: number;
    maxTeams: number;
    maxMembers: number;
    maxBoards: number;
    maxCalendarEvents: number;

    // Storage & Files
    maxStorage: number;               // in MB
    maxFileSize: number;              // in MB per file

    // AI & Automation
    hasNovaAI: boolean;
    maxNovaRequests: number;         // per month
    hasCustomAutomation: boolean;
    maxAutomations: number;

    // Features
    hasIntegrations: boolean;
    maxIntegrations: number;
    hasAdvancedAnalytics: boolean;
    hasPrioritySupport: boolean;
    hasCustomFields: boolean;
    hasWhiteLabel: boolean;
    hasAPIAccess: boolean;
    maxAPIRequests: number;           // per month

    // History & Retention
    activityHistoryDays: number;      // -1 = lifetime
    maxChatMessages: number;          // -1 = unlimited
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
    free: {
        maxProjects: 3,
        maxTasks: 25,
        maxTeams: 1,
        maxMembers: 3,
        maxBoards: 2,
        maxCalendarEvents: 20,
        maxStorage: 100, // 100MB
        maxFileSize: 5, // 5MB
        hasNovaAI: true,
        maxNovaRequests: 10,
        hasCustomAutomation: false,
        maxAutomations: 0,
        hasIntegrations: false,
        maxIntegrations: 0,
        hasAdvancedAnalytics: false,
        hasPrioritySupport: false,
        hasCustomFields: false,
        hasWhiteLabel: false,
        hasAPIAccess: false,
        maxAPIRequests: 0,
        activityHistoryDays: 30,
        maxChatMessages: 100,
    },
    growth: {
        maxProjects: 15,
        maxTasks: 150,
        maxTeams: 5,
        maxMembers: 15,
        maxBoards: 10,
        maxCalendarEvents: 100,
        maxStorage: 5 * 1024, // 5GB
        maxFileSize: 25, // 25MB
        hasNovaAI: true,
        maxNovaRequests: 100,
        hasCustomAutomation: false,
        maxAutomations: 0,
        hasIntegrations: true,
        maxIntegrations: 2,
        hasAdvancedAnalytics: false,
        hasPrioritySupport: false,
        hasCustomFields: false,
        hasWhiteLabel: false,
        hasAPIAccess: false,
        maxAPIRequests: 0,
        activityHistoryDays: 90,
        maxChatMessages: 1000,
    },
    pro: {
        maxProjects: 100,
        maxTasks: -1, // unlimited
        maxTeams: -1,
        maxMembers: 50,
        maxBoards: -1,
        maxCalendarEvents: -1,
        maxStorage: 50 * 1024, // 50GB
        maxFileSize: 100, // 100MB
        hasNovaAI: true,
        maxNovaRequests: 500,
        hasCustomAutomation: true,
        maxAutomations: 5,
        hasIntegrations: true,
        maxIntegrations: -1,
        hasAdvancedAnalytics: true,
        hasPrioritySupport: false,
        hasCustomFields: true,
        hasWhiteLabel: false,
        hasAPIAccess: true,
        maxAPIRequests: 10000,
        activityHistoryDays: 365,
        maxChatMessages: -1,
    },
    theta_plus: {
        maxProjects: -1,
        maxTasks: -1,
        maxTeams: -1,
        maxMembers: -1,
        maxBoards: -1,
        maxCalendarEvents: -1,
        maxStorage: 500 * 1024, // 500GB
        maxFileSize: 500, // 500MB
        hasNovaAI: true,
        maxNovaRequests: 2000,
        hasCustomAutomation: true,
        maxAutomations: -1,
        hasIntegrations: true,
        maxIntegrations: -1,
        hasAdvancedAnalytics: true,
        hasPrioritySupport: true,
        hasCustomFields: true,
        hasWhiteLabel: true,
        hasAPIAccess: true,
        maxAPIRequests: 100000,
        activityHistoryDays: -1, // lifetime
        maxChatMessages: -1,
    },
};

/**
 * Check if workspace can create more projects
 */
export function canCreateProject(
    plan: PlanName,
    currentProjectCount: number
): boolean {
    const limits = PLAN_LIMITS[plan];
    if (limits.maxProjects === -1) return true;
    return currentProjectCount < limits.maxProjects;
}

/**
 * Check if workspace can add more members
 */
export function canAddMember(
    plan: PlanName,
    currentMemberCount: number
): boolean {
    const limits = PLAN_LIMITS[plan];
    if (limits.maxMembers === -1) return true;
    return currentMemberCount < limits.maxMembers;
}

/**
 * Check if workspace can create more tasks
 */
export function canCreateTask(
    plan: PlanName,
    currentTaskCount: number
): boolean {
    const limits = PLAN_LIMITS[plan];
    if (limits.maxTasks === -1) return true;
    return currentTaskCount < limits.maxTasks;
}

/**
 * Check if workspace can create more teams
 */
export function canCreateTeam(
    plan: PlanName,
    currentTeamCount: number
): boolean {
    const limits = PLAN_LIMITS[plan];
    if (limits.maxTeams === -1) return true;
    return currentTeamCount < limits.maxTeams;
}

/**
 * Check if workspace can create more boards
 */
export function canCreateBoard(
    plan: PlanName,
    currentBoardCount: number
): boolean {
    const limits = PLAN_LIMITS[plan];
    if (limits.maxBoards === -1) return true;
    return currentBoardCount < limits.maxBoards;
}

/**
 * Check if workspace can create more calendar events
 */
export function canCreateCalendarEvent(
    plan: PlanName,
    currentEventCount: number
): boolean {
    const limits = PLAN_LIMITS[plan];
    if (limits.maxCalendarEvents === -1) return true;
    return currentEventCount < limits.maxCalendarEvents;
}

/**
 * Check if workspace has access to integrations
 */
export function hasIntegrationAccess(plan: PlanName): boolean {
    return PLAN_LIMITS[plan].hasIntegrations;
}

/**
 * Check if workspace has access to advanced analytics
 */
export function hasAdvancedAnalyticsAccess(plan: PlanName): boolean {
    return PLAN_LIMITS[plan].hasAdvancedAnalytics;
}

/**
 * Check if workspace has access to Nova AI
 */
export function hasNovaAIAccess(plan: PlanName): boolean {
    return PLAN_LIMITS[plan].hasNovaAI;
}

/**
 * Check if workspace can make more Nova AI requests
 */
export function canUseNovaAI(
    plan: PlanName,
    currentRequestCount: number
): boolean {
    const limits = PLAN_LIMITS[plan];
    if (!limits.hasNovaAI) return false;
    if (limits.maxNovaRequests === -1) return true;
    return currentRequestCount < limits.maxNovaRequests;
}

/**
 * Get feature limits for a plan
 */
export function getPlanLimits(plan: PlanName): PlanLimits {
    return PLAN_LIMITS[plan];
}

/**
 * Get plan limit error message
 */
export function getPlanLimitMessage(plan: PlanName, feature: string): string {
    switch (feature) {
        case "projects":
            return "Project limit reached. Upgrade your plan to create more projects.";
        case "tasks":
            return "Task limit reached. Upgrade your plan to create more tasks.";
        case "members":
            return "Member limit reached. Upgrade your plan to add more members.";
        case "teams":
            return "Team limit reached. Upgrade your plan to create more teams.";
        case "boards":
            return "Board limit reached. Upgrade your plan to create more boards.";
        case "calendar_events":
            return "Calendar event limit reached. Upgrade your plan to create more events.";
        case "storage":
            return "Storage limit reached. Upgrade your plan for more space.";
        case "boots":
            return "Nova AI request limit reached. Upgrade your plan for more requests.";
        case "chat":
            return "Chat message limit reached. Upgrade your plan for unlimited messaging.";
        case "integrations":
            return "Integration limit reached. Upgrade your plan to unlock more integrations.";
        case "analytics":
            return "Advanced analytics are available on upgraded plans.";
        default:
            return "This feature is not available on your current plan. Upgrade to unlock it.";
    }
}

/**
 * Get usage percentage
 */
export function getUsagePercentage(current: number, max: number): number {
    if (max === -1) return 0; // unlimited
    return Math.min(Math.round((current / max) * 100), 100);
}

/**
 * Get warning level based on usage
 */
export function getWarningLevel(percentage: number): "ok" | "warning" | "critical" {
    if (percentage >= 100) return "critical";
    if (percentage >= 80) return "warning";
    return "ok";
}

/**
 * Server-side helper to strictly enforce plan limits.
 * Throws a 403 error if the limit is exceeded or billing is inactive.
 */
export async function enforcePlanLimit(
    workspaceId: string,
    feature: string,
    currentCount: number
) {
    const { prisma } = await import("./prisma");

    // 1. Fetch workspace, billing status, and owner info
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            plan: true,
            subscriptionStatus: true,
            billingStatus: true,
            members: {
                where: { role: "owner" },
                select: {
                    user: {
                        select: {
                            clerkId: true
                        }
                    }
                }
            }
        }
    });

    if (!workspace) throw new Error("Workspace not found");

    const billingStatus = workspace.subscriptionStatus ?? workspace.billingStatus;

    // 2. Strict Billing Check: Deactivated workspaces can't create anything
    if (billingStatus === "deactivated") {
        throw new Error("Your workspace has been deactivated due to billing issues. Please update your payment method.");
    }

    // 3. Check Plan Limit
    const plan = (workspace.plan as PlanName) || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    let isAllowed = true;

    switch (feature) {
        case "projects": isAllowed = limits.maxProjects === -1 || currentCount < limits.maxProjects; break;
        case "tasks": isAllowed = limits.maxTasks === -1 || currentCount < limits.maxTasks; break;
        case "members": isAllowed = limits.maxMembers === -1 || currentCount < limits.maxMembers; break;
        case "teams": isAllowed = limits.maxTeams === -1 || currentCount < limits.maxTeams; break;
        case "boards": isAllowed = limits.maxBoards === -1 || currentCount < limits.maxBoards; break;
        case "calendar_events": isAllowed = limits.maxCalendarEvents === -1 || currentCount < limits.maxCalendarEvents; break;
        case "boots": isAllowed = limits.hasNovaAI && (limits.maxNovaRequests === -1 || currentCount < limits.maxNovaRequests); break;
        case "chat": isAllowed = limits.maxChatMessages === -1 || currentCount < limits.maxChatMessages; break;
        case "integrations": isAllowed = limits.hasIntegrations && (limits.maxIntegrations === -1 || currentCount < limits.maxIntegrations); break;
        case "analytics": isAllowed = limits.hasAdvancedAnalytics; break;
        case "automations": isAllowed = limits.hasCustomAutomation && (limits.maxAutomations === -1 || currentCount < limits.maxAutomations); break;
        case "api_access": isAllowed = limits.hasAPIAccess; break;
        case "documents":
        case "forms":
        case "groups":
        case "columns": isAllowed = true; break; // Tracked by separate limits, minimum enforce deactivated check
        default: break;
    }

    if (!isAllowed) {
        throw new Error(getPlanLimitMessage(plan, feature));
    }
}
