"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
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
  Upload,
  Link,
  Users,
  Settings,
  Zap,
  MinusCircle,
  UserPlus,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useInView } from "react-intersection-observer";
import { useEffect, useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

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

type FilterValue = "all" | "task" | "comment" | "project" | "member" | "file" | "automation" | "dependency";

const FILTERS: { value: FilterValue; label: string; dot?: string }[] = [
  { value: "all", label: "All" },
  { value: "task", label: "Tasks", dot: "bg-sky-500" },
  { value: "comment", label: "Comments", dot: "bg-blue-500" },
  { value: "project", label: "Project", dot: "bg-slate-400" },
  { value: "member", label: "Members", dot: "bg-violet-500" },
  { value: "file", label: "Files", dot: "bg-orange-500" },
  { value: "dependency", label: "Dependencies", dot: "bg-cyan-500" },
  { value: "automation", label: "Automation", dot: "bg-primary" },
];

const TYPE_META: Record<string, { label: string; chip: string; dot: string }> = {
  task: { label: "Task", chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400", dot: "bg-sky-500" },
  comment: { label: "Comment", chip: "bg-blue-500/10 text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  project: { label: "Project", chip: "bg-slate-500/10 text-slate-500", dot: "bg-slate-400" },
  member: { label: "Member", chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  file: { label: "File", chip: "bg-orange-500/10 text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  dependency: { label: "Dependency", chip: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500" },
  automation: { label: "Automation", chip: "bg-primary/10 text-primary", dot: "bg-primary" },
  other: { label: "Update", chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

function classifyActivity(a: ActivityItem): string {
  const entityType = a.entityType?.toLowerCase() || "";
  const action = a.action?.toLowerCase() || "";
  if (entityType === "task") return "task";
  if (entityType === "comment" || action.includes("comment")) return "comment";
  if (entityType === "project") return "project";
  if (entityType === "team" || entityType === "member" || action.includes("member")) return "member";
  if (entityType === "file" || action.includes("upload") || action.includes("attachment")) return "file";
  if (entityType === "dependency" || action.includes("dependency")) return "dependency";
  if (entityType === "ai" || action.startsWith("nova")) return "automation";
  return "other";
}

function getIconMeta(action: string, entityType: string): { Icon: LucideIcon; fg: string; bg: string } {
  const lower = action.toLowerCase();
  const entity = entityType?.toLowerCase();

  if (lower === "created" || lower === "added") return { Icon: Plus, fg: "text-emerald-500", bg: "bg-emerald-500/10" };
  if (lower === "deleted" || lower === "removed") return { Icon: Trash2, fg: "text-red-500", bg: "bg-red-500/10" };
  if (lower === "completed" || lower === "done") return { Icon: CheckCircle2, fg: "text-emerald-500", bg: "bg-emerald-500/10" };
  if (lower === "commented" || lower === "comment_created" || entity === "comment") return { Icon: MessageSquare, fg: "text-blue-500", bg: "bg-blue-500/10" };
  if (lower === "status_updated" || lower === "status_changed") return { Icon: RefreshCcw, fg: "text-purple-500", bg: "bg-purple-500/10" };
  if (lower === "assigned") return { Icon: UserPlus, fg: "text-violet-500", bg: "bg-violet-500/10" };
  if (lower === "unassigned") return { Icon: MinusCircle, fg: "text-slate-500", bg: "bg-slate-500/10" };
  if (entity === "ai" || lower.startsWith("nova")) return { Icon: Zap, fg: "text-primary", bg: "bg-primary/10" };
  if (entity === "file" || lower.includes("upload") || lower.includes("attachment")) return { Icon: Upload, fg: "text-orange-500", bg: "bg-orange-500/10" };
  if (entity === "dependency" || lower.includes("dependency")) return { Icon: Link, fg: "text-cyan-500", bg: "bg-cyan-500/10" };
  if (entity === "team" || entity === "member") return { Icon: Users, fg: "text-violet-500", bg: "bg-violet-500/10" };
  if (entity === "project") return { Icon: Settings, fg: "text-slate-500", bg: "bg-slate-500/10" };
  return { Icon: ActivityIcon, fg: "text-slate-400", bg: "bg-slate-400/10" };
}

function getActivityParts(activity: ActivityItem): { verb: string; entity: string } {
  const entity = activity.metadata?.entityName || activity.entityType || "item";
  const action = activity.action?.toLowerCase() || "updated";
  const verbMap: Record<string, string> = {
    created: "created",
    added: "added",
    completed: "completed",
    done: "completed",
    deleted: "deleted",
    removed: "removed",
    commented: "commented on",
    comment_created: "commented on",
    status_updated: "updated status of",
    status_changed: "updated status of",
    assigned: "assigned",
    unassigned: "unassigned",
    moved: "moved",
    uploaded: "uploaded",
    updated: "updated",
  };
  return { verb: verbMap[action] || action, entity };
}

function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d");
}

export function ProjectActivity({ projectId, workspaceId }: ProjectActivityProps) {
  const { ref, inView } = useInView();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const searchRef = useRef<HTMLInputElement>(null);

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

  // Linear-style keyboard shortcut: "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (e.key === "/" && tag !== "input" && tag !== "textarea") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const allActivities: ActivityItem[] = data?.pages.flatMap((page) => page.activities) || [];

  const counts = useMemo(() => {
    const tally: Record<string, number> = { all: allActivities.length };
    for (const a of allActivities) {
      const type = classifyActivity(a);
      tally[type] = (tally[type] || 0) + 1;
    }
    return tally;
  }, [allActivities]);

  const stats = useMemo(() => {
    let today = 0;
    for (const a of allActivities) {
      if (isToday(new Date(a.createdAt))) today++;
    }
    return { today };
  }, [allActivities]);

  const filteredActivities = useMemo(() => {
    return allActivities.filter((a) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          a.metadata?.entityName?.toLowerCase().includes(q) ||
          a.user?.name?.toLowerCase().includes(q) ||
          a.action?.toLowerCase().includes(q) ||
          a.entityType?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (filter !== "all" && classifyActivity(a) !== filter) return false;
      return true;
    });
  }, [allActivities, searchQuery, filter]);

  const groupedActivities = useMemo(() => {
    const groups: { label: string; activities: ActivityItem[] }[] = [];
    for (const activity of filteredActivities) {
      const activityDate = new Date(activity.createdAt);
      const label = formatDayLabel(activityDate);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.activities.push(activity);
      } else {
        groups.push({ label, activities: [activity] });
      }
    }
    return groups;
  }, [filteredActivities]);

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[240px]">
        <div className="text-center">
          <p className="text-sm font-medium text-red-500">Failed to load activity.</p>
          <p className="mt-1 text-xs text-muted-foreground">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-[10px]" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3.5 w-[240px]" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Activity</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {allActivities.length.toLocaleString()} events{" "}
            <span className="text-muted-foreground/50">·</span>{" "}
            {groupedActivities.length} day{groupedActivities.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground tabular-nums">
          <Clock className="h-3 w-3" />
          {stats.today} today
        </span>
      </div>

      {/* Filter toolbar */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const count = counts[f.value] || 0;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-xs font-medium transition-all duration-fast ease-out",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {f.dot && <span className={cn("h-1.5 w-1.5 rounded-full", f.dot)} />}
                {f.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "tabular-nums text-[10px] font-semibold",
                      active ? "text-background/60" : "text-muted-foreground/60"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative w-56 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            ref={searchRef}
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-full border-transparent bg-muted/60 pl-9 pr-7 text-xs font-medium placeholder:text-muted-foreground/60 focus-visible:bg-background focus-visible:ring-1"
          />
          {!searchQuery && (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border/60 bg-card px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground/60">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="mt-6 flex-1 overflow-y-auto pr-2 pb-10">
        {groupedActivities.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm">
              <ActivityIcon className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {allActivities.length === 0 ? "No activity yet" : "Nothing matches your search"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {allActivities.length === 0
                ? "Events will appear here as they happen."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {groupedActivities.map((group) => (
              <div key={group.label}>
                {/* Day header */}
                <div className="sticky top-0 z-10 -mx-2 mb-3.5 bg-background/80 px-2 py-2 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border/70" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {group.label}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground/50 tabular-nums">
                      {group.activities.length}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border/70" />
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative">
                  <div className="absolute left-[15px] top-2 bottom-0 w-px bg-border/60" />
                  <div className="space-y-3.5">
                    {group.activities.map((activity) => {
                      const type = classifyActivity(activity);
                      const meta = TYPE_META[type] || TYPE_META.other;
                      const iconMeta = getIconMeta(activity.action, activity.entityType);
                      const parts = getActivityParts(activity);
                      const changes = activity.metadata?.changes;
                      const hasChanges = changes && Object.keys(changes).length > 0;
                      return (
                        <div key={activity.id} className="relative pl-12">
                          <div
                            className={cn(
                              "absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-[10px] border shadow-sm transition-transform duration-fast ease-out",
                              iconMeta.bg,
                              "border-black/[0.04] dark:border-white/10"
                            )}
                          >
                            <iconMeta.Icon className={cn("h-4 w-4", iconMeta.fg)} />
                          </div>

                          <div className="group/item -mx-2 rounded-xl px-2 py-1.5 transition-colors duration-fast ease-out hover:bg-muted/40">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 min-w-0">
                                <Avatar className="mt-0.5 h-6 w-6 flex-shrink-0">
                                  <AvatarImage src={activity.user?.imageUrl} />
                                  <AvatarFallback className="text-[9px] font-semibold">
                                    {activity.user?.name?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-[13px] leading-snug text-foreground">
                                    <span className="font-semibold">{activity.user?.name || "Unknown"}</span>{" "}
                                    <span className="text-muted-foreground">{parts.verb}</span>{" "}
                                    <span className="font-semibold underline-offset-2 hover:underline decoration-primary/40">
                                      {parts.entity}
                                    </span>
                                  </p>
                                  <div className="mt-1 flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                                        meta.chip
                                      )}
                                    >
                                      {meta.label}
                                    </span>
                                    <time className="text-[10px] tabular-nums text-muted-foreground/60">
                                      {format(new Date(activity.createdAt), "h:mm a")}
                                    </time>
                                  </div>
                                </div>
                              </div>
                              <span
                                className={cn(
                                  "mt-2 hidden h-1.5 w-1.5 flex-shrink-0 rounded-full sm:block",
                                  meta.dot
                                )}
                              />
                            </div>

                            {/* Change diffs */}
                            {hasChanges && (
                              <div className="mt-2.5 ml-9 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
                                <div className="border-b border-border/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Changes
                                </div>
                                <div className="divide-y divide-border/40">
                                  {Object.entries(changes).map(([field, values]) => (
                                    <div key={field} className="flex items-center gap-2 px-3 py-2 text-[11px]">
                                      <span className="w-24 flex-shrink-0 truncate font-medium text-muted-foreground">
                                        {field}
                                      </span>
                                      <span className="font-mono text-red-500 line-through decoration-red-400/50 opacity-70">
                                        {String((values as { old: string }).old)}
                                      </span>
                                      <ArrowRight className="h-3 w-3 flex-shrink-0 text-border" />
                                      <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                        {String((values as { new: string }).new)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={ref} className="flex h-10 items-center justify-center">
          {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {!hasNextPage && allActivities.length > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              You&apos;re all caught up
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
