import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Tasks | Theta PM",
  description: "Manage all tasks for this project.",
  path: "/(dashboard)/projects/[id]/tasks",
});

"use client";

import { SharedTasksView } from "@/components/tasks/shared-tasks-view";
import { useWorkspace } from "@/hooks/use-workspace";

export default function Page({ params }: { params: { id: string } }) {
  const { activeWorkspaceId } = useWorkspace();
  return <SharedTasksView workspaceId={activeWorkspaceId} projectId={params.id} />;
}
