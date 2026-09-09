"use client";

import { SharedTasksView } from "@/components/tasks/shared-tasks-view";
import { useWorkspace } from "@/hooks/use-workspace";

export default function Page() {
  const { activeWorkspaceId } = useWorkspace();
  return <SharedTasksView workspaceId={activeWorkspaceId} />;
}

