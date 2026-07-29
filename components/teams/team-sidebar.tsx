"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare, Users, BarChart3, Archive, Shield,
  Activity, Settings, UserPlus, ChevronLeft,
} from "lucide-react";

interface TeamSidebarProps {
  team: {
    id: string;
    name: string;
    description: string | null;
    _count?: { members: number };
    membersCount?: number;
  };
}

const tabs = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "members", label: "Members", icon: Users },
  { id: "projects", label: "Projects", icon: Archive },
  { id: "boards", label: "Boards", icon: Shield },
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "invites", label: "Invitations", icon: UserPlus },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

export function TeamSidebar({ team }: TeamSidebarProps) {
  const pathname = usePathname();
  const currentTab = pathname.split("/").pop() || "chat";

  return (
    <div className="flex flex-col h-full bg-background border-r border-border/30">
      <div className="px-4 pt-5 pb-4 border-b border-border/20">
        <Link href="/teams" className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-foreground/60 transition-colors mb-3">
          <ChevronLeft className="h-3 w-3" />
          All teams
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[10px] bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
            {team.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-foreground/90 truncate">{team.name}</h2>
            <p className="text-[10px] text-muted-foreground/40 mt-0.5">
              {(team as any).membersCount ?? team._count?.members ?? 0} members
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto no-scrollbar">
        {tabs.map(tab => {
          const isActive = currentTab === tab.id;
          const href = tab.id === "chat"
            ? `/teams/${team.id}`
            : `/teams/${team.id}/${tab.id}`;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[12px] font-medium transition-all",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground/50 hover:text-foreground/70 hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-border/20">
        <span className="text-[9px] text-muted-foreground/25">{team.name} · Theta</span>
      </div>
    </div>
  );
}
