import {
    Plus,
    Pencil,
    Trash2,
    CheckCircle2,
    RotateCcw,
    UserPlus,
    UserMinus,
    ArrowRightLeft,
    Calendar,
    MessageSquare,
    Paperclip,
    Bot,
    Settings,
    Link2,
    FolderOpen,
    Layout,
    CreditCard,
    Zap,
    FileText,
    MoveRight,
    Crown,
    Shield,
    Users,
    GitBranch,
} from "lucide-react";
import { format as dateFormat } from "date-fns";

export interface ActivityMeta {
    entityName?: string;
    taskTitle?: string;
    projectName?: string;
    boardName?: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    content?: string;
    [key: string]: unknown;
}

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    created: { label: "Created", icon: Plus, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
    updated: { label: "Updated", icon: Pencil, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
    deleted: { label: "Deleted", icon: Trash2, color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
    completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
    reopened: { label: "Reopened", icon: RotateCcw, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
    assigned: { label: "Assigned", icon: UserPlus, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" },
    unassigned: { label: "Unassigned", icon: UserMinus, color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20" },
    moved: { label: "Moved", icon: MoveRight, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
    linked: { label: "Linked", icon: Link2, color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20" },
    comment_created: { label: "Commented", icon: MessageSquare, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
    comment_deleted: { label: "Deleted Comment", icon: Trash2, color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
    file_upload: { label: "Uploaded", icon: Paperclip, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
    file_deletion: { label: "Deleted File", icon: Trash2, color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
    joined: { label: "Joined", icon: UserPlus, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
    invited: { label: "Invited", icon: UserPlus, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" },
    removed: { label: "Removed", icon: UserMinus, color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
    nova_execution: { label: "Nova Action", icon: Bot, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
    nova_query: { label: "Nova Query", icon: Bot, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
    nova_suggestion: { label: "Nova Suggestion", icon: Bot, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
    ai_generation: { label: "AI Generation", icon: Bot, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
    STREAM_EVENT: { label: "AI Stream", icon: Bot, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
    ordered: { label: "Order", icon: CreditCard, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
    pushed: { label: "Push", icon: GitBranch, color: "text-slate-500 bg-slate-50 dark:bg-slate-900/20" },
};

const ENTITY_ICONS: Record<string, any> = {
    task: Pencil,
    project: FolderOpen,
    board: Layout,
    comment: MessageSquare,
    document: FileText,
    file: Paperclip,
    team: Users,
    member: UserPlus,
    workspace_member: UserPlus,
    workspace: Crown,
    settings: Settings,
    integration: Link2,
    woocommerce_store: Link2,
    trello_board: Link2,
    github_repo: Link2,
    bitbucket_repo: Link2,
    asana_task: Link2,
    ai: Bot,
    AI_STREAM: Bot,
    nova: Bot,
    billing: CreditCard,
};

export function getActionConfig(action: string): { label: string; icon: any; color: string } {
    return ACTION_CONFIG[action] || { label: formatActionVerb(action), icon: Pencil, color: "text-slate-500 bg-slate-50 dark:bg-slate-900/20" };
}

export function getEntityIcon(entityType: string): any {
    return ENTITY_ICONS[entityType] || FileText;
}

function formatActionVerb(action: string): string {
    return action
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatActivityDescription(activity: {
    action: string;
    entityType: string;
    entityName: string;
    metadata?: ActivityMeta;
}): string {
    const { action, entityType, entityName, metadata } = activity;

    if (entityType === "comment" && action === "comment_created") {
        return `commented on ${entityName}`;
    }
    if (entityType === "comment" && action === "comment_deleted") {
        return `deleted a comment on ${entityName}`;
    }
    if (action === "completed") {
        return `completed ${entityName}`;
    }
    if (action === "created") {
        return `created ${entityName}`;
    }
    if (action === "deleted") {
        return `deleted ${entityName}`;
    }
    if (action === "updated") {
        return `updated ${entityName}`;
    }
    if (action === "moved") {
        return `moved ${entityName}`;
    }
    if (action === "linked") {
        return `linked a dependency to ${entityName}`;
    }
    if (action === "joined") {
        return `joined the workspace`;
    }
    if (action === "file_upload") {
        return `uploaded a file`;
    }
    if (action === "file_deletion") {
        return `deleted a file`;
    }
    if (action.startsWith("nova_") || action === "ai_generation" || action === "STREAM_EVENT") {
        const config = getActionConfig(action);
        return `${config.label.toLowerCase()}: ${entityName}`;
    }

    const config = getActionConfig(action);
    return `${config.label.toLowerCase()} ${entityName}`;
}

export function formatChanges(changes: Record<string, { old: unknown; new: unknown }>): Array<{ field: string; oldLabel: string; newLabel: string }> {
    const FIELD_LABELS: Record<string, string> = {
        status: "Status",
        priority: "Priority",
        title: "Title",
        assigneeIds: "Assignee",
        dueDate: "Due Date",
        startDate: "Start Date",
        description: "Description",
        progress: "Progress",
        taskType: "Type",
        color: "Color",
    };

    const STATUS_LABELS: Record<string, string> = {
        todo: "Todo",
        in_progress: "In Progress",
        done: "Done",
        cancelled: "Cancelled",
        backlog: "Backlog",
        review: "Review",
    };

    const PRIORITY_LABELS: Record<string, string> = {
        low: "Low",
        medium: "Medium",
        high: "High",
        urgent: "Urgent",
    };

    return Object.entries(changes).map(([field, change]) => {
        let oldLabel = String(change.old ?? "none");
        let newLabel = String(change.new ?? "none");

        if (field === "status") {
            oldLabel = STATUS_LABELS[oldLabel] || oldLabel;
            newLabel = STATUS_LABELS[newLabel] || newLabel;
        } else if (field === "priority") {
            oldLabel = PRIORITY_LABELS[oldLabel] || oldLabel;
            newLabel = PRIORITY_LABELS[newLabel] || newLabel;
        } else if (field === "dueDate" || field === "startDate") {
            if (oldLabel === "null" || oldLabel === "undefined") oldLabel = "none";
            if (newLabel === "null" || newLabel === "undefined") newLabel = "none";
        } else if (field === "assigneeIds") {
            oldLabel = Array.isArray(change.old) ? `${change.old.length} assignee(s)` : oldLabel;
            newLabel = Array.isArray(change.new) ? `${change.new.length} assignee(s)` : newLabel;
        }

        return {
            field: FIELD_LABELS[field] || field,
            oldLabel,
            newLabel,
        };
    });
}

export function getEntityUrl(activity: { entityType: string; entityId: string; metadata?: any }): string | null {
    const { entityType, entityId, metadata } = activity;

    if (entityType === "task") {
        return null;
    }
    if (entityType === "project") {
        return `/projects`;
    }
    if (entityType === "board") {
        return `/boards`;
    }
    if (entityType === "comment" && metadata?.taskId) {
        return null;
    }

    return null;
}

export function getEntityRoute(activity: { entityType: string; entityId: string; metadata?: any }): string | null {
    const { entityType, metadata } = activity;

    if (entityType === "task" && metadata?.projectId) {
        return `/projects/${metadata.projectId}`;
    }
    if (entityType === "project") {
        return `/projects`;
    }
    if (entityType === "board") {
        return `/boards`;
    }
    if (entityType === "team") {
        return `/teams`;
    }

    return null;
}

export function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return dayNames[date.getDay()];
    }
    return dateFormat(date, "MMM d");
}
