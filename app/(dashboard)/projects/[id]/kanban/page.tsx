"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import KanbanBoard from "@/components/boards/kanban-board";

async function fetchProject(id: string, workspaceId: string | null) {
  const url = workspaceId ? `/api/projects/${id}?workspaceId=${workspaceId}` : `/api/projects/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

async function fetchBoards(workspaceId: string | null) {
  const url = workspaceId ? `/api/boards?workspaceId=${workspaceId}` : "/api/boards";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch boards");
  return res.json();
}

export default function Page({ params }: { params: { id: string } }) {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", params.id, activeWorkspaceId],
    queryFn: () => fetchProject(params.id, activeWorkspaceId),
    enabled: !!params.id,
  });

  const { data: boardsData, isLoading } = useQuery({
    queryKey: ["boards", activeWorkspaceId],
    queryFn: () => fetchBoards(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const boards = Array.isArray(boardsData?.boards) ? boardsData.boards : Array.isArray(boardsData) ? boardsData : [];
  const projectBoard = boards.find((b: any) => b.projectId === params.id);

  const createBoard = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${project?.name || "Project"} Board`,
          projectId: params.id,
          workspaceId: activeWorkspaceId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create board");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", activeWorkspaceId] });
    },
  });

  useEffect(() => {
    if (!isLoading && !projectBoard && !createBoard.isPending && activeWorkspaceId) {
      createBoard.mutate();
    }
  }, [isLoading, projectBoard, createBoard.isPending, activeWorkspaceId]);

  if (isLoading || !activeWorkspaceId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] rounded-lg" />
      </div>
    );
  }

  if (!projectBoard && createBoard.isPending) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center space-y-3">
          <Skeleton className="h-8 w-48 mx-auto" />
          <p className="text-sm text-muted-foreground">Setting up your board...</p>
        </div>
      </div>
    );
  }

  if (!projectBoard && !createBoard.isPending) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <p className="text-sm text-muted-foreground">No board available for this project.</p>
      </div>
    );
  }

  return <KanbanBoard boardId={projectBoard.id} onBack={() => {}} />;
}
