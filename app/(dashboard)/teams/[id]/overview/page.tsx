"use client";

import { useQuery } from "@tanstack/react-query";
import { useTeam } from "@/components/teams/team-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Archive, Shield, Activity } from "lucide-react";

export default function TeamOverviewPage() {
  const team = useTeam();
  const { activeWorkspaceId } = useWorkspace();

  const { data: members } = useQuery({
    queryKey: ["team-members", team.id, activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${team.id}/members?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["team-projects", team.id],
    queryFn: async () => {
      const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}&teamId=${team.id}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const memberCount = members?.length || 0;
  const projectCount = projects?.length || 0;

  const stats = [
    { label: "Members", value: memberCount, icon: Users, color: "from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30", iconBg: "bg-indigo-100 dark:bg-indigo-900/50", iconColor: "text-indigo-600 dark:text-indigo-400" },
    { label: "Projects", value: projectCount, icon: Archive, color: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30", iconBg: "bg-emerald-100 dark:bg-emerald-900/50", iconColor: "text-emerald-600 dark:text-emerald-400" },
    { label: "Boards", value: 0, icon: Shield, color: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30", iconBg: "bg-amber-100 dark:bg-amber-900/50", iconColor: "text-amber-600 dark:text-amber-400" },
    { label: "Activities", value: 0, icon: Activity, color: "from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-pink-950/30", iconBg: "bg-violet-100 dark:bg-violet-900/50", iconColor: "text-violet-600 dark:text-violet-400" },
  ];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className={`bg-gradient-to-br ${s.color} border-border/20`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.iconBg}`}>
                  <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Team Info</CardTitle>
          <CardDescription className="text-xs">{team.description || "No description"}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
