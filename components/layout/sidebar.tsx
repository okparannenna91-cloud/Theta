"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Check,
  Plus,
  Bot,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/hooks/use-workspace";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/ui/logo";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function NavItem({ href, icon: Icon, label, active, onClick }: { href: string; icon?: any; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors relative group",
        active
          ? "bg-accent/50 text-sidebar-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:rounded-full before:bg-primary"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-accent/30"
      )}
    >
      {Icon && <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground/80")} />}
      <span>{label}</span>
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
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { t } = useI18n();
  const { workspaces, activeWorkspaceId, switchWorkspace } = useWorkspace();
  const { user } = useUser();

  const activeWorkspace = workspaces?.find((w: any) => w.id === activeWorkspaceId);

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

  const closeMobile = () => setIsMobileOpen(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const projectSubNav = currentProjectId ? [
    { label: "Overview", href: `/projects/${currentProjectId}/overview` },
    { label: "Tasks", href: `/projects/${currentProjectId}/tasks` },
    { label: "Timeline", href: `/projects/${currentProjectId}/timeline` },
    { label: "Gantt", href: `/projects/${currentProjectId}/gantt` },
    { label: "Calendar", href: `/projects/${currentProjectId}/calendar` },
    { label: "Team", href: `/projects/${currentProjectId}/team` },
    { label: "Automations", href: `/projects/${currentProjectId}/automations` },
    { label: "Reports", href: `/projects/${currentProjectId}/reports` },
    { label: "Analytics", href: `/projects/${currentProjectId}/analytics` },
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
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex h-screen w-60 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out border-r border-sidebar-border",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-12 items-center px-3 border-b border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 w-full text-left group text-sm font-medium text-sidebar-foreground">
                <Logo size={16} href="/dashboard" priority linkClassName="gap-1.5" wordmarkClassName="text-sidebar-foreground text-sm font-semibold" />
                <span className="text-sidebar-muted mx-0.5">/</span>
                <span className="truncate">{activeWorkspace?.name || "Workspace"}</span>
                <ChevronDown className="h-3 w-3 text-sidebar-muted flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-56">
              <div className="px-2 py-1.5 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                Workspaces
              </div>
              {workspaces?.map((ws: any) => (
                <DropdownMenuItem
                  key={ws.id}
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => {
                    switchWorkspace(ws.id);
                    router.push("/dashboard");
                  }}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium flex-shrink-0",
                    ws.id === activeWorkspaceId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {ws.name?.charAt(0).toUpperCase() || "W"}
                  </div>
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.id === activeWorkspaceId && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-primary"
                onClick={() => router.push("/workspaces")}
              >
                <Plus className="h-4 w-4" />
                <span>Manage Workspaces</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} onClick={closeMobile} />
          <NavItem href="/my-tasks" icon={CheckSquare} label="My Tasks" active={isActive("/my-tasks")} onClick={closeMobile} />
          <NavItem href="/notifications" icon={Bell} label="Notifications" active={isActive("/notifications")} onClick={closeMobile} />

          <NavItem href="/projects" icon={LayoutList} label="Projects" active={isActive("/projects")} onClick={closeMobile} />

          {isProjectPage && currentProject && (
            <div className="ml-2 space-y-0.5 border-l border-sidebar-border pl-2">
              {projectSubNav.map((item) => (
                <ProjectSubItem key={item.href} href={item.href} label={item.label} active={pathname === item.href} onClick={closeMobile} />
              ))}
            </div>
          )}

          {projects && projects.length > 0 && !isProjectPage && (
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

          <NavItem href="/portfolio" icon={FolderKanban} label="Portfolio" active={isActive("/portfolio")} onClick={closeMobile} />
          <NavItem href="/teams" icon={Users} label="Teams" active={isActive("/teams")} onClick={closeMobile} />
        </nav>

        <div className="px-2 py-2 border-t border-sidebar-border space-y-0.5">
          <Link
            href="/settings"
            onClick={closeMobile}
            className={cn(
              "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors group",
              isActive("/settings") ? "bg-accent/50 text-sidebar-foreground font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-accent/30"
            )}
          >
            <Settings className="h-4 w-4 flex-shrink-0 text-sidebar-muted group-hover:text-sidebar-foreground/80 transition-colors" />
            <span>Settings</span>
          </Link>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "" } }))}
            className="flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-accent/30 group"
          >
            <Bot className="h-4 w-4 flex-shrink-0 text-sidebar-muted group-hover:text-sidebar-foreground/80 transition-colors" />
            <span>Ask Nova</span>
          </button>

          <Link
            href="/profile"
            onClick={closeMobile}
            className="flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-accent/30"
          >
            <UserButton afterSignOutUrl="/" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                {user?.fullName || "Profile"}
              </span>
              <span className="text-xs text-sidebar-muted truncate leading-tight">Profile</span>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
});
