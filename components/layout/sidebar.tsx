"use client";

import { memo, useState, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
   LayoutDashboard,
   CheckSquare,
   Bell,
   FolderKanban,
   LayoutList,
   Users,
   Settings,
   Menu,
   X,
   ChevronDown,
     CreditCard,
     Mail,
     AtSign,
     UserCheck,
     MessageSquare,
     Archive,
     Blocks,
     ChevronsLeft,
     ChevronsRight,
   } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/hooks/use-workspace";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/ui/logo";
import { useQuery } from "@tanstack/react-query";

function NavItem({ href, icon: Icon, label, active, onClick, collapsed }: { href: string; icon?: any; label: string; active?: boolean; onClick?: () => void; collapsed?: boolean }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors relative group",
        collapsed && "justify-center px-0",
        active
          ? "bg-accent/50 text-sidebar-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:rounded-full before:bg-primary"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-accent/30"
      )}
    >
      {Icon && <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground/80")} />}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function ProjectSubItem({ href, label, active, onClick }: { href: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-1 rounded-md text-sm transition-colors",
        active
          ? "text-sidebar-foreground font-medium bg-accent/40"
          : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-accent/20"
      )}
    >
      <span className="h-1 w-1 rounded-full bg-sidebar-muted flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [inboxExpanded, setInboxExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("theta_sidebar_collapsed", String(next)); } catch {}
      return next;
    });
    setIsPeeking(false);
  }, []);

  const startPeek = useCallback(() => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setIsPeeking(true), 150);
  }, []);

  const stopPeek = useCallback(() => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setIsPeeking(false), 200);
  }, []);

  useEffect(() => {
    return () => {
      if (peekTimer.current) clearTimeout(peekTimer.current);
    };
  }, []);

  const toggleInbox = useCallback(() => {
    setInboxExpanded(prev => {
      const next = !prev;
      try { localStorage.setItem("sidebar_inbox_expanded", String(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sidebar_inbox_expanded") : null;
    if (stored === "true" || pathname.startsWith("/inbox")) {
      setInboxExpanded(true);
    }
    const collapsedStored = typeof window !== "undefined" ? localStorage.getItem("theta_sidebar_collapsed") : null;
    if (collapsedStored === "true") {
      setCollapsed(true);
    }
  }, []);
  const { t } = useI18n();
  const { workspaces, activeWorkspaceId } = useWorkspace();
  const { user } = useUser();

  const activeWorkspace = workspaces?.find((w: any) => w.id === activeWorkspaceId);

  const expanded = !collapsed || isPeeking || isMobileOpen;

  const projectIdMatch = pathname.match(/^\/projects\/([a-zA-Z0-9-]+)/);
  const currentProjectId = projectIdMatch?.[1] || null;
  const isProjectPage = !!currentProjectId;

  const { data: projects } = useQuery({
    queryKey: ["sidebar-projects", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}&limit=50`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeWorkspaceId,
    staleTime: 60000,
  });

  const { data: currentProject } = useQuery({
    queryKey: ["sidebar-project", currentProjectId, activeWorkspaceId],
    queryFn: async () => {
      if (!currentProjectId) return null;
      const url = activeWorkspaceId ? `/api/projects/${currentProjectId}?workspaceId=${activeWorkspaceId}` : `/api/projects/${currentProjectId}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!currentProjectId && !!activeWorkspaceId,
    staleTime: 60000,
  });

  const { data: inboxCounts } = useQuery({
    queryKey: ["inbox-counts", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return {};
      const res = await fetch(`/api/notifications/counts?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: dmConversations } = useQuery({
    queryKey: ["sidebar-dm-unread", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await fetch(`/api/chat/dm/conversations?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.conversations ?? [];
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const dmUnreadCount = useMemo(
    () => (dmConversations ?? []).reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0),
    [dmConversations]
  );

  const closeMobile = () => setIsMobileOpen(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const projectSubNav = currentProjectId ? [
    { label: "Overview", href: `/projects/${currentProjectId}/overview` },
    { label: "Tasks", href: `/projects/${currentProjectId}/tasks` },
    // { label: "Table", href: `/projects/${currentProjectId}/table` }, // V2
    { label: "Kanban", href: `/projects/${currentProjectId}/kanban` },
    { label: "Timeline", href: `/projects/${currentProjectId}/timeline` },
    { label: "Gantt", href: `/projects/${currentProjectId}/gantt` },
    { label: "Calendar", href: `/projects/${currentProjectId}/calendar` },
    { label: "Team", href: `/projects/${currentProjectId}/team` },
    { label: "Automations", href: `/projects/${currentProjectId}/automations` },
    { label: "Activity", href: `/projects/${currentProjectId}/activity` },
    { label: "Fields", href: `/projects/${currentProjectId}/fields` },
    { label: "Settings", href: `/projects/${currentProjectId}/settings` },
  ] : [];

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-subtle h-14 flex items-center justify-between px-4">
        <Logo size="sm" href="/dashboard" priority />
        <div className="flex items-center gap-2">
          <UserButton />
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-md hover:bg-secondary"
            aria-label="Toggle menu"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        onMouseEnter={() => { if (collapsed && !isMobileOpen) startPeek(); }}
        onMouseLeave={() => { if (isPeeking) stopPeek(); }}
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex h-screen w-60 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out border-r border-sidebar-border/50",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          expanded ? "" : "lg:w-14",
          isPeeking && "lg:absolute lg:z-[60] lg:shadow-2xl"
        )}
      >
        <div className="border-b border-sidebar-border px-3 py-3 space-y-2.5">
          <Link
            href="/dashboard"
            onClick={closeMobile}
            className={cn("flex items-center px-1", !expanded && "justify-center px-0")}
          >
            <Logo size={24} priority showWordmark={expanded} linkClassName="gap-2" wordmarkClassName="text-sidebar-foreground text-sm font-semibold" />
          </Link>
          {expanded && (
            <Link
              href="/workspaces"
              onClick={closeMobile}
              className="flex items-center gap-2 w-full text-left group text-sm font-medium text-sidebar-foreground rounded-lg bg-accent/25 hover:bg-accent/40 transition-colors px-2.5 py-2"
            >
              <span className="truncate">{activeWorkspace?.name || "Workspace"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-sidebar-muted flex-shrink-0 ml-auto" />
            </Link>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} onClick={closeMobile} collapsed={!expanded} />
          <NavItem href="/my-tasks" icon={CheckSquare} label="My Tasks" active={isActive("/my-tasks")} onClick={closeMobile} collapsed={!expanded} />
          <div>
            <button
              onClick={() => { if (!expanded) { router.push("/inbox?tab=all"); } else { toggleInbox(); } }}
              title={!expanded ? "Inbox" : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors relative group",
                !expanded && "justify-center px-0",
                isActive("/inbox")
                  ? "bg-accent/50 text-sidebar-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:rounded-full before:bg-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-accent/30"
              )}
            >
              <Bell className={cn("h-4 w-4 flex-shrink-0", isActive("/inbox") ? "text-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground/80")} />
              {expanded && <span className="flex-1 text-left">Inbox</span>}
              {expanded && (
                <ChevronDown className={cn(
                  "h-3 w-3 text-sidebar-muted transition-transform duration-200",
                  inboxExpanded && "rotate-180"
                )} />
              )}
            </button>
            {expanded && inboxExpanded && (
              <div className="ml-2 space-y-0.5 border-l border-sidebar-border pl-2 mt-0.5">
                {[
                  { id: "all", label: "All", icon: Bell },
                  { id: "unread", label: "Unread", icon: Mail },
                  { id: "assigned", label: "Assigned", icon: UserCheck },
                  { id: "mentions", label: "Mentions", icon: AtSign },
                  { id: "replies", label: "Replies", icon: MessageSquare },
                  { id: "direct-messages", label: "Direct Messages", icon: MessageSquare },
                  { id: "archived", label: "Archived", icon: Archive },
                ].map(item => {
                  const isActiveItem = pathname === "/inbox" && (searchParams.get("tab") || "all") === item.id;
                  const count = item.id === "direct-messages"
                    ? dmUnreadCount
                    : (inboxCounts as any)?.[item.id] ?? 0;
                  return (
                    <Link
                      key={item.id}
                      href={`/inbox?tab=${item.id}`}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-3 px-3 py-1 rounded-md text-sm transition-colors",
                        isActiveItem
                          ? "text-sidebar-foreground font-medium bg-accent/40"
                          : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-accent/20"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5 text-sidebar-muted flex-shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count > 0 && (
                        <span className="text-[10px] font-semibold tabular-nums bg-primary/15 text-primary px-1.5 py-0.5 rounded-full leading-none">
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <NavItem href="/projects" icon={LayoutList} label="Projects" active={isActive("/projects")} onClick={closeMobile} collapsed={!expanded} />

          {expanded && isProjectPage && currentProject && (
            <div className="ml-2 space-y-0.5 border-l border-sidebar-border pl-2">
              {projectSubNav.map((item) => (
                <ProjectSubItem key={item.href} href={item.href} label={item.label} active={pathname === item.href} onClick={closeMobile} />
              ))}
            </div>
          )}

          {expanded && projects && projects.length > 0 && !isProjectPage && (
            <>
              {projects.slice(0, 8).map((p: any) => (
                <NavItem key={p.id} href={`/projects/${p.id}`} label={p.name} active={pathname === `/projects/${p.id}` || pathname.startsWith(`/projects/${p.id}/`)} onClick={closeMobile} />
              ))}
              {projects.length > 8 && (
                <Link
                  href="/projects"
                  onClick={closeMobile}
                  className="flex items-center gap-3 px-3 py-1 text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors"
                >
                  View all {projects.length} projects
                </Link>
              )}
            </>
          )}

          <NavItem href="/portfolio" icon={FolderKanban} label="Portfolio" active={isActive("/portfolio")} onClick={closeMobile} collapsed={!expanded} />

          <NavItem href="/teams" icon={Users} label="Teams" active={isActive("/teams")} onClick={closeMobile} collapsed={!expanded} />
          <NavItem href="/apps" icon={Blocks} label="Apps" active={isActive("/apps")} onClick={closeMobile} collapsed={!expanded} />
          <NavItem href="/billing" icon={CreditCard} label="Billing" active={isActive("/billing")} onClick={closeMobile} collapsed={!expanded} />
         </nav>

        <div className="px-2 py-2 border-t border-sidebar-border space-y-0.5">
          <Link
            href="/settings"
            onClick={closeMobile}
            title={!expanded ? "Settings" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors group",
              !expanded && "justify-center px-0",
              isActive("/settings") ? "bg-accent/50 text-sidebar-foreground font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-accent/30"
            )}
          >
            <Settings className="h-4 w-4 flex-shrink-0 text-sidebar-muted group-hover:text-sidebar-foreground/80 transition-colors" />
            {expanded && <span>Settings</span>}
          </Link>

          <Link
            href="/profile"
            onClick={closeMobile}
            title={!expanded ? "Profile" : undefined}
            className={cn("flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-accent/30", !expanded && "justify-center px-0")}
          >
            <UserButton afterSignOutUrl="/" />
            {expanded && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                  {user?.fullName || "Profile"}
                </span>
                <span className="text-xs text-sidebar-muted truncate leading-tight">Profile</span>
              </div>
            )}
          </Link>

          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-1 rounded-md border-t border-sidebar-border text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-accent/30 transition-colors"
          >
            {expanded ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
});
