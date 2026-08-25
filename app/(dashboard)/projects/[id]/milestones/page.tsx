"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { MilestonePanel } from "@/components/timeline/milestone-panel";

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

  if (!project || !activeWorkspaceId) return null;
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Milestones</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track key checkpoints and link related tasks for {project.name}
        </p>
      </div>
      <MilestonePanel projectId={params.id} workspaceId={activeWorkspaceId} />
    </div>
  );
}
