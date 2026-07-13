"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { useRouter } from "next/navigation";
import {
    Activity as ActivityIcon,
    Search,
    Filter,
    User as UserIcon,
    FolderKanban,
    Download,
    Loader2,
    Clock,
    History,
    CheckCircle2,
    MessageSquare,
    Bot,
    Users,
    ChevronDown,
    ChevronRight,
    Zap,
} from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getActionConfig,
    getEntityIcon,
    formatActivityDescription,
    formatChanges,
    getEntityRoute,
    getRelativeTime,
    type ActivityMeta,
} from "@/lib/activity-helpers";

interface ActivityItem {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    entityName: string;
    createdAt: string;
    user?: { name: string; imageUrl?: string; email?: string } | null;
    project?: { id: string; name: string; color?: string } | null;
    metadata?: ActivityMeta;
}

interface ActivitySummary {
    totalToday: number;
    completedToday: number;
    commentsToday: number;
    aiToday: number;
    activeMembers: number;
}

interface ProjectItem {
    id: string;
    name: string;
}

interface MemberItem {
    id: string;
    name: string;
    imageUrl?: string;
}

function escapeCsvField(field: string): string {
    const str = String(field);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function SummaryCards({ summary }: { summary: ActivitySummary | undefined }) {
    if (!summary) return null;

    const cards = [
        { label: "Today's Activity", value: summary.totalToday, icon: ActivityIcon, color: "text-blue-500" },
        { label: "Completed", value: summary.completedToday, icon: CheckCircle2, color: "text-emerald-500" },
        { label: "Comments", value: summary.commentsToday, icon: MessageSquare, color: "text-amber-500" },
        { label: "AI Actions", value: summary.aiToday, icon: Bot, color: "text-violet-500" },
        { label: "Active Members", value: summary.activeMembers, icon: Users, color: "text-indigo-500" },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {cards.map((card) => (
                <Card key={card.label} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-muted/50 ${card.color}`}>
                            <card.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground">{card.value}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{card.label}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function ActivityCard({
    activity,
    router,
}: {
    activity: ActivityItem;
    router: any;
}) {
    const actionConfig = getActionConfig(activity.action);
    const ActionIcon = actionConfig.icon;
    const EntityIcon = getEntityIcon(activity.entityType);
    const description = formatActivityDescription(activity);
    const route = getEntityRoute(activity);
    const changes = activity.metadata?.changes
        ? formatChanges(activity.metadata.changes as Record<string, { old: unknown; new: unknown }>)
        : [];
    const isNova = activity.entityType === "ai" || activity.entityType === "AI_STREAM" || activity.entityType === "nova" ||
        activity.action.startsWith("nova_") || activity.action === "ai_generation" || activity.action === "STREAM_EVENT";

    const handleClick = () => {
        if (route) router.push(route);
    };

    return (
        <div className="relative group">
            <div className="absolute -left-[1.35rem] top-5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background z-10" />

            <Card
                className={`border shadow-sm transition-all duration-200 ${route ? "hover:border-primary/30 hover:shadow-md cursor-pointer" : "hover:border-muted"} ${isNova ? "border-violet-200 dark:border-violet-900/50 bg-violet-50/30 dark:bg-violet-900/10" : ""}`}
                onClick={handleClick}
            >
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg shrink-0 ${actionConfig.color}`}>
                            <ActionIcon className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3 mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="h-5 w-5 shrink-0">
                                        <AvatarImage src={activity.user?.imageUrl || ""} />
                                        <AvatarFallback className="text-[8px]">
                                            {activity.user?.name?.[0] || "S"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-foreground truncate">
                                        {activity.user?.name || "System"}
                                    </span>
                                    <span className="text-sm text-muted-foreground truncate">
                                        {description}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {activity.project && (
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] rounded-md px-1.5 py-0 h-4 font-medium"
                                            style={activity.project.color ? { borderColor: activity.project.color, color: activity.project.color } : {}}
                                        >
                                            {activity.project.name}
                                        </Badge>
                                    )}
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {getRelativeTime(activity.createdAt)}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">{format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>

                            {changes.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {changes.map((change, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1 text-[10px] bg-muted/60 rounded-md px-2 py-0.5"
                                        >
                                            <span className="font-medium text-muted-foreground">{change.field}:</span>
                                            <span className="text-red-500 line-through">{change.oldLabel}</span>
                                            <span className="text-muted-foreground">→</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{change.newLabel}</span>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {activity.metadata?.content && (
                                <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2 bg-muted/30 rounded-md px-2 py-1">
                                    &ldquo;{activity.metadata.content}&rdquo;
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function GroupedActivityCard({
    group,
    router,
}: {
    group: { action: string; entityType: string; items: ActivityItem[] };
    router: any;
}) {
    const [expanded, setExpanded] = useState(false);
    const actionConfig = getActionConfig(group.action);
    const ActionIcon = actionConfig.icon;
    const firstItem = group.items[0];
    const count = group.items.length;

    const descriptions = useMemo(() => {
        return group.items.map((item) => ({
            name: item.entityName || item.metadata?.taskTitle || item.metadata?.entityName || "Unknown",
            id: item.id,
        }));
    }, [group.items]);

    return (
        <div className="relative group">
            <div className="absolute -left-[1.35rem] top-5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background z-10" />

            <Card className="border shadow-sm hover:border-primary/30 transition-all duration-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg shrink-0 ${actionConfig.color}`}>
                            <ActionIcon className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="h-5 w-5 shrink-0">
                                        <AvatarImage src={firstItem.user?.imageUrl || ""} />
                                        <AvatarFallback className="text-[8px]">
                                            {firstItem.user?.name?.[0] || "S"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-foreground">
                                        {firstItem.user?.name || "System"}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {actionConfig.label.toLowerCase()} {count} {group.entityType}{count !== 1 ? "s" : ""}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {getRelativeTime(firstItem.createdAt)}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">{format(new Date(firstItem.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                                className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors font-medium"
                            >
                                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                {expanded ? "Collapse" : `Show ${count} items`}
                            </button>

                            {expanded && (
                                <div className="mt-2 space-y-1 pl-1 border-l-2 border-border/50 ml-0.5">
                                    {descriptions.map((desc) => (
                                        <p key={desc.id} className="text-[11px] text-muted-foreground truncate pl-2">
                                            {desc.name}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ActivityPage() {
    const { activeWorkspaceId } = useWorkspace();
    const router = useRouter();
    const { ref, inView } = useInView();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);

    const projectsQuery = useQuery({
        queryKey: ["workspace-projects", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!activeWorkspaceId,
    });

    const membersQuery = useQuery({
        queryKey: ["workspace-members", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!activeWorkspaceId,
    });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
    } = useInfiniteQuery({
        queryKey: ["activity-feed", activeWorkspaceId, searchQuery, selectedProject, selectedUser, selectedType],
        queryFn: async ({ pageParam }) => {
            let url = `/api/activity?workspaceId=${activeWorkspaceId}&skip=${pageParam}&take=30&includeSummary=true`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            if (selectedProject) url += `&projectId=${selectedProject}`;
            if (selectedUser) url += `&userId=${selectedUser}`;
            if (selectedType) url += `&entityType=${selectedType}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const currentCount = allPages.length * 30;
            return lastPage.hasMore ? currentCount : undefined;
        },
        enabled: !!activeWorkspaceId,
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const activities = useMemo<ActivityItem[]>(
        () => data?.pages.flatMap((page: any) => page.activities) || [],
        [data?.pages]
    );

    const summary = useMemo<ActivitySummary | undefined>(
        () => data?.pages[0]?.summary,
        [data?.pages]
    );

    const groupedByDay = useMemo(() => {
        const groups: { date: Date; items: ActivityItem[] }[] = [];
        activities.forEach((activity: ActivityItem) => {
            const date = startOfDay(new Date(activity.createdAt));
            const existingGroup = groups.find((g) => isSameDay(g.date, date));
            if (existingGroup) {
                existingGroup.items.push(activity);
            } else {
                groups.push({ date, items: [activity] });
            }
        });
        return groups;
    }, [activities]);

    const groupedActivities = useMemo(() => {
        const result: Array<
            | { type: "single"; activity: ActivityItem }
            | { type: "group"; group: { action: string; entityType: string; items: ActivityItem[] } }
        > = [];

        for (const dayGroup of groupedByDay) {
            const actionGroups = new Map<string, ActivityItem[]>();

            for (const item of dayGroup.items) {
                const key = `${item.action}:${item.user?.name || "system"}`;
                const existing = actionGroups.get(key);
                if (existing && existing.length < 8) {
                    existing.push(item);
                } else if (existing) {
                    existing.push(item);
                } else {
                    actionGroups.set(key, [item]);
                }
            }

            for (const [, items] of actionGroups) {
                if (items.length >= 3) {
                    result.push({
                        type: "group",
                        group: {
                            action: items[0].action,
                            entityType: items[0].entityType,
                            items,
                        },
                    });
                } else {
                    for (const item of items) {
                        result.push({ type: "single", activity: item });
                    }
                }
            }
        }

        return { dayGroups: groupedByDay, result };
    }, [groupedByDay]);

    const handleExport = useCallback(() => {
        const csvContent =
            "Date,User,Action,Entity,Entity Name,Project\n" +
            activities
                .map((a: ActivityItem) =>
                    [
                        escapeCsvField(format(new Date(a.createdAt), "yyyy-MM-dd HH:mm")),
                        escapeCsvField(a.user?.name || ""),
                        escapeCsvField(a.action),
                        escapeCsvField(a.entityType),
                        escapeCsvField(a.entityName || ""),
                        escapeCsvField(a.project?.name || "N/A"),
                    ].join(",")
                )
                .join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `theta_activity_${format(new Date(), "yyyy_MM_dd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [activities]);

    const entityTypeFilters = [
        { value: "tasks", label: "Tasks" },
        { value: "projects", label: "Projects" },
        { value: "boards", label: "Boards" },
        { value: "comments", label: "Comments" },
        { value: "members", label: "Members" },
        { value: "ai", label: "AI" },
        { value: "integrations", label: "Integrations" },
        { value: "documents", label: "Documents" },
        { value: "files", label: "Files" },
    ];

    return (
        <TooltipProvider>
            <div className="pb-10">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-foreground">Activity</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Everything happening across your workspace
                    </p>
                </div>

                {!isLoading && <SummaryCards summary={summary} />}

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, action, or entity..."
                            className="pl-9 h-9 text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                    <FolderKanban className="h-3 w-3 mr-1.5" />
                                    {selectedProject
                                        ? (projectsQuery.data?.projects as ProjectItem[] | undefined)?.find((p) => p.id === selectedProject)?.name || "Project"
                                        : "All Projects"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                <DropdownMenuItem onClick={() => setSelectedProject(null)}>All Projects</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {(projectsQuery.data?.projects as ProjectItem[] | undefined)?.map((p) => (
                                    <DropdownMenuItem key={p.id} onClick={() => setSelectedProject(p.id)}>
                                        {p.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                    <UserIcon className="h-3 w-3 mr-1.5" />
                                    {selectedUser
                                        ? (membersQuery.data as MemberItem[] | undefined)?.find((m) => m.id === selectedUser)?.name || "Member"
                                        : "All Members"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                <DropdownMenuItem onClick={() => setSelectedUser(null)}>All Members</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {(membersQuery.data as MemberItem[] | undefined)?.map((m) => (
                                    <DropdownMenuItem key={m.id} onClick={() => setSelectedUser(m.id)}>
                                        {m.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                    <Filter className="h-3 w-3 mr-1.5" />
                                    {selectedType
                                        ? entityTypeFilters.find((t) => t.value === selectedType)?.label || selectedType
                                        : "All Types"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                <DropdownMenuItem onClick={() => setSelectedType(null)}>All Types</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {entityTypeFilters.map((type) => (
                                    <DropdownMenuItem key={type.value} onClick={() => setSelectedType(type.value)}>
                                        {type.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport}>
                            <Download className="h-3 w-3 mr-1.5" />
                            Export
                        </Button>
                    </div>
                </div>

                <div className="space-y-8">
                    {isError ? (
                        <div className="text-center py-16 border rounded-lg">
                            <p className="text-sm text-red-500">Failed to load activity. {(error as Error)?.message}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                                Try Again
                            </Button>
                        </div>
                    ) : isLoading ? (
                        <div className="space-y-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="h-5 w-32" />
                                    <div className="flex gap-3 pl-4 border-l-2 border-border ml-2">
                                        <Skeleton className="h-3 w-3 rounded-full mt-2" />
                                        <Skeleton className="h-16 flex-1 rounded-lg" />
                                    </div>
                                    <div className="flex gap-3 pl-4 border-l-2 border-border ml-2">
                                        <Skeleton className="h-3 w-3 rounded-full mt-2" />
                                        <Skeleton className="h-16 flex-1 rounded-lg" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : groupedActivities.result.length > 0 ? (
                        groupedByDay.map((dayGroup) => {
                            const dayActivities = groupedActivities.result.filter((r) => {
                                if (r.type === "single") return isSameDay(new Date(r.activity.createdAt), dayGroup.date);
                                return isSameDay(new Date(r.group.items[0].createdAt), dayGroup.date);
                            });

                            return (
                                <div key={dayGroup.date.toISOString()}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Badge variant="outline" className="rounded-md px-3 py-1 text-xs font-medium">
                                            {isSameDay(dayGroup.date, new Date())
                                                ? "Today"
                                                : format(dayGroup.date, "MMMM dd, yyyy")}
                                        </Badge>
                                        <div className="flex-1 h-px bg-border" />
                                    </div>

                                    <div className="space-y-3 pl-4 border-l-2 border-border ml-2">
                                        {dayActivities.map((item) =>
                                            item.type === "single" ? (
                                                <ActivityCard
                                                    key={item.activity.id}
                                                    activity={item.activity}
                                                    router={router}
                                                />
                                            ) : (
                                                <GroupedActivityCard
                                                    key={`group-${item.group.items[0].id}`}
                                                    group={item.group}
                                                    router={router}
                                                />
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-16 border rounded-lg">
                            <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No activity found.</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters or search.</p>
                        </div>
                    )}

                    <div ref={ref} className="h-16 flex items-center justify-center">
                        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                        {!hasNextPage && activities.length > 0 && !isFetchingNextPage && (
                            <p className="text-xs text-muted-foreground">End of activity feed</p>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
