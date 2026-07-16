"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import {
  Activity as ActivityIcon,
  CheckCircle2,
  MessageSquare,
  Plus,
  RefreshCcw,
  Trash2,
  ArrowRight,
  Loader2,
  Search,
  Filter,
  FileText,
  Upload,
  Link,
  Users,
  Settings,
  Bot,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInView } from "react-intersection-observer";
import { useEffect, useState, useMemo } from "react";

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  user?: { name: string; imageUrl?: string } | null;
  project?: { name: string } | null;
  metadata?: {
    entityName?: string;
    changes?: Record<string, { old: string; new: string }>;
    taskTitle?: string;
  };
}

interface ProjectActivityProps {
  projectId: string;
  workspaceId: string;
}

const ACTION_FILTERS = [
  { value: "all", label: "All Activity" },
  { value: "task", label: "Tasks" },
  { value: "comment", label: "Comments" },
  { value: "project", label: "Project" },
  { value: "member", label: "Members" },
  { value: "file", label: "Files" },
  { value: "ai", label: "Nova" },
  { value: "dependency", label: "Dependencies" },
] as const;

function getActionIcon(action: string, entityType: string) {
  const lower = action.toLowerCase();
  const entity = entityType?.toLowerCase();

  if (lower === "created") return <Plus className="h-4 w-4 text-emerald-500" />;
  if (lower === "deleted" || lower === "removed") return <Trash2 className="h-4 w-4 text-red-500" />;
  if (lower === "completed" || lower === "done") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (lower === "commented" || lower === "comment_created") return <MessageSquare className="h-4 w-4 text-blue-500" />;
  if (lower === "status_updated" || lower === "status_changed") return <RefreshCcw className="h-4 w-4 text-purple-500" />;
  if (entity === "ai" || lower.startsWith("nova")) return <Bot className="h-4 w-4 text-primary" />;
  if (entity === "comment") return <MessageSquare className="h-4 w-4 text-blue-500" />;
  if (entity === "file" || lower.includes("upload") || lower.includes("attachment")) return <Upload className="h-4 w-4 text-orange-500" />;
  if (entity === "dependency" || lower.includes("dependency")) return <Link className="h-4 w-4 text-cyan-500" />;
  if (entity === "team" || entity === "member") return <Users className="h-4 w-4 text-violet-500" />;
  if (entity === "project") return <Settings className="h-4 w-4 text-slate-500" />;
  return <ActivityIcon className="h-4 w-4 text-slate-400" />;
}

function formatActivityDescription(activity: ActivityItem): string {
  const entity = activity.metadata?.entityName || activity.entityType;
  const action = activity.action?.toLowerCase();

  switch (action) {
    case "created":
      return `created "${entity}"`;
    case "completed":
      return `completed "${entity}"`;
    case "deleted":
      return `deleted "${entity}"`;
    case "commented":
    case "comment_created":
      return `commented on "${entity}"`;
    case "status_updated":
    case "status_changed":
      return `updated status of "${entity}"`;
    case "assigned":
      return `assigned "${entity}"`;
    case "moved":
      return `moved "${entity}"`;
    default:
      return `${action} "${entity}"`;
  }
}

export function ProjectActivity({ projectId, workspaceId }: ProjectActivityProps) {
  const { ref, inView } = useInView();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["project-activity", projectId, workspaceId],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `/api/activity?workspaceId=${workspaceId}&projectId=${projectId}&skip=${pageParam}&take=50`
      );
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const currentCount = allPages.length * 50;
      return lastPage.hasMore ? currentCount : undefined;
    },
    enabled: !!workspaceId && !!projectId,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allActivities: ActivityItem[] = data?.pages.flatMap((page) => page.activities) || [];

  const filteredActivities = allActivities.filter((a) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        a.metadata?.entityName?.toLowerCase().includes(q) ||
        a.user?.name?.toLowerCase().includes(q) ||
        a.action?.toLowerCase().includes(q) ||
        a.entityType?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (actionFilter !== "all") {
      const entityType = a.entityType?.toLowerCase() || "";
      const action = a.action?.toLowerCase() || "";
      switch (actionFilter) {
        case "task":
          if (entityType !== "task") return false;
          break;
        case "comment":
          if (entityType !== "comment" && !action.includes("comment")) return false;
          break;
        case "project":
          if (entityType !== "project") return false;
          break;
        case "member":
          if (entityType !== "team" && entityType !== "member" && !action.includes("member")) return false;
          break;
        case "file":
          if (entityType !== "file" && !action.includes("upload") && !action.includes("attachment")) return false;
          break;
        case "ai":
          if (entityType !== "ai" && !action.startsWith("nova")) return false;
          break;
        case "dependency":
          if (entityType !== "dependency" && !action.includes("dependency")) return false;
          break;
      }
    }

    return true;
  });

  // Group activities by day
  const groupedActivities = useMemo(() => {
    const groups: { label: string; activities: ActivityItem[] }[] = [];
    let currentGroup: { label: string; activities: ActivityItem[] } | null = null;

    for (const activity of filteredActivities) {
      const activityDate = new Date(activity.createdAt);
      let label: string;
      if (isToday(activityDate)) {
        label = "Today";
      } else if (isYesterday(activityDate)) {
        label = "Yesterday";
      } else {
        label = format(activityDate, "EEEE, MMMM d");
      }

      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, activities: [] };
        groups.push(currentGroup);
      }
      currentGroup.activities.push(activity);
    }

    return groups;
  }, [filteredActivities]);

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-sm text-red-500">Failed to load activity. {(error as Error)?.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Project Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every event, every timestamp, every actor
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-semibold">
          {filteredActivities.length} events
        </Badge>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search activity..."
            className="h-9 pl-9 text-xs font-semibold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-9 w-40 text-xs font-semibold">
            <Filter className="h-3 w-3 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs font-semibold">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Activity feed grouped by day */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        {groupedActivities.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <ActivityIcon className="h-8 w-8 mb-3 opacity-30" />
            <span className="text-xs font-semibold">
              {allActivities.length === 0
                ? "No activity yet. Events will appear here as they happen."
                : "No activity matches your search."}
            </span>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedActivities.map((group) => (
              <div key={group.label}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-4 sticky top-0 z-10 bg-white dark:bg-slate-950 py-2">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Activities in this day */}
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-5 space-y-6">
                  {group.activities.map((activity) => (
                    <div key={activity.id} className="relative pl-10">
                      <div className="absolute -left-[17px] top-3 h-8 w-8 rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
                        {getActionIcon(activity.action, activity.entityType)}
                      </div>

                      <Card className="border-none shadow-sm bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-default">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={activity.user?.imageUrl} />
                                <AvatarFallback className="text-[10px]">
                                  {activity.user?.name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold">
                                  {activity.user?.name || "Unknown"}
                                  <span className="text-muted-foreground font-normal ml-1.5">
                                    {formatActivityDescription(activity)}
                                  </span>
                                </p>
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                  {activity.entityType}
                                </p>
                              </div>
                            </div>
                            <time className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                              {format(new Date(activity.createdAt), "h:mm a")}
                            </time>
                          </div>

                          {/* Change diffs */}
                          {activity.metadata?.changes && Object.keys(activity.metadata.changes).length > 0 && (
                            <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
                              {Object.entries(activity.metadata.changes).map(([field, values]) => (
                                <div key={field} className="flex items-center gap-2 text-[10px] font-bold">
                                  <span className="text-muted-foreground min-w-[80px]">{field}:</span>
                                  <span className="text-red-500 line-through opacity-60">
                                    {String((values as { old: string }).old)}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-slate-300 flex-shrink-0" />
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {String((values as { new: string }).new)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={ref} className="h-8 flex items-center justify-center">
          {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
      </div>
    </div>
  );
}


