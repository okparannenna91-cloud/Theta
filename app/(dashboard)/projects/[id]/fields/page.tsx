"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import dynamic from "next/dynamic";
import { Database, Layers } from "lucide-react";

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
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Custom Fields</h2>
          <p className="text-sm text-muted-foreground">
            Define custom data fields for tasks in this project. They appear on task cards in Kanban and in the task detail dialog.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 border border-border/40 rounded-lg px-3 py-2 bg-muted/20 w-fit">
        <Layers className="h-3.5 w-3.5 text-primary/70" />
        <span>
          Field values are editable in the task dialog, shown on Kanban cards, and available to filters, automations and exports.
        </span>
      </div>

      {board && <CustomFieldsEditor boardId={board.id} workspaceId={project.workspaceId} />}
    </div>
  );
}
