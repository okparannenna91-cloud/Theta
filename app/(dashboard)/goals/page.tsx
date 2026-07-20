"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import GoalDashboard from "@/components/goals/goal-dashboard";

export default function GoalsPage() {
  const { activeWorkspaceId } = useWorkspace();
  return (
    <div className="h-full overflow-y-auto">
      <GoalDashboard workspaceId={activeWorkspaceId || ""} />
    </div>
  );
}
