"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  Calendar,
  User as UserIcon,
  Star,
  Settings,
  Search,
  Filter,
  RefreshCcw,
  LayoutGrid,
  List as ListIcon,
  GanttChart as GanttChartIcon,
  Lock,
  Users as UsersIcon,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays, differenceInDays } from "date-fns";
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
import { useAbly } from "@/hooks/use-ably";
import { getBoardChannel } from "@/lib/ably";

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

function TaskCardContent({ task }: { task: any }) {
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
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isSameDay(new Date(task.dueDate), new Date());

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100">{task.title}</h4>
        {task.assigneeId && (
          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700" title="Assignee">
             <UserIcon className="h-3 w-3 text-slate-400" />
          </div>
        )}
        {!task.assigneeId && (
          <div className="h-6 w-6 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" title="Unassigned">
            <UserIcon className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {task.tags && task.tags.length > 0 && (
         <div className="flex flex-wrap gap-1">
           {task.tags.map((tag: any) => (
             <Badge key={tag.id} variant="outline" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider" style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}10` }}>
               {tag.name}
             </Badge>
           ))}
         </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
        <Badge
          variant="outline"
          className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0 border ${priorityInfo.color}`}
        >
          {task.priority}
        </Badge>

        <div className="flex items-center gap-3">
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
              <ListIcon className="h-3 w-3" />
              <span>
                {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}
              </span>
            </div>
          )}

          {task.dueDate && (
            <div className={cn("flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded", isOverdue ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "text-slate-500")}>
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.dueDate), "MMM d")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 h-[100px] w-full" 
      />
    );
  }

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
      className="p-4 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-indigo-500/20 transition-all group relative bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md rounded-2xl"
    >
      <TaskCardContent task={task} />
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

  // New features state
  const [currentView, setCurrentView] = useState("kanban"); // kanban, list, calendar, timeline
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editedName, setEditedName] = useState("");

  const boardChannel = getBoardChannel(activeWorkspaceId || "", boardId);

  const handleAblyUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["board", boardId] });
  }, [queryClient, boardId]);

  useAbly(boardChannel, "task:created", handleAblyUpdate);
  useAbly(boardChannel, "task:updated", handleAblyUpdate);
  useAbly(boardChannel, "task:deleted", handleAblyUpdate);
  useAbly(boardChannel, "column:created", handleAblyUpdate);
  useAbly(boardChannel, "column:updated", handleAblyUpdate);
  useAbly(boardChannel, "column:deleted", handleAblyUpdate);

  const { data: board, isLoading } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => fetchBoard(boardId),
  });

  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [editedDescription, setEditedDescription] = useState(board?.description || "");
  const [boardVisibility, setBoardVisibility] = useState(board?.visibility || "private");

  useEffect(() => {
    if (board) {
      setEditedName(board.name);
      setEditedDescription(board.description || "");
      setBoardVisibility(board.visibility || "private");
    }
  }, [board]);

  const updateBoardMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update board");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setIsEditingHeader(false);
      setIsEditingBoard(false);
      toast.success("Board updated");
    },
  });

  const toggleFavorite = () => {
    updateBoardMutation.mutate({ isFavorite: !board?.isFavorite });
  };

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
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ["board", boardId] });
      const previousBoard = queryClient.getQueryData(["board", boardId]);

      if (previousBoard) {
        queryClient.setQueryData(["board", boardId], {
          ...previousBoard,
          tasks: (previousBoard as any).tasks.map((t: any) =>
            t.id === newTask.taskId
              ? { ...t, columnId: newTask.columnId, order: newTask.order }
              : t
          ),
        });
      }

      return { previousBoard };
    },
    onError: (err, newTask, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
      }
      toast.error("Failed to move task");
    },
    onSettled: () => {
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

  const deleteBoardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete board");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", activeWorkspaceId] });
      toast.success("Board deleted");
      onBack();
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
          projectId: board?.projectId,
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

  const [editingColumn, setEditingColumn] = useState<any>(null);
  const [colName, setColName] = useState("");
  const [colWip, setColWip] = useState<number | null>(null);
  const [colColor, setColColor] = useState("#4f46e5");

  const updateColumnMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/columns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update column");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setEditingColumn(null);
      import("sonner").then(({ toast }) => toast.success("Column updated"));
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

  // Filter tasks
  const filteredTasks = tasks.filter((task: any) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      filterPriority === "all" || task.priority === filterPriority;
    const matchesTag =
      filterTag === "all" || task.tags?.some((t: any) => t.id === filterTag);
    return matchesSearch && matchesPriority && matchesTag;
  });

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveTask(active.data.current.task);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeTaskData = tasks.find((t: any) => t.id === activeId);
    if (!activeTaskData) return;

    const overColumn = columns.find((c: any) => c.id === overId);
    let targetColumnIdOffset = "";
    let targetOrder = 0;

    if (overColumn) {
      targetColumnIdOffset = overId;
      const columnTasks = tasks.filter((t: any) => t.columnId === targetColumnIdOffset);
      targetOrder = columnTasks.length > 0
        ? Math.max(...columnTasks.map((t: any) => t.order)) + 10
        : 10;
    } else {
      const overTask = tasks.find((t: any) => t.id === overId);
      if (!overTask) return;

      targetColumnIdOffset = overTask.columnId;
      const columnTasks = tasks
        .filter((t: any) => t.columnId === targetColumnIdOffset)
        .sort((a: any, b: any) => a.order - b.order);

      const oldIndex = columnTasks.findIndex((t: any) => t.id === activeId);
      const newIndex = columnTasks.findIndex((t: any) => t.id === overId);
      const newColumnTasks = arrayMove(columnTasks, oldIndex, newIndex);
      targetOrder = overTask.order + (newIndex > oldIndex ? 1 : -1);
    }

    if (targetColumnIdOffset && (targetColumnIdOffset !== activeTaskData.columnId || activeId !== overId)) {
      updateMutation.mutate({ taskId: activeId, columnId: targetColumnIdOffset, order: targetOrder });
    }
  };

  const allTags = Array.from(
    new Map(tasks.flatMap((t: any) => t.tags || []).map((tag: any) => [tag.id, tag])).values()
  ) as any[];

  const handleOpenColumnSettings = (column: any) => {
    setEditingColumn(column);
    setColName(column.name);
    setColWip(column.wipLimit);
    setColColor(column.color || "#4f46e5");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full bg-slate-50/30 dark:bg-slate-950/30 overflow-hidden flex flex-col">
      {/* Board Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-white dark:hover:bg-slate-900 shadow-sm border">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                {isEditingHeader ? (
                  <Input
                    className="text-2xl font-black h-9 w-64"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={() => updateBoardMutation.mutate({ name: editedName })}
                    onKeyDown={(e) => e.key === "Enter" && updateBoardMutation.mutate({ name: editedName })}
                    autoFocus
                  />
                ) : (
                  <h1
                    className="text-2xl font-black tracking-tight text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1 -ml-1 transition-colors"
                    onClick={() => setIsEditingHeader(true)}
                  >
                    {board?.name}
                  </h1>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", board?.isFavorite ? "text-amber-400" : "text-slate-400")}
                  onClick={toggleFavorite}
                >
                  <Star className={cn("h-4 w-4", board?.isFavorite && "fill-current")} />
                </Button>
                <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none font-bold">
                  {board?.project?.name}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground font-medium">Visual workflow management</p>
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {board?.visibility === "private" ? <Lock className="h-3 w-3" /> : <UsersIcon className="h-3 w-3" />}
                  <span>{board?.visibility}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex items-center shadow-sm border">
              {[
                { id: "kanban", icon: LayoutGrid, label: "Kanban" },
                { id: "list", icon: ListIcon, label: "List" },
                { id: "calendar", icon: Calendar, label: "Calendar" },
                { id: "timeline", icon: GanttChartIcon, label: "Timeline" },
              ].map((view) => (
                <Button
                  key={view.id}
                  variant={currentView === view.id ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "text-xs font-bold gap-2 rounded-lg",
                    currentView === view.id ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500"
                  )}
                  onClick={() => setCurrentView(view.id)}
                >
                  <view.icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{view.label}</span>
                </Button>
              ))}
            </div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 font-bold transition-all active:scale-95 ml-2"
              onClick={() => setIsEditingBoard(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Board Settings
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 p-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              className="pl-10 h-10 bg-transparent border-none focus-visible:ring-0 shadow-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32 h-10 bg-transparent border-slate-200 dark:border-slate-800 rounded-xl">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-32 h-10 bg-transparent border-slate-200 dark:border-slate-800 rounded-xl">
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl bg-transparent border-slate-200 dark:border-slate-800"
              onClick={() => {
                setSearchQuery("");
                setFilterPriority("all");
                setFilterTag("all");
              }}
            >
              <RefreshCcw className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>
      </div>

      {currentView === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-6 h-full items-start px-2 custom-scrollbar">
            {columns.length === 0 && (
              <div className="w-full flex flex-col items-center justify-center p-12 mt-10 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
                <div className="h-20 w-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                  <LayoutGrid className="h-10 w-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Build Your Workflow</h3>
                <p className="text-muted-foreground text-center max-w-md mb-8">
                  Your board is currently empty. Start by creating columns to represent the stages of your workflow (e.g., Todo, In Progress, Done).
                </p>
                <Button 
                  size="lg" 
                  className="bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                  onClick={() => setIsColumnDialogOpen(true)}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Column
                </Button>
              </div>
            )}
            
            {columns.map((column: any) => {
              const columnTasks = filteredTasks.filter((t: any) => t.columnId === column.id);
              return (
                <div key={column.id} className="flex-shrink-0 w-[320px] h-full flex flex-col">
                  <Card className="bg-slate-100/80 dark:bg-slate-900/80 border-none shadow-none h-full flex flex-col rounded-2xl overflow-hidden overflow-y-auto outline-1 outline-slate-200 dark:outline-slate-800 outline">
                    <div className="p-4 flex items-center justify-between sticky top-0 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-b border-slate-200/50 dark:border-slate-800/50">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: column.color || "#4f46e5" }}
                        />
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">{column.name}</h3>
                        <Badge variant="outline" className="bg-white dark:bg-slate-800 border-none shadow-sm text-[10px] h-5 min-w-5 flex items-center justify-center px-1 font-bold">
                          {columnTasks.length}
                          {column.wipLimit && (
                            <span className="text-slate-400 font-medium ml-1">/ {column.wipLimit}</span>
                          )}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleOpenColumnSettings(column)}>
                            <Edit2 className="h-4 w-4" />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleOpenColumnSettings(column)}>
                            <Settings className="h-4 w-4" />
                            <span>Column Settings</span>
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

                      {isTaskDialogOpen && targetColumnId === column.id ? (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-indigo-500 mt-2">
                          <Input
                            autoFocus
                            placeholder="What needs to be done?"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newTaskTitle.trim() && !createTaskMutation.isPending) {
                                createTaskMutation.mutate(column.id);
                              } else if (e.key === "Escape") {
                                setIsTaskDialogOpen(false);
                                setTargetColumnId(null);
                                setNewTaskTitle("");
                              }
                            }}
                            className="border-none focus-visible:ring-0 shadow-none px-0 h-auto text-sm font-bold bg-transparent"
                          />
                          <div className="flex items-center justify-end gap-2 mt-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs font-bold"
                              onClick={() => {
                                setIsTaskDialogOpen(false);
                                setTargetColumnId(null);
                                setNewTaskTitle("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700"
                              disabled={!newTaskTitle.trim() || createTaskMutation.isPending} 
                              onClick={() => createTaskMutation.mutate(column.id)}
                            >
                              {createTaskMutation.isPending ? "Adding..." : "Add Task"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setTargetColumnId(column.id);
                            setIsTaskDialogOpen(true);
                          }}
                          className={cn(
                            "w-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all group",
                            columnTasks.length === 0 ? "h-32 border-2 border-dashed flex-col gap-2" : "h-12 mt-2"
                          )}
                        >
                          <Plus className={cn("transition-transform group-hover:scale-125", columnTasks.length === 0 ? "h-6 w-6" : "h-4 w-4 mr-2")} />
                          <span className={cn("font-bold uppercase tracking-wider", columnTasks.length === 0 ? "text-sm" : "text-xs")}>
                            {columnTasks.length === 0 ? "Drop tasks here or Add Task" : "Add Task"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}
            <div className="flex-shrink-0 w-[320px]">
              <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-12 border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-2xl transition-all font-bold group"
                  >
                    <Plus className="h-4 w-4 mr-2 group-hover:scale-125 transition-transform" />
                    NEW COLUMN
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

          <DragOverlay>
            {activeTask ? (
              <Card className="p-4 cursor-grabbing shadow-2xl scale-105 rotate-3 border-2 border-indigo-500 bg-white dark:bg-slate-900 rounded-2xl w-[312px]">
                <TaskCardContent task={activeTask} />
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {currentView === "list" && (
        <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Task Title</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Column</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Priority</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Tags</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task: any) => (
                <tr
                  key={task.id}
                  className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedTask(task)}
                >
                  <td className="px-6 py-4">
                    <span className="font-bold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{task.title}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">
                      {columns.find((c: any) => c.id === task.columnId)?.name}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0 border-none",
                        task.priority === "high" ? "bg-red-500/10 text-red-600" :
                          task.priority === "medium" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                      )}
                    >
                      {task.priority}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-muted-foreground">
                      {task.dueDate ? format(new Date(task.dueDate), "MMM dd, yyyy") : "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {task.tags?.map((tag: any) => (
                        <div
                          key={tag.id}
                          className="h-2 w-6 rounded-full"
                          style={{ backgroundColor: tag.color }}
                          title={tag.name}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-muted-foreground italic">
                    No tasks found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {currentView === "calendar" && (
        <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col">
          <BoardCalendar tasks={filteredTasks} onSelectTask={setSelectedTask} />
        </div>
      )}

      {currentView === "timeline" && (
        <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col">
          <BoardTimeline tasks={filteredTasks} onSelectTask={setSelectedTask} />
        </div>
      )}

      {activeWorkspaceId && (
        <TaskDialog
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          workspaceId={activeWorkspaceId}
        />
      )}

      <Dialog open={!!editingColumn} onOpenChange={(open) => !open && setEditingColumn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Column Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="col-name" className="text-xs font-bold uppercase tracking-widest">Column Name</Label>
              <Input
                id="col-name"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                placeholder="e.g. Done"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-wip" className="text-xs font-bold uppercase tracking-widest">WIP Limit (Work In Progress)</Label>
              <Input
                id="col-wip"
                type="number"
                value={colWip || ""}
                onChange={(e) => setColWip(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="No limit"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest">Column Theme Color</Label>
              <div className="flex flex-wrap gap-2">
                {["#4f46e5", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"].map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                      colColor === color ? "border-slate-900 dark:border-white scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setColColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingColumn(null)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 font-bold"
              onClick={() => updateColumnMutation.mutate({
                id: editingColumn.id,
                name: colName,
                wipLimit: colWip,
                color: colColor
              })}
              disabled={updateColumnMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingBoard} onOpenChange={setIsEditingBoard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Board Details & Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="board-desc" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</Label>
              <Input
                id="board-desc"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Enter board description..."
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Visibility</Label>
              <Select value={boardVisibility} onValueChange={setBoardVisibility}>
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Private</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="team">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4" />
                      <span>Team</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4" />
                      <span>Public</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                className="w-full font-bold h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
                    deleteBoardMutation.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Permanently Delete Board
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditingBoard(false)} className="rounded-xl h-11 font-bold">Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl h-11 px-8 shadow-lg shadow-indigo-500/20"
              onClick={() => updateBoardMutation.mutate({
                description: editedDescription,
                visibility: boardVisibility
              })}
              disabled={updateBoardMutation.isPending}
            >
              {updateBoardMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-components for different views

function BoardCalendar({ tasks, onSelectTask }: { tasks: any[]; onSelectTask: (task: any) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const tasksWithDates = tasks.filter(t => t.dueDate);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">{format(currentDate, "MMMM yyyy")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 overflow-auto">
        {calendarDays.map((day, i) => {
          const dayTasks = tasksWithDates.filter(t => isSameDay(new Date(t.dueDate), day));
          return (
            <div
              key={i}
              className={cn(
                "min-h-[100px] p-2 border-r border-b group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors",
                !isSameMonth(day, monthStart) && "bg-slate-50/50 dark:bg-slate-900/50 opacity-40",
                isSameDay(day, new Date()) && "bg-indigo-50/50 dark:bg-indigo-900/10"
              )}
            >
              <span className={cn(
                "text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full mb-1",
                isSameDay(day, new Date()) ? "bg-indigo-600 text-white" : "text-slate-400"
              )}>
                {format(day, "d")}
              </span>
              <div className="space-y-1">
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    className="text-[9px] font-bold p-1 rounded-md bg-white dark:bg-slate-800 border-l-2 border-indigo-500 shadow-sm truncate cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => onSelectTask(task)}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardTimeline({ tasks, onSelectTask }: { tasks: any[]; onSelectTask: (task: any) => void }) {
  const startDate = startOfWeek(new Date());
  const days = Array.from({ length: 30 }).map((_, i) => addDays(startDate, i));
  const tasksWithDates = tasks.filter((t) => t.dueDate).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <ScrollArea className="flex-1 w-full">
      <div className="min-w-[1200px] flex flex-col">
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-20 backdrop-blur-md">
          <div className="w-48 sticky left-0 bg-white dark:bg-slate-900 border-r z-10 px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Title</div>
          <div className="flex">
            {days.map((day) => (
              <div key={day.toISOString()} className={cn(
                "w-12 border-r border-slate-100 dark:border-slate-800 py-3 flex flex-col items-center",
                (day.getDay() === 0 || day.getDay() === 6) && "bg-slate-100/30 dark:bg-slate-800/10"
              )}>
                <span className="text-[8px] text-slate-400 font-bold uppercase">{format(day, "EEE")}</span>
                <span className="text-[10px] font-black">{format(day, "d")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {tasksWithDates.map((task) => {
            const taskStart = new Date(task.createdAt);
            const taskEnd = new Date(task.dueDate);
            const startOffset = Math.max(0, differenceInDays(taskStart, startDate));
            const duration = Math.max(1, differenceInDays(taskEnd, taskStart));

            return (
              <div key={task.id} className="flex border-b border-slate-50 dark:border-slate-800/50 group hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                <div className="w-48 sticky left-0 bg-white dark:bg-slate-900 border-r z-10 px-4 py-3 flex items-center min-w-0" onClick={() => onSelectTask(task)}>
                  <span className="text-xs font-bold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer">{task.title}</span>
                </div>
                <div className="flex relative h-12 w-full">
                  <div
                    className={cn(
                      "absolute top-2.5 h-7 rounded-lg flex items-center px-3 shadow-md border border-black/5 cursor-pointer transition-transform hover:scale-[1.02]",
                      task.priority === "high" ? "bg-red-500 text-white" :
                        task.priority === "medium" ? "bg-amber-400 text-white" : "bg-emerald-500 text-white"
                    )}
                    style={{
                      left: `${startOffset * 48}px`,
                      width: `${duration * 48}px`,
                      minWidth: "100px"
                    }}
                    onClick={() => onSelectTask(task)}
                  >
                    <span className="text-[9px] font-black truncate">{task.title}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {tasksWithDates.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground italic">
              <span className="text-sm">No tasks with due dates found.</span>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

