"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import dynamic from "next/dynamic";

const CustomFieldsEditor = dynamic(() => import("@/components/boards/custom-fields-editor"), { ssr: false });

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

  const { data: board } = useQuery({
    queryKey: ["project-board", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${params.id}/board`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!params.id,
  });

  if (!project) return null;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Custom Fields</h2>
        <p className="text-sm text-muted-foreground">Define custom data fields for tasks in this project</p>
      </div>
      {board && <CustomFieldsEditor boardId={board.id} workspaceId={project.workspaceId} />}
    </div>
  );
}
