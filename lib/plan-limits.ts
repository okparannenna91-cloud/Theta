export type PlanName = "free" | "growth" | "pro" | "theta_plus";

// H1: Add explicit allowlist for plan validation
const VALID_PLANS: PlanName[] = ["free", "growth", "pro", "theta_plus"];

export function isValidPlan(plan: string): plan is PlanName {
    return VALID_PLANS.includes(plan as PlanName);
}

export interface PlanLimits {
    // Core Resources
    maxWorkspaces: number;           // -1 = unlimited
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
    maxMemoryItems: number;          // AI memory items per user per workspace (-1 = unlimited)
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

    // Export
    hasExport: boolean;               // CSV/JSON export
    hasPDFExport: boolean;            // PDF export

    // Sprints & Goals
    canCreateSprints: boolean;        // false = view only
    canCreateGoals: boolean;          // false = view only

    // Documents
    maxDocumentPages: number;         // -1 = unlimited

    // Time Tracking
    canUseTimer: boolean;             // false = log only
    hasTimeReports: boolean;          // false = no reports

    // Support
    supportResponseHours: number;     // -1 = no priority support, 0 = 24/7
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
    free: {
        maxWorkspaces: 1,
        maxProjects: -1,            // UNLIMITED
        maxTasks: -1,               // UNLIMITED
        maxTeams: 1,                // 1 team
        maxMembers: 5,              // 5 members
        maxBoards: 3,               // 3 boards
        maxCalendarEvents: 10,      // 10 events
        maxStorage: 256,            // 256MB
        maxFileSize: 5,             // 5MB per file
        hasNovaAI: true,
        maxNovaRequests: 20,        // 20/month
        maxMemoryItems: 50,         // 50 memory items
        hasCustomAutomation: false,
        maxAutomations: 0,          // NONE
        hasIntegrations: true,
        maxIntegrations: 1,         // 1 integration
        hasAdvancedAnalytics: false,
        hasPrioritySupport: false,
        hasCustomFields: false,
        hasWhiteLabel: false,
        hasAPIAccess: false,
        maxAPIRequests: 0,
        activityHistoryDays: 7,     // 7 days
        maxChatMessages: 100,       // 100 messages
        hasExport: false,           // No exports on free
        hasPDFExport: false,
        canCreateSprints: false,    // View only
        canCreateGoals: false,      // View only
        maxDocumentPages: 5,        // 5 pages
        canUseTimer: false,         // Log only
        hasTimeReports: false,
        supportResponseHours: -1,   // No priority support
    },
    growth: {
        maxWorkspaces: -1,
        maxProjects: -1,
        maxTasks: -1,
        maxTeams: 5,
        maxMembers: 15,
        maxBoards: -1,              // UNLIMITED
        maxCalendarEvents: -1,      // UNLIMITED
        maxStorage: 5 * 1024,       // 5GB
        maxFileSize: 25,            // 25MB
        hasNovaAI: true,
        maxNovaRequests: 100,       // 100/month
        maxMemoryItems: 200,        // 200 memory items
        hasCustomAutomation: false,
        maxAutomations: 10,         // 10/month
        hasIntegrations: true,
        maxIntegrations: 3,         // 3 integrations
        hasAdvancedAnalytics: false,
        hasPrioritySupport: false,
        hasCustomFields: true,
        hasWhiteLabel: false,
        hasAPIAccess: false,
        maxAPIRequests: 0,
        activityHistoryDays: 30,    // 30 days
        maxChatMessages: -1,        // UNLIMITED
        hasExport: true,            // CSV export
        hasPDFExport: false,
        canCreateSprints: true,     // Create + manage
        canCreateGoals: true,       // Create + manage
        maxDocumentPages: -1,       // UNLIMITED
        canUseTimer: true,          // Timer + log
        hasTimeReports: false,
        supportResponseHours: 48,   // Email (48h)
    },
    pro: {
        maxWorkspaces: -1,
        maxProjects: -1,
        maxTasks: -1,
        maxTeams: -1,
        maxMembers: 50,
        maxBoards: -1,
        maxCalendarEvents: -1,
        maxStorage: 50 * 1024,      // 50GB
        maxFileSize: 100,           // 100MB
        hasNovaAI: true,
        maxNovaRequests: 500,       // 500/month
        maxMemoryItems: 1000,       // 1000 memory items
        hasCustomAutomation: true,
        maxAutomations: -1,         // UNLIMITED
        hasIntegrations: true,
        maxIntegrations: -1,        // UNLIMITED
        hasAdvancedAnalytics: true,
        hasPrioritySupport: false,
        hasCustomFields: true,
        hasWhiteLabel: false,
        hasAPIAccess: true,
        maxAPIRequests: 10000,      // 10k/mo
        activityHistoryDays: 365,   // 365 days
        maxChatMessages: -1,
        hasExport: true,            // CSV + PDF
        hasPDFExport: true,
        canCreateSprints: true,     // Full
        canCreateGoals: true,       // Full
        maxDocumentPages: -1,
        canUseTimer: true,          // Full reports
        hasTimeReports: true,
        supportResponseHours: 12,   // Email + Chat (12h)
    },
    theta_plus: {
        maxWorkspaces: -1,
        maxProjects: -1,
        maxTasks: -1,
        maxTeams: -1,
        maxMembers: -1,             // UNLIMITED
        maxBoards: -1,
        maxCalendarEvents: -1,
        maxStorage: 500 * 1024,     // 500GB
        maxFileSize: 500,           // 500MB
        hasNovaAI: true,
        maxNovaRequests: 2000,      // 2,000/month
        maxMemoryItems: -1,         // UNLIMITED
        hasCustomAutomation: true,
        maxAutomations: -1,         // UNLIMITED
        hasIntegrations: true,
        maxIntegrations: -1,        // UNLIMITED
        hasAdvancedAnalytics: true,
        hasPrioritySupport: true,
        hasCustomFields: true,
        hasWhiteLabel: true,
        hasAPIAccess: true,
        maxAPIRequests: 100000,     // 100k/mo
        activityHistoryDays: -1,    // LIFETIME
        maxChatMessages: -1,
        hasExport: true,
        hasPDFExport: true,
        canCreateSprints: true,
        canCreateGoals: true,
        maxDocumentPages: -1,
        canUseTimer: true,
        hasTimeReports: true,
        supportResponseHours: 0,    // 24/7 Priority
    },
};

/**
 * Check if user can create more workspaces
 */
export function canCreateWorkspace(
    plan: PlanName,
    currentWorkspaceCount: number
): boolean {
    const limits = PLAN_LIMITS[plan];
    if (limits.maxWorkspaces === -1) return true;
    return currentWorkspaceCount < limits.maxWorkspaces;
}

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
        case "workspaces":
            return "Workspace limit reached. Upgrade your plan to create more workspaces.";
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
        case "nova_ai":
            return "Nova AI request limit reached. Upgrade your plan for more requests.";
        case "chat":
            return "Chat message limit reached. Upgrade your plan for unlimited messaging.";
        case "integrations":
            return "Integration limit reached. Upgrade your plan to unlock more integrations.";
        case "analytics":
            return "Advanced analytics are available on upgraded plans.";
        case "automations":
            return "Automation limit reached. Upgrade your plan for more automations.";
        case "sprints":
            return "Sprint creation is available on Growth plan and above. Upgrade to create and manage sprints.";
        case "goals":
            return "Goal creation is available on Growth plan and above. Upgrade to create and manage goals.";
        case "documents":
            return "Document page limit reached. Upgrade your plan for unlimited documents.";
        case "exports":
            return "Export is available on Growth plan and above. Upgrade to export your data.";
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
 * Updated to trigger at 75% as per the pain funnel design
 */
export function getWarningLevel(percentage: number): "ok" | "warning" | "critical" {
    if (percentage >= 100) return "critical";
    if (percentage >= 75) return "warning";
    return "ok";
}

/**
 * Get warning message for a specific limit
 * Used by the 75% warning system
 */
export function getUsageWarningMessage(
    plan: PlanName,
    feature: string,
    current: number,
    max: number
): string | null {
    if (max === -1) return null; // unlimited
    const percentage = getUsagePercentage(current, max);
    if (percentage < 75) return null;

    const planLimits = PLAN_LIMITS[plan];
    const nextPlan = plan === "free" ? "growth" : plan === "growth" ? "pro" : "theta_plus";
    const nextLimits = PLAN_LIMITS[nextPlan];

    switch (feature) {
        case "members":
            return `${current} of ${max} members used. Upgrade for ${nextLimits.maxMembers === -1 ? "unlimited" : nextLimits.maxMembers} seats at $5 + $2/user`;
        case "boards":
            return `${current} of ${max} boards used. Upgrade for unlimited boards`;
        case "storage":
            return `${current}MB of ${max}MB storage used. Upgrade for ${nextLimits.maxStorage / 1024}GB`;
        case "nova_ai":
            return `${current} of ${max} Nova requests used this month. Upgrade for ${nextLimits.maxNovaRequests}`;
        case "integrations":
            return `${current} of ${max} integrations used. Upgrade for ${nextLimits.maxIntegrations === -1 ? "unlimited" : nextLimits.maxIntegrations}`;
        case "automations":
            return `${current} of ${max} automations used this month. Upgrade for ${nextLimits.maxAutomations === -1 ? "unlimited" : nextLimits.maxAutomations}`;
        case "chat":
            return `${current} of ${max} chat messages used. Upgrade for unlimited messaging`;
        case "calendar_events":
            return `${current} of ${max} calendar events used. Upgrade for unlimited events`;
        default:
            return `${feature} limit nearly reached. Upgrade your plan for more.`;
    }
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
    const rawPlan = workspace.plan || "free";
    if (!isValidPlan(rawPlan)) {
        // H1: Invalid plan falls back to free with a warning
        console.warn(`[enforcePlanLimit] Invalid plan "${rawPlan}" for workspace ${workspaceId}, falling back to free`);
    }
    const plan: PlanName = isValidPlan(rawPlan) ? rawPlan : "free";
    const limits = PLAN_LIMITS[plan];
    let isAllowed = true;

    switch (feature) {
        case "workspaces": isAllowed = limits.maxWorkspaces === -1 || currentCount < limits.maxWorkspaces; break;
        case "projects": isAllowed = limits.maxProjects === -1 || currentCount < limits.maxProjects; break;
        case "tasks": isAllowed = limits.maxTasks === -1 || currentCount < limits.maxTasks; break;
        case "members": isAllowed = limits.maxMembers === -1 || currentCount < limits.maxMembers; break;
        case "teams": isAllowed = limits.maxTeams === -1 || currentCount < limits.maxTeams; break;
        case "boards": isAllowed = limits.maxBoards === -1 || currentCount < limits.maxBoards; break;
        case "calendar_events": isAllowed = limits.maxCalendarEvents === -1 || currentCount < limits.maxCalendarEvents; break;
        case "nova_ai": isAllowed = limits.hasNovaAI && (limits.maxNovaRequests === -1 || currentCount < limits.maxNovaRequests); break;
        case "chat": isAllowed = limits.maxChatMessages === -1 || currentCount < limits.maxChatMessages; break;
        case "integrations": isAllowed = limits.hasIntegrations && (limits.maxIntegrations === -1 || currentCount < limits.maxIntegrations); break;
        case "analytics": isAllowed = limits.hasAdvancedAnalytics; break;
        case "automations": isAllowed = limits.hasCustomAutomation && (limits.maxAutomations === -1 || currentCount < limits.maxAutomations); break;
        case "api_access": isAllowed = limits.hasAPIAccess; break;
        case "sprints": isAllowed = limits.canCreateSprints; break;
        case "goals": isAllowed = limits.canCreateGoals; break;
        case "documents": isAllowed = limits.maxDocumentPages === -1 || currentCount < limits.maxDocumentPages; break;
        case "exports": isAllowed = limits.hasExport; break;
        case "forms":
        case "groups":
        case "columns": isAllowed = true; break; // Tracked by separate limits, minimum enforce deactivated check
        default: break;
    }

    if (!isAllowed) {
        throw new Error(getPlanLimitMessage(plan, feature));
    }
}
