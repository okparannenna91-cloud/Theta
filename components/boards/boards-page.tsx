"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Columns, Star } from "lucide-react";
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
  const [description, setDescription] = useState("");
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
    mutationFn: (data: { name: string; description: string; projectId: string }) =>
      createBoard({ ...data, workspaceId: activeWorkspaceId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", activeWorkspaceId] });
      setIsOpen(false);
      setName("");
      setDescription("");
      setProjectId("");
      import("sonner").then(({ toast }) => toast.success("Board created successfully"));
    },
    onError: (error: any) => {
      import("sonner").then(({ toast }) => toast.error(error.message || "Failed to create board"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !activeWorkspaceId) return;
    createMutation.mutate({ name, description, projectId });
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

  const favoriteBoards = boards?.filter((b: any) => b.isFavorite) || [];
  const otherBoards = boards?.filter((b: any) => !b.isFavorite) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
        >
          <h1 className="text-3xl font-black tracking-tight mb-2">Boards</h1>
          <p className="text-muted-foreground font-medium">
            Visualize your workflow and manage tasks across projects.
          </p>
        </motion.div>
        <Button onClick={() => setIsOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 font-bold px-6">
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      </div>

      {favoriteBoards.length > 0 && (
        <div className="mb-12">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400 fill-current" />
            Starred Boards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favoriteBoards.map((board: any, i: number) => (
              <BoardCard key={board.id} board={board} index={i} onClick={() => setSelectedBoard(board.id)} />
            ))}
          </div>
        </div>
      )}

      <div>
        {favoriteBoards.length > 0 && (
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">
            All Boards
          </h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {otherBoards.map((board: any, i: number) => (
            <BoardCard key={board.id} board={board} index={i} onClick={() => setSelectedBoard(board.id)} />
          ))}

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="group cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            <div className="h-full min-h-[160px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all">
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">Create Board</span>
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest">Board Name</Label>
              <Input
                id="name"
                placeholder="Product Roadmap..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest">Description</Label>
              <Input
                id="description"
                placeholder="Briefly describe the purpose..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project" className="text-xs font-bold uppercase tracking-widest">Linked Project</Label>
              <Select
                value={projectId}
                onValueChange={setProjectId}
                required
              >
                <SelectTrigger id="project" className="h-11 rounded-xl">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="rounded-xl h-11 px-6 font-bold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl h-11 px-8 font-bold shadow-lg shadow-indigo-500/20">
                Create Board
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BoardCard({ board, index, onClick }: { board: any; index: number; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="group relative overflow-hidden border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer rounded-2xl"
        onClick={onClick}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Columns className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-bold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {board.name}
              </CardTitle>
            </div>
            {board.isFavorite && (
              <Star className="h-4 w-4 text-amber-400 fill-current flex-shrink-0" />
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {board.description || "No description provided."}
          </p>
          <div className="flex items-center justify-between mt-2">
            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold tracking-widest border-none">
              {board.project?.name}
            </Badge>
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 w-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

