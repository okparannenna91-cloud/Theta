"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { TableView } from "@/components/table/table-view";
import { TaskDialog } from "@/components/tasks/task-dialog";

interface ProjectTableViewProps {
  projectId: string;
}

async function fetchProject(id: string, workspaceId: string | null) {
  const url = workspaceId ? `/api/projects/${id}?workspaceId=${workspaceId}` : `/api/projects/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

async function fetchProjectTasks(projectId: string, workspaceId: string) {
  const res = await fetch(`/api/tasks?workspaceId=${workspaceId}&projectId=${projectId}&includeSubtasks=1&limit=500`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export default function ProjectTableView({ projectId }: ProjectTableViewProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", projectId, activeWorkspaceId],
    queryFn: () => fetchProject(projectId, activeWorkspaceId),
    enabled: !!projectId,
  });

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", activeWorkspaceId, "project", projectId],
    queryFn: () => fetchProjectTasks(projectId, activeWorkspaceId!),
    enabled: !!projectId && !!activeWorkspaceId,
  });

  const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : Array.isArray(tasksData) ? tasksData : [];

  if (isLoading || !activeWorkspaceId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
        <div>
          <h1 className="text-lg font-semibold">{project?.name || "Project"} — Table</h1>
          <p className="text-xs text-muted-foreground">Spreadsheet-style task management</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <TableView
          tasks={tasks}
          workspaceId={activeWorkspaceId!}
          projectId={projectId}
          onSelectTask={(task) => { setSelectedTask(task); setIsDetailOpen(true); }}
        />
      </div>
      {selectedTask && (
        <TaskDialog
          task={selectedTask}
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedTask(null); }}
          workspaceId={activeWorkspaceId!}
        />
      )}
    </div>
  );
}