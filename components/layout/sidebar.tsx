"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Bell,
  Settings,
  User,
  Menu,
  X,
  LayoutList,
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { t } = useI18n();
  const { workspaces, activeWorkspaceId, switchWorkspace } = useWorkspace();
  const { user } = useUser();

  const navigation = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("notifications"), href: "/notifications", icon: Bell },
    { name: "My Tasks", href: "/my-tasks", icon: CheckSquare },
    { name: t("portfolio"), href: "/portfolio", icon: FolderKanban },
    { name: t("projects"), href: "/projects", icon: LayoutList },
    { name: "Teams", href: "/teams", icon: Users },
    { name: t("settings"), href: "/settings", icon: Settings },
  ];

  const activeWorkspace = workspaces?.find((w: any) => w.id === activeWorkspaceId);

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b h-14 flex items-center justify-between px-4">
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
          "fixed lg:static inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center px-5 border-b border-sidebar-border">
          <Logo size="sm" href="/dashboard" container priority linkClassName="gap-2.5" wordmarkClassName="text-sidebar-foreground" />
        </div>

        <div className="px-3 py-3 border-b border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-sm text-sidebar-foreground">
                <span className="truncate font-medium">
                  {activeWorkspace?.name || "Select workspace"}
                </span>
                <ChevronDown className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
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
                    {ws.name.charAt(0).toUpperCase()}
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

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <div className="space-y-0.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary/20 text-primary-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive ? "text-primary-foreground" : "text-sidebar-muted"
                  )} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-sidebar-border pt-2 px-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "" } }))}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5"
          >
            <Bot className="h-4 w-4 flex-shrink-0 text-sidebar-muted" />
            <span>Ask Nova</span>
          </button>
        </div>

        <div className="p-3 border-t border-sidebar-border">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors"
          >
            <UserButton afterSignOutUrl="/" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.fullName || "Profile"}
              </span>
              <span className="text-xs text-sidebar-muted truncate">
                {t("profile")}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
});
