"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, Info, LayoutList, Columns, CalendarDays, TrendingUp, GanttChart as GanttIcon, Activity as ActivityIcon, Settings, Users as UsersIcon, Calendar, Zap, Sliders, BarChart3 } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: Info, href: "overview" },
  { id: "tasks", label: "Tasks", icon: LayoutList, href: "tasks" },
  { id: "board", label: "Board", icon: Columns, href: "boards" },
  { id: "timeline", label: "Timeline", icon: Calendar, href: "timeline" },
  { id: "gantt", label: "Gantt", icon: GanttIcon, href: "gantt" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, href: "calendar" },
  { id: "team", label: "Team", icon: UsersIcon, href: "team" },
  { id: "automations", label: "Automations", icon: Zap, href: "automations" },
  { id: "reports", label: "Reports", icon: BarChart3, href: "reports" },
  { id: "analytics", label: "Analytics", icon: TrendingUp, href: "analytics" },
  { id: "activity", label: "Activity", icon: ActivityIcon, href: "activity" },
  { id: "fields", label: "Fields", icon: Sliders, href: "fields" },
  { id: "settings", label: "Settings", icon: Settings, href: "settings" },
];

function activeTabFromPath(pathname: string, projectId: string): string {
  const suffix = pathname.replace(`/projects/${projectId}`, "").replace(/^\//, "");
  if (!suffix) return "overview";
  const match = TABS.find(t => t.href === suffix);
  return match?.id || "overview";
}

export default function ProjectLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const pathname = usePathname();
  const { activeWorkspaceId } = useWorkspace();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", params.id, activeWorkspaceId],
    queryFn: async () => {
      const url = activeWorkspaceId ? `/api/projects/${params.id}?workspaceId=${activeWorkspaceId}` : `/api/projects/${params.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!params.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md border-subtle">
          <CardHeader className="text-center">
            <CardTitle className="text-base">Project not found</CardTitle>
            <CardDescription>The project you&apos;re looking for doesn&apos;t exist or has been deleted.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Link href="/projects"><Button variant="outline">Back to Projects</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeTab = activeTabFromPath(pathname, params.id);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-6 lg:px-8 py-4 border-b border-subtle sticky top-0 z-40 bg-background">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
                {project.visibility === "private" && (
                  <Badge variant="secondary" className="text-xs rounded-md px-2 py-0 h-5">Private</Badge>
                )}
                {project.visibility !== "private" && (
                  <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5">{project.visibility === "team_access" ? "Team" : "Workspace"}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">Created {new Date(project.createdAt).toLocaleDateString()}</p>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5 capitalize">{project.status || "Active"}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-4 -mb-4 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/projects/${params.id}/${tab.href}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap border-b-2",
                activeTab === tab.id
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/20"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
