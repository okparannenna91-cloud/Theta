"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { ProjectOverview } from "@/components/projects/project-overview";

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
  return <ProjectOverview project={project} />;
}
