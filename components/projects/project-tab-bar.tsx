"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListTodo,
  Columns3,
  CalendarDays,
  Users,
  Activity,
  Settings,
  Milestone,
  GanttChartSquare,
  Zap,
  Database,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const coreTabs = [
  { label: "Overview", href: "overview", icon: LayoutDashboard },
  { label: "Tasks", href: "tasks", icon: ListTodo },
  { label: "Kanban", href: "kanban", icon: Columns3 },
  { label: "Timeline", href: "timeline", icon: Milestone },
  { label: "Calendar", href: "calendar", icon: CalendarDays },
  { label: "Team", href: "team", icon: Users },
  { label: "Activity", href: "activity", icon: Activity },
];

const overflowTabs = [
  { label: "Gantt", href: "gantt", icon: GanttChartSquare },
  { label: "Automations", href: "automations", icon: Zap },
  { label: "Fields", href: "fields", icon: Database },
  { label: "Settings", href: "settings", icon: Settings },
];

interface ProjectTabBarProps {
  projectId: string;
}

export function ProjectTabBar({ projectId }: ProjectTabBarProps) {
  const pathname = usePathname();
  const currentTab = pathname.split("/").pop() || "overview";
  const [overflowOpen, setOverflowOpen] = useState(false);

  const isOverflowActive = overflowTabs.some(t => t.href === currentTab);

  return (
    <div className="sticky top-[53px] z-30 bg-background/40 backdrop-blur-2xl border-b border-border/10">
      <div className="px-8 lg:px-10">
        <nav className="flex items-center gap-0 -mb-px overflow-x-auto scrollbar-none">
          {coreTabs.map((tab) => {
            const isActive = currentTab === tab.href;
            const href = tab.href === "overview"
              ? `/projects/${projectId}`
              : `/projects/${projectId}/${tab.href}`;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-medium whitespace-nowrap transition-all rounded-t-sm",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground/35 hover:text-foreground/60 hover:bg-accent/15"
                )}
              >
                <Icon className={cn("h-3 w-3", isActive ? "text-primary" : "text-muted-foreground/20")} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full bg-primary/80" />
                )}
              </Link>
            );
          })}

          <DropdownMenu open={overflowOpen} onOpenChange={setOverflowOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "relative flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-medium whitespace-nowrap transition-all rounded-t-sm",
                  isOverflowActive
                    ? "text-foreground"
                    : "text-muted-foreground/35 hover:text-foreground/60 hover:bg-accent/15"
                )}
              >
                <MoreHorizontal className="h-3 w-3" />
                <span>More</span>
                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground/30" />
                {isOverflowActive && (
                  <span className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full bg-primary/80" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-44 rounded-xl border-border/20 bg-background/80 backdrop-blur-2xl shadow-lg"
            >
              {overflowTabs.map((tab) => {
                const isActive = currentTab === tab.href;
                const Icon = tab.icon;
                const href = `/projects/${projectId}/${tab.href}`;
                return (
                  <DropdownMenuItem
                    key={tab.href}
                    asChild
                    className={cn(
                      "text-xs font-medium rounded-lg",
                      isActive && "bg-accent/30 text-foreground font-semibold"
                    )}
                  >
                    <Link href={href} className="flex items-center gap-2.5">
                      <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground/40")} />
                      <span>{tab.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </div>
  );
}
