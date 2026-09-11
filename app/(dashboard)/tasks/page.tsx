

"use client";

import { SharedTasksView } from "@/components/tasks/shared-tasks-view";
import { useWorkspace } from "@/hooks/use-workspace";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Tasks | Theta PM",
  description: "Manage all your tasks. Track progress, deadlines, and assignments.",
  path: "/(dashboard)/tasks",
});

export default function Page() {
  const { activeWorkspaceId } = useWorkspace();
  return <SharedTasksView workspaceId={activeWorkspaceId} />;
}

