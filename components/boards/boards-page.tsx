"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Columns, Star } from "lucide-react";
import KanbanBoard from "@/components/boards/kanban-board";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";

async function fetchBoards(workspaceId: string | null) {
  const url = workspaceId ? `/api/boards?workspaceId=${workspaceId}` : "/api/boards";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch boards");
  return res.json();
}

async function createBoard(data: { name: string; projectId: string; workspaceId: string }) {
  const res = await fetch("/api/boards", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create board");
  return res.json();
}

export default function BoardsPage({ projectId: initialProjectId }: { projectId?: string } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const { showUpgradePrompt } = usePopups();

  const { data: boardsData, isLoading } = useQuery({
    queryKey: ["boards", activeWorkspaceId],
    queryFn: () => fetchBoards(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const boards = Array.isArray(boardsData?.boards) ? boardsData.boards : Array.isArray(boardsData) ? boardsData : [];
  const boardLimits = boardsData?.limits || { max: -1, current: 0, hasAccess: true };
  const displayedBoards = initialProjectId ? boards.filter((b: any) => b.projectId === initialProjectId) : boards;

  const { data: projectsData } = useQuery({
    queryKey: ["projects", activeWorkspaceId],
    queryFn: async () => {
      const url = activeWorkspaceId ? `/api/projects?workspaceId=${activeWorkspaceId}` : "/api/projects";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const projects = Array.isArray(projectsData?.projects) ? projectsData.projects : Array.isArray(projectsData) ? projectsData : [];

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; projectId: string }) =>
      createBoard({ ...data, workspaceId: activeWorkspaceId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", activeWorkspaceId] });
      setIsOpen(false);
      setName("");
      setDescription("");
      if (!initialProjectId) setProjectId("");
      import("sonner").then(({ toast }) => toast.success("Board created successfully"));
    },
    onError: (error: any) => {
      import("sonner").then(({ toast }) => toast.error(error.message || "Failed to create board"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !activeWorkspaceId) return;
    if (boardLimits.max !== -1 && boardLimits.current >= boardLimits.max) {
      showUpgradePrompt("boards");
      return;
    }
    createMutation.mutate({ name, description, projectId });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (selectedBoard) {
    return <KanbanBoard boardId={selectedBoard} onBack={() => setSelectedBoard(null)} />;
  }

  const favoriteBoards = displayedBoards?.filter((b: any) => b.isFavorite) || [];
  const otherBoards = displayedBoards?.filter((b: any) => !b.isFavorite) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Boards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize your workflow and manage tasks across projects
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      </div>

      {favoriteBoards.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400 fill-current" />
            Starred Boards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favoriteBoards.map((board: any, i: number) => (
              <BoardCard key={board.id} board={board} onClick={() => setSelectedBoard(board.id)} />
            ))}
          </div>
        </div>
      )}

      <div>
        {favoriteBoards.length > 0 && (
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">All Boards</h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {otherBoards.map((board: any) => (
            <BoardCard key={board.id} board={board} onClick={() => setSelectedBoard(board.id)} />
          ))}
          <button onClick={() => setIsOpen(true)}
            className="h-full min-h-[160px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-primary">
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">Create Board</span>
          </button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Board Name</Label>
              <Input id="name" placeholder="Product Roadmap..." value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="Briefly describe the purpose..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {!initialProjectId && (
              <div className="space-y-2">
                <Label htmlFor="project">Linked Project</Label>
                <Select value={projectId} onValueChange={setProjectId} required>
                  <SelectTrigger id="project"><SelectValue placeholder="Select a project" /></SelectTrigger>
                  <SelectContent>
                    {projects?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Create Board</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BoardCard({ board, onClick }: { board: any; onClick: () => void }) {
  return (
    <Card className="border shadow-sm hover:border-primary/30 transition-colors cursor-pointer"
      onClick={onClick}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Columns className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold truncate">{board.name}</CardTitle>
          </div>
          {board.isFavorite && <Star className="h-4 w-4 text-amber-400 fill-current shrink-0" />}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
          {board.description || "No description provided."}
        </p>
        <div className="flex items-center justify-between mt-3">
          <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5">
            {board.project?.name}
          </Badge>
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-6 rounded-full border-2 border-background bg-muted" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
