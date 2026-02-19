"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Columns } from "lucide-react";
import KanbanBoard from "@/components/boards/kanban-board";

import { useWorkspace } from "@/hooks/use-workspace";

async function fetchBoards(workspaceId: string | null) {
  const url = workspaceId ? `/api/boards?workspaceId=${workspaceId}` : "/api/boards";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch boards");
  return res.json();
}

async function createBoard(data: { name: string; projectId: string; workspaceId: string }) {
  const res = await fetch("/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create board");
  return res.json();
}

export default function BoardsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();

  const { data: boards, isLoading } = useQuery({
    queryKey: ["boards", activeWorkspaceId],
    queryFn: () => fetchBoards(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", activeWorkspaceId],
    queryFn: async () => {
      const url = activeWorkspaceId ? `/api/projects?workspaceId=${activeWorkspaceId}` : "/api/projects";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; projectId: string }) =>
      createBoard({ ...data, workspaceId: activeWorkspaceId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", activeWorkspaceId] });
      setIsOpen(false);
      setName("");
      setProjectId("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !activeWorkspaceId) return;
    createMutation.mutate({ name, projectId });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-48 sm:w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (selectedBoard) {
    return (
      <KanbanBoard
        boardId={selectedBoard}
        onBack={() => setSelectedBoard(null)}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Boards</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your projects with Kanban boards
          </p>
        </motion.div>
        <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {boards?.map((board: any, i: number) => (
          <motion.div
            key={board.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedBoard(board.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Columns className="h-5 w-5 text-blue-600" />
                  <CardTitle>{board.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {board.project?.name}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {boards?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No boards yet. Create your first board!
          </p>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Board Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="project">Project</Label>
              <Select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                <option value="">Select a project</option>
                {projects?.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

