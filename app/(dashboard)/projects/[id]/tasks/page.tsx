"use client";

import { SharedTasksView } from "@/components/tasks/shared-tasks-view";
import { useWorkspace } from "@/hooks/use-workspace";

export default function Page({ params }: { params: { id: string } }) {
  const { activeWorkspaceId } = useWorkspace();
  return <SharedTasksView workspaceId={activeWorkspaceId} projectId={params.id} />;
}
