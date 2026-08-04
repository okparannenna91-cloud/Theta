"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { ProjectAutomations } from "@/components/automations/project-automations";

export default function ProjectAutomationsPage({ params }: { params: { id: string } }) {
  const { activeWorkspaceId } = useWorkspace();

  if (!activeWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Select a workspace first</p>
      </div>
    );
  }

  return (
    <ProjectAutomations workspaceId={activeWorkspaceId} projectId={params.id} />
  );
}
