"use client";

import { useState, useMemo, useEffect } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import {
    Activity as ActivityIcon,
    Search,
    Filter,
    User as UserIcon,
    FolderKanban,
    Download,
    Loader2,
    Clock,
    History
} from "lucide-react";
import { format, formatDistanceToNow, isSameDay, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItem {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    user?: { name: string; imageUrl?: string } | null;
    project?: { name: string } | null;
    metadata?: { title?: string };
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

export default function ActivityPage() {
    const { activeWorkspaceId } = useWorkspace();
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
        enabled: !!activeWorkspaceId
    });

    const membersQuery = useQuery({
        queryKey: ["workspace-members", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!activeWorkspaceId
    });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error
    } = useInfiniteQuery({
        queryKey: ["activity-feed", activeWorkspaceId, searchQuery, selectedProject, selectedUser, selectedType],
        queryFn: async ({ pageParam }) => {
            let url = `/api/activity?workspaceId=${activeWorkspaceId}&skip=${pageParam}&take=20`;
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
            const currentCount = allPages.length * 20;
            return lastPage.hasMore ? currentCount : undefined;
        },
        enabled: !!activeWorkspaceId
    });

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);

    const activities = useMemo<ActivityItem[]>(
        () => data?.pages.flatMap(page => page.activities) || [],
        [data?.pages]
    );

    const groupedActivities = useMemo(() => {
        const groups: { date: Date; items: ActivityItem[] }[] = [];
        activities.forEach((activity: ActivityItem) => {
            const date = startOfDay(new Date(activity.createdAt));
            const existingGroup = groups.find(g => isSameDay(g.date, date));
            if (existingGroup) {
                existingGroup.items.push(activity);
            } else {
                groups.push({ date, items: [activity] });
            }
        });
        return groups;
    }, [activities]);

    const handleExport = () => {
        const csvContent = "Date,User,Action,Entity,Project\n" +
            activities.map((a: ActivityItem) =>
                [
                    escapeCsvField(format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm')),
                    escapeCsvField(a.user?.name || ''),
                    escapeCsvField(a.action),
                    escapeCsvField(a.entityType),
                    escapeCsvField(a.project?.name || 'N/A')
                ].join(",")
            ).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `theta_audit_log_${format(new Date(), 'yyyy_MM_dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="pb-10">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">Activity</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Historical action logs across the workspace
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search logs..."
                        className="pl-9 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs">
                                <FolderKanban className="h-3.5 w-3.5 mr-2" />
                                {selectedProject
                                    ? (projectsQuery.data?.projects as ProjectItem[] | undefined)?.find((p: ProjectItem) => p.id === selectedProject)?.name
                                    : "All Projects"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuItem onClick={() => setSelectedProject(null)}>All Projects</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {projectsQuery.isError ? (
                                <DropdownMenuItem disabled>Failed to load projects</DropdownMenuItem>
                            ) : (projectsQuery.data?.projects as ProjectItem[] | undefined)?.map((p: ProjectItem) => (
                                <DropdownMenuItem key={p.id} onClick={() => setSelectedProject(p.id)}>{p.name}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs">
                                <UserIcon className="h-3.5 w-3.5 mr-2" />
                                {selectedUser
                                    ? (membersQuery.data as MemberItem[] | undefined)?.find((m: MemberItem) => m.id === selectedUser)?.name
                                    : "All Users"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuItem onClick={() => setSelectedUser(null)}>All Users</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {membersQuery.isError ? (
                                <DropdownMenuItem disabled>Failed to load members</DropdownMenuItem>
                            ) : (membersQuery.data as MemberItem[] | undefined)?.map((m: MemberItem) => (
                                <DropdownMenuItem key={m.id} onClick={() => setSelectedUser(m.id)}>{m.name}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs">
                                <Filter className="h-3.5 w-3.5 mr-2" />
                                {selectedType ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : "All Types"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuItem onClick={() => setSelectedType(null)}>All Types</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {["task", "project", "document", "member", "system"].map(type => (
                                <DropdownMenuItem key={type} onClick={() => setSelectedType(type)}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleExport}>
                        <Download className="h-3.5 w-3.5 mr-2" />
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
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-20 w-full rounded-lg" />
                                <Skeleton className="h-20 w-full rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : groupedActivities.length > 0 ? (
                    groupedActivities.map((group) => (
                        <div key={group.date.toISOString()}>
                            <div className="flex items-center gap-3 mb-4">
                                <Badge variant="outline" className="rounded-md px-3 py-1 text-xs font-medium">
                                    {isSameDay(group.date, new Date()) ? "Today" : format(group.date, "MMMM dd, yyyy")}
                                </Badge>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            <div className="space-y-3 pl-4 border-l-2 border-border ml-2">
                                {group.items.map((activity: ActivityItem) => (
                                    <div key={activity.id} className="relative">
                                        <div className="absolute -left-[1.35rem] top-5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />

                                        <Card className="border shadow-sm hover:border-primary/30 transition-colors">
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-4">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={activity.user?.imageUrl} />
                                                        <AvatarFallback className="text-xs font-medium">{activity.user?.name?.[0]}</AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-4 mb-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-foreground">{activity.user?.name}</span>
                                                                <span className="text-sm text-muted-foreground">{activity.action}</span>
                                                                {activity.project && (
                                                                    <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5">
                                                                        {activity.project.name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {format(new Date(activity.createdAt), "hh:mm a")}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 rounded-lg bg-muted/30 p-3">
                                                            <p className="text-sm text-muted-foreground">
                                                                {activity.entityType}: {activity.entityId.slice(-8)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16 border rounded-lg">
                        <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No activity found. Try adjusting your filters.</p>
                    </div>
                )}

                <div ref={ref} className="h-16 flex items-center justify-center">
                    {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                </div>
            </div>
        </div>
    );
}
