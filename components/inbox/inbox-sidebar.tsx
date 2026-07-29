"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { InboxTab } from "./inbox-page";
import {
  Bell, AtSign, UserCheck, MessageSquare, Mail, Archive, X,
} from "lucide-react";

interface InboxSidebarProps {
  activeTab: InboxTab;
  onTabChange: (tab: InboxTab) => void;
  workspaceId?: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const TABS: { id: InboxTab; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All", icon: Bell },
  { id: "unread", label: "Unread", icon: Mail },
  { id: "assigned", label: "Assigned to Me", icon: UserCheck },
  { id: "mentions", label: "Mentions", icon: AtSign },
  { id: "replies", label: "Replies", icon: MessageSquare },
  { id: "direct-messages", label: "Direct Messages", icon: MessageSquare },
  { id: "archived", label: "Archived", icon: Archive },
];

export function InboxSidebar({ activeTab, onTabChange, workspaceId, mobileOpen, onMobileClose }: InboxSidebarProps) {
  const { data } = useQuery({
    queryKey: ["notifications-counts", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?workspaceId=${workspaceId}&filter=all&take=1`);
      if (!res.ok) return {};
      const d = await res.json();
      return { unreadCount: d.unreadCount ?? 0 };
    },
    enabled: !!workspaceId,
    refetchInterval: 30_000,
  });

  const unreadCount = data?.unreadCount ?? 0;

  const getBadge = (tab: InboxTab): number | null => {
    switch (tab) {
      case "all": return unreadCount > 0 ? unreadCount : null;
      case "unread": return unreadCount > 0 ? unreadCount : null;
      default: return null;
    }
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Inbox</h2>
        <button
          onClick={onMobileClose}
          className="md:hidden h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-2 py-1">
        {TABS.map(tab => {
          const badge = getBadge(tab.id);
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-[13px]",
                activeTab === tab.id
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 shrink-0",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground/40"
              )} />
              <span className="flex-1 truncate">{tab.label}</span>
              {badge !== null && (
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80 text-muted-foreground/60"
                )}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground/40 text-center">
          Stay updated with everything that needs your attention.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-border/40 bg-background">
        {sidebar}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onMobileClose} />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-background border-r border-border/40 shadow-xl animate-in slide-in-from-left">
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
}
