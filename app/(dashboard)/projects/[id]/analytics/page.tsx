"use client";

import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { ProjectAnalytics } from "@/components/projects/project-analytics";

export default function Page({ params }: { params: { id: string } }) {
  const { activeWorkspaceId } = useWorkspace();
  const { data: project } = useQuery({
    queryKey: ["project", params.id, activeWorkspaceId],
    queryFn: async () => {
      const url = activeWorkspaceId ? `/api/projects/${params.id}?workspaceId=${activeWorkspaceId}` : `/api/projects/${params.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!params.id,
  });

  if (!project) return null;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg border-subtle">
        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Project Insights</h2>
          <p className="text-xs text-muted-foreground">Analytics and metrics for this project</p>
        </div>
        <Badge variant="outline" className="ml-auto text-xs rounded-md px-2 py-0 h-6 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          Live
        </Badge>
      </div>
      <ProjectAnalytics projectId={project.id} />
    </div>
  );
}
