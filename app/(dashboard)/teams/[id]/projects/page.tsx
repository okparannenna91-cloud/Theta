"use client";

import { useQuery } from "@tanstack/react-query";
import { useTeam } from "@/components/teams/team-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Archive } from "lucide-react";
import Link from "next/link";

export default function TeamProjectsPage() {
  const team = useTeam();
  const { activeWorkspaceId } = useWorkspace();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["team-projects", team.id],
    queryFn: async () => {
      const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}&teamId=${team.id}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>;
  }

  return (
    <div className="p-6 max-w-4xl space-y-4">
      {(!projects || projects.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30">
          <Archive className="h-10 w-10 mb-3" />
          <p className="text-sm">No projects in this team</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects?.map((p: any) => (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card className="rounded-2xl border-border/20 hover:border-border/60 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-[10px] bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {p.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-[9px] rounded-full capitalize border-border/30">
                    {p.status || "active"}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] rounded-full capitalize border-border/30">
                    {p.visibility || "workspace"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
