"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, MoreVertical, Trash2, Edit2, Calendar, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { useWorkspace } from "@/hooks/use-workspace";

async function fetchBoard(id: string) {
  const res = await fetch(`/api/boards/${id}`);
  if (!res.ok) throw new Error("Failed to fetch board");
  return res.json();
}

async function updateTaskOrder(
  taskId: string,
  columnId: string,
  order: number
) {
  const res = await fetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columnId, order }),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

async function createColumn(boardId: string, name: string) {
  const res = await fetch(`/api/boards/${boardId}/columns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create column");
  return res.json();
}

async function updateColumn(columnId: string, name: string) {
  const res = await fetch(`/api/columns/${columnId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to update column");
  return res.json();
}

async function deleteColumn(columnId: string) {
  const res = await fetch(`/api/columns/${columnId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete column");
  return res.json();
}

function SortableTask({ task, onClick }: { task: any; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "Task", task } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    scale: isDragging ? 1.02 : 1,
  };

  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case "high":
        return { color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50" };
      case "medium":
        return { color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50" };
      default:
        return { color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50" };
    }
  };

  const priorityInfo = getPriorityInfo(task.priority);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Prevent opening dialog if it's a drag action
        if (transform) return;
        onClick();
      }}
      className={`p-4 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary/20 transition-all group relative bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md ${isDragging ? 'shadow-2xl z-50 ring-2 ring-primary' : ''}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100">{task.title}</h4>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge
            variant="outline"
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0 border ${priorityInfo.color}`}
          >
            {task.priority}
          </Badge>

          {task.tags?.map((tag: any) => (
            <div
              key={tag.id}
              className="h-1.5 w-4 rounded-full"
              style={{ backgroundColor: tag.color }}
              title={tag.name}
            />
          ))}

          {task.dueDate && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium ml-auto">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.dueDate), "MMM d")}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function KanbanBoard({
  boardId,
  onBack,
}: {
  boardId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const [activeTask, setActiveTask] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [targetColumnId, setTargetColumnId] = useState<string | null>(null);

  const { data: board, isLoading } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => fetchBoard(boardId),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateMutation = useMutation({
    mutationFn: ({
      taskId,
      columnId,
      order,
    }: {
      taskId: string;
      columnId: string;
      order: number;
    }) => updateTaskOrder(taskId, columnId, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: (name: string) => createColumn(boardId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setIsColumnDialogOpen(false);
      setNewColumnName("");
      toast.success("Column created");
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: string) => deleteColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Column deleted");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (columnId: string) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          workspaceId: activeWorkspaceId,
          projectId: board.projectId,
          boardId,
          columnId,
          priority: "medium",
          status: "todo",
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setIsTaskDialogOpen(false);
      setNewTaskTitle("");
      setTargetColumnId(null);
      toast.success("Task created");
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading board...</p>
        </div>
      </div>
    );
  }

  const columns = board?.columns || [];
  const tasks = board?.tasks || [];

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveTask(active.data.current.task);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id;
    const overId = over.id;

    let columnId = "";
    const overColumn = columns.find((c: any) => c.id === overId);
    if (overColumn) {
      columnId = overId;
    } else {
      const overTask = tasks.find((t: any) => t.id === overId);
      if (overTask) {
        columnId = overTask.columnId;
      }
    }

    if (columnId) {
      updateMutation.mutate({ taskId, columnId, order: 0 });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full bg-slate-50/30 dark:bg-slate-950/30 overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-white dark:hover:bg-slate-900 shadow-sm border">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{board?.name}</h1>
              <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none font-bold">
                {board?.project?.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Visual workflow management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 font-bold transition-all active:scale-95">
                <Plus className="h-4 w-4 mr-2" />
                New Column
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Column</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Column Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. In Review"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsColumnDialogOpen(false)}>Cancel</Button>
                <Button
                  disabled={!newColumnName || createColumnMutation.isPending}
                  onClick={() => createColumnMutation.mutate(newColumnName)}
                >
                  Create Column
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-6 h-full items-start px-2 custom-scrollbar">
          {columns.map((column: any) => {
            const columnTasks = tasks.filter((t: any) => t.columnId === column.id);
            return (
              <div key={column.id} className="flex-shrink-0 w-[320px] h-full flex flex-col">
                <Card className="bg-slate-100/80 dark:bg-slate-900/80 border-none shadow-none h-full flex flex-col rounded-2xl overflow-hidden overflow-y-auto outline-1 outline-slate-200 dark:outline-slate-800 outline">
                  <div className="p-4 flex items-center justify-between sticky top-0 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-b border-slate-200/50 dark:border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">{column.name}</h3>
                      <Badge variant="outline" className="bg-white dark:bg-slate-800 border-none shadow-sm text-[10px] h-5 min-w-5 flex items-center justify-center px-1 font-bold">{columnTasks.length}</Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Edit2 className="h-4 w-4" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 text-destructive focus:text-destructive"
                          onClick={() => deleteColumnMutation.mutate(column.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Column</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="p-3 gap-3 flex flex-col flex-1 pb-20">
                    <SortableContext
                      id={column.id}
                      items={columnTasks.map((t: any) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {columnTasks.map((task: any) => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          onClick={() => setSelectedTask(task)}
                        />
                      ))}
                    </SortableContext>

                    <Dialog open={isTaskDialogOpen && targetColumnId === column.id} onOpenChange={(open) => {
                      if (!open) {
                        setIsTaskDialogOpen(false);
                        setTargetColumnId(null);
                        setNewTaskTitle("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setTargetColumnId(column.id);
                            setIsTaskDialogOpen(true);
                          }}
                          className="w-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 mt-2 border-dashed border-2 py-6 rounded-xl transition-all group"
                        >
                          <Plus className="h-4 w-4 mr-2 group-hover:scale-125 transition-transform" />
                          <span className="text-xs font-bold uppercase tracking-wider">Add Task</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Task to {column.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="task-title">Task Title</Label>
                            <Input
                              id="task-title"
                              placeholder="What needs to be done?"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
                          <Button
                            disabled={!newTaskTitle || createTaskMutation.isPending}
                            onClick={() => createTaskMutation.mutate(column.id)}
                          >
                            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="p-4 bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-2xl shadow-2xl opacity-100 scale-105 transition-transform rotate-2 w-[312px]">
              <h4 className="font-bold text-sm mb-2">{activeTask.title}</h4>
              <Badge className="bg-indigo-500/10 text-indigo-600 border-none font-bold uppercase text-[10px] tracking-widest">{activeTask.priority}</Badge>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {activeWorkspaceId && (
        <TaskDialog
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          workspaceId={activeWorkspaceId}
        />
      )}
    </div>
  );
}

