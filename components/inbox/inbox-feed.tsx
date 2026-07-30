"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { InboxTab } from "./inbox-page";
import {
  Bell, Check, Search, Loader2, AlertTriangle,
  ArrowUpDown, RefreshCw,
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInView } from "react-intersection-observer";

interface InboxFeedProps {
  workspaceId: string;
  activeTab: InboxTab;
}

function getGroupLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return "Earlier This Week";
  if (isThisMonth(date)) return "Earlier This Month";
  return "Older";
}

export function InboxFeed({ workspaceId, activeTab }: InboxFeedProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const { ref, inView } = useInView();

  const filterMap: Record<string, string> = {
    all: "all",
    unread: "unread",
    assigned: "assigned",
    mentions: "mentions",
    replies: "replies",
    archived: "archived",
  };

  const apiFilter = filterMap[activeTab] || "all";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteQuery({
    queryKey: ["inbox", workspaceId, apiFilter, searchQuery],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        workspaceId,
        filter: apiFilter,
        skip: String(pageParam),
        take: "20",
      });
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalReturned = allPages.reduce((sum, p) => sum + p.notifications.length, 0);
      return lastPage.hasMore ? totalReturned : undefined;
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (inView && hasNextPage) fetchNextPage();
  }, [inView, hasNextPage, fetchNextPage]);

  const notifications = data?.pages.flatMap(page => page.notifications) || [];
  const unreadCount = data?.pages[0]?.unreadCount || 0;

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const res = await fetch(`/api/notifications?workspaceId=${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id, ...body }),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox", workspaceId] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notifications?workspaceId=${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", workspaceId] });
      toast.success("All marked as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications?workspaceId=${workspaceId}&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", workspaceId] });
      toast.success("Notification deleted");
    },
  });

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const n of notifications) {
      const label = getGroupLabel(new Date(n.createdAt));
      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    }
    const order = ["Today", "Yesterday", "Earlier This Week", "Earlier This Month", "Older"];
    return order.filter(g => groups[g]?.length).map(g => ({ label: g, items: groups[g] }));
  }, [notifications]);

  const PRIORITY_COLORS: Record<string, string> = {
    critical: "bg-red-500",
    medium: "bg-amber-500",
    low: "bg-slate-400",
  };

  function getIconForType(type: string) {
    const className = "h-5 w-5";
    const props: any = { className };
    switch (type) {
      case "task_assigned": return <UserPlusIcon {...props} />;
      case "task_mentioned":
      case "mention": return <AtSignIcon {...props} />;
      case "comment_reply":
      case "comment": return <MessageSquareIcon {...props} />;
      case "task_completed": return <CheckCircleIcon {...props} />;
      case "task_due_soon":
      case "reminder": return <ClockIcon {...props} />;
      case "task_overdue":
      case "deadline": return <AlertTriangle {...props} className={`${className} text-red-500`} />;
      case "task_status_changed": return <ArrowUpIcon {...props} />;
      case "priority_changed": return <ArrowDownIcon {...props} />;
      case "workspace_invite":
      case "member_joined": return <UserPlusIcon {...props} />;
      case "member_removed": return <UserMinusIcon {...props} />;
      case "project_created":
      case "project_updated": return <FolderIcon {...props} />;
      case "daily_summary":
      case "weekly_summary": return <SparklesIcon {...props} />;
      case "nova_suggestion": return <BrainIcon {...props} />;
      case "smart_alert":
      case "limit_warning": return <AlertTriangle {...props} />;
      default: return <Bell {...props} className={`${className} text-muted-foreground`} />;
    }
  }

  const quickActions = (n: any) => {
    const actions: { label: string; onClick: () => void; variant?: string }[] = [];

    if (!n.read) {
      actions.push({
        label: "Mark Read",
        onClick: () => updateMutation.mutate({ id: n.id, read: true }),
        variant: "ghost",
      });
    }

    if (n.metadata?.link) {
      actions.push({
        label: "Open",
        onClick: () => window.open(n.metadata.link, "_blank"),
        variant: "outline",
      });
    }

    if (n.metadata?.actions) {
      for (const action of n.metadata.actions) {
        actions.push({
          label: action.label,
          onClick: () => { if (action.href) window.open(action.href, "_blank"); },
          variant: action.variant === "primary" ? "default" : "outline",
        });
      }
    }

    actions.push({
      label: "Archive",
      onClick: () => updateMutation.mutate({ id: n.id, archived: true }),
      variant: "ghost",
    });

    return actions;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-5 sm:px-7 py-3 border-b border-border/30 bg-background/60">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[16px] font-semibold tracking-tight text-foreground/90">
              {activeTab === "all" ? "All" :
               activeTab === "unread" ? "Unread" :
               activeTab === "assigned" ? "Assigned to Me" :
               activeTab === "mentions" ? "Mentions" :
               activeTab === "replies" ? "Replies" :
               activeTab === "archived" ? "Archived" : "Inbox"}
            </h1>
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-[12px] bg-muted/60 rounded-lg border border-border/30 focus:outline-none focus:border-primary/30 focus:ring-[3px] focus:ring-primary/[0.06] transition-all placeholder:text-muted-foreground/30"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-all"
              title="Refresh"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetchingNextPage && "animate-spin")} />
            </button>
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={unreadCount === 0 || markAllReadMutation.isPending}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-all disabled:opacity-30"
            >
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 sm:px-7 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground/30">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive/60 mx-auto mb-3" />
            <p className="text-sm font-medium text-destructive">Failed to load</p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-4">There was an error fetching your inbox.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-muted-foreground/30" />
            </div>
            {searchQuery ? (
              <>
                <p className="text-sm font-medium text-muted-foreground/60">No results match your search.</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-primary mt-2 hover:underline"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground/60">
                  {activeTab === "all" && "You're all caught up."}
                  {activeTab === "unread" && "No unread activity."}
                  {activeTab === "assigned" && "No new assignments."}
                  {activeTab === "mentions" && "No one has mentioned you."}
                  {activeTab === "replies" && "No replies yet."}
                  {activeTab === "archived" && "No archived items."}
                </p>
                <p className="text-xs text-muted-foreground/40 mt-1">
                  {activeTab === "all" && "Everything that needs your attention will show up here."}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/40">
                    {group.label}
                  </h3>
                  <div className="flex-1 h-px bg-border/20" />
                </div>
                <div className="space-y-1">
                  {group.items.map((n: any) => {
                    const actions = quickActions(n);
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "group relative flex items-start gap-3.5 px-4 py-3.5 rounded-xl transition-all border",
                          !n.read
                            ? "bg-muted/25 border-border/40 hover:border-border/60"
                            : "bg-background border-transparent hover:border-border/30"
                        )}
                      >
                        {!n.read && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-full bg-primary" />
                        )}

                        <div className="h-9 w-9 rounded-[10px] bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                          {getIconForType(n.type)}
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className={cn(
                                "text-[13px] leading-snug",
                                !n.read ? "font-semibold text-foreground" : "text-foreground/70"
                              )}>
                                {n.title}
                              </span>
                              {n.message && (
                                <p className="text-[12px] text-muted-foreground/60 mt-0.5 line-clamp-2">
                                  {n.message}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {n.priority === "critical" && !n.read && (
                                <span className="text-[9px] font-semibold uppercase tracking-wider text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                                  Critical
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground/40 whitespace-nowrap">
                                {format(new Date(n.createdAt), "HH:mm")}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {actions.slice(0, 4).map((action, i) => (
                              <button
                                key={i}
                                onClick={action.onClick}
                                className={cn(
                                  "text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all",
                                  action.variant === "default"
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60"
                                )}
                              >
                                {action.label}
                              </button>
                            ))}
                            {actions.length > 4 && (
                              <span className="text-[10px] text-muted-foreground/40">+{actions.length - 4} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={ref} className="h-12 flex items-center justify-center">
              {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-primary/60" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserPlusIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>; }
function UserMinusIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>; }
function AtSignIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/></svg>; }
function MessageSquareIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>; }
function CheckCircleIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
function ClockIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function ArrowUpIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>; }
function ArrowDownIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>; }
function FolderIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>; }
function SparklesIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/></svg>; }
function BrainIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44 2.5 2.5 0 01-2.04-4.44 2.5 2.5 0 012.96-3.5A2.5 2.5 0 019.5 2z"/><path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44 2.5 2.5 0 002.04-4.44 2.5 2.5 0 00-2.96-3.5A2.5 2.5 0 0014.5 2z"/></svg>; }
