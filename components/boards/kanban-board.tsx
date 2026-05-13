"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Image from "next/image";

import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@clerk/nextjs";
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
  ChevronLeft,
  GripVertical,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare
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
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAbly } from "@/hooks/use-ably";
import { usePopups } from "@/components/popups/popup-manager";
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

async function updateColumnOrders(columns: any[]) {
  if (!columns || columns.length === 0) return;
  const boardId = columns[0].boardId;
  if (!boardId) return;

  const res = await fetch(`/api/boards/${boardId}/columns/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      columnOrders: columns.filter(c => c && c.id).map((c, i) => ({ id: c.id, order: i * 10 })) 
    }),
  });
  if (!res.ok) throw new Error("Failed to update column order");
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

function SortableTask({ 
  task, 
  onClick, 
  isSelected, 
  onSelect 
}: { 
  task: any; 
  onClick: () => void;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
}) {
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
        // Prevent opening dialog if it's a drag action or checkbox click
        if (transform) return;
        onClick();
      }}
      className={cn(
        "p-4 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-indigo-500/20 transition-all group relative bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md rounded-2xl",
        isSelected && "ring-2 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10"
      )}
    >
      <div 
        className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={(checked) => onSelect(!!checked)}
          className="h-4 w-4 rounded-md border-slate-300 dark:border-slate-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
        />
      </div>
      <TaskCardContent task={task} />
    </Card>
  );
}

function SortableColumn({ column, children }: { column: any; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "Column", column },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="flex-shrink-0 w-[320px] h-full rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/10 dark:bg-indigo-900/5 mr-6 flex flex-col"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="flex-shrink-0 w-[320px] h-full flex flex-col group/col">
       {React.cloneElement(children as React.ReactElement, { attributes, listeners })}
    </div>
  );
}

interface KanbanBoardProps {
  boardId: string;
  onBack: () => void;
}

export default function KanbanBoard({ boardId, onBack }: KanbanBoardProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { showConfirm, showUpgradePrompt } = usePopups();
  const queryClient = useQueryClient();
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
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<any[]>([]);
  const [activeColumn, setActiveColumn] = useState<any>(null);

  const { user } = useUser();
  const boardChannel = getBoardChannel(activeWorkspaceId || "", boardId);

  const handleAblyUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["board", boardId] });
  }, [queryClient, boardId]);

  const ablyClient = useAbly(boardChannel, "task:created", handleAblyUpdate);
  useAbly(boardChannel, "task:updated", handleAblyUpdate);
  useAbly(boardChannel, "task:deleted", handleAblyUpdate);
  useAbly(boardChannel, "column:created", handleAblyUpdate);
  useAbly(boardChannel, "column:updated", handleAblyUpdate);
  useAbly(boardChannel, "column:deleted", handleAblyUpdate);

  // Presence logic
  useEffect(() => {
    if (!boardChannel || !user || !ablyClient) return;
    
    const channel = ablyClient.channels.get(boardChannel);
    
    channel.presence.get().then((members: any) => {
      if (members) setPresenceUsers(members.map((m: any) => m.data));
    }).catch(() => {});
    
    channel.presence.subscribe("enter", (member) => {
      if (!member?.data?.id) return;
      setPresenceUsers(prev => {
        if (prev.find(u => u.id === member.data.id)) return prev;
        return [...prev, member.data];
      });
    });
    
    channel.presence.subscribe("leave", (member) => {
      if (!member?.data?.id) return;
      setPresenceUsers(prev => prev.filter(u => u.id !== member.data.id));
    });

    channel.presence.enter({
      id: user.id,
      name: user.fullName || user.username,
      avatar: user.imageUrl
    });

    return () => {
      channel.presence.leave();
    };
  }, [boardChannel, user, ablyClient]);

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
    onError: (error: any) => {
      if (error.message.includes("limit") || error.message.includes("Upgrade")) {
        showUpgradePrompt("tasks");
      } else {
        toast.error(error.message);
      }
    }
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

  const batchDeleteMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const res = await fetch(`/api/tasks/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });
      if (!res.ok) throw new Error("Failed to delete tasks");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setSelectedTaskIds([]);
      toast.success("Tasks deleted successfully");
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
    const type = active.data.current?.type;
    if (type === "Task") {
      setActiveTask(active.data.current.task);
    } else if (type === "Column") {
      setActiveColumn(active.data.current.column);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumn(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeType = active.data.current?.type;
    if (activeType === "Column") {
      if (activeId !== overId) {
        const oldIndex = columns.findIndex((c: any) => c.id === activeId);
        const newIndex = columns.findIndex((c: any) => c.id === overId);
        const newColumns = arrayMove(columns, oldIndex, newIndex);
        
        // Optimistic UI update
        queryClient.setQueryData(["board", boardId], {
          ...board,
          columns: newColumns
        });

        // Update column orders in DB
        updateColumnOrders(newColumns).catch((err) => {
          toast.error("Failed to save column order");
          queryClient.invalidateQueries({ queryKey: ["board", boardId] });
        });
      }
      return;
    }

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
      // const newColumnTasks = arrayMove(columnTasks, oldIndex, newIndex); // Removed as it wasn't used after assignment
      targetOrder = overTask.order + (newIndex > oldIndex ? 1 : -1);
    }

    if (targetColumnIdOffset && (targetColumnIdOffset !== activeTaskData.columnId || activeId !== overId)) {
      updateMutation.mutate({ taskId: activeId, columnId: targetColumnIdOffset, order: targetOrder });
    }
  };

  const handleBatchDelete = () => {
    showConfirm({
      title: "Bulk Delete Tasks",
      description: `Are you sure you want to permanently delete these ${selectedTaskIds.length} tasks? This action cannot be reversed.`,
      actionLabel: `Delete ${selectedTaskIds.length} Tasks`,
      destructive: true,
      onAction: () => batchDeleteMutation.mutate(selectedTaskIds)
    });
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
    <div className="h-full bg-white dark:bg-slate-950 relative selection:bg-indigo-500/30 flex flex-col">
      {/* Neural Mesh Background */}
      <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Board Header */}
      <div className="p-8 sm:p-12 border-b border-indigo-500/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-2xl z-40">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <div className="flex items-center gap-8">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-14 w-14 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all duration-500 bg-white dark:bg-slate-900 border border-indigo-500/10 shadow-2xl shadow-indigo-500/10 group">
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                {isEditingHeader ? (
                  <Input
                    className="text-4xl font-black h-12 w-80 bg-transparent border-none p-0 focus-visible:ring-0 uppercase tracking-tighter"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={() => updateBoardMutation.mutate({ name: editedName })}
                    onKeyDown={(e) => e.key === "Enter" && updateBoardMutation.mutate({ name: editedName })}
                    autoFocus
                  />
                ) : (
                  <h1
                    className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 transition-colors uppercase leading-none"
                    onClick={() => setIsEditingHeader(true)}
                  >
                    {board?.name}
                  </h1>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-10 w-10 rounded-xl", board?.isFavorite ? "text-amber-400" : "text-slate-300")}
                  onClick={toggleFavorite}
                >
                  <Star className={cn("h-5 w-5", board?.isFavorite && "fill-current")} />
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                  <p>Workflow Grid</p>
                  <div className="flex items-center gap-1">
                    {board?.visibility === "private" ? <Lock className="h-3 w-3" /> : <UsersIcon className="h-3 w-3" />}
                    <span>{board?.visibility} Access</span>
                  </div>
                  {presenceUsers.length > 0 && (
                    <div className="flex items-center -space-x-2 ml-4">
                      {presenceUsers.map((user: any) => (
                        <div 
                          key={user.id} 
                          className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-950 bg-slate-100 shadow-xl overflow-hidden transition-all hover:scale-110 hover:z-10"
                          title={user.name}
                        >
                           <Image src={user.avatar} className="h-full w-full object-cover" alt={user.name} width={32} height={32} />
                        </div>
                      ))}
                      <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-950 bg-indigo-600 flex items-center justify-center text-[8px] text-white font-black z-20 shadow-xl">
                         LIVE
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-[1.5rem] border border-indigo-500/5 flex items-center shadow-sm">
              {[
                { id: "kanban", icon: LayoutGrid, label: "Neural Matrix" },
                { id: "list", icon: ListIcon, label: "Stream View" },
                { id: "calendar", icon: Calendar, label: "Chronos" },
                { id: "timeline", icon: GanttChartIcon, label: "Linear Progression" },
              ].map((view) => (
                <Button
                  key={view.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-12 px-6 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap",
                    currentView === view.id 
                      ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 scale-105" 
                      : "text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800"
                  )}
                  onClick={() => setCurrentView(view.id)}
                >
                  <view.icon className={cn("h-4 w-4 mr-3", currentView === view.id ? "animate-pulse" : "")} />
                  <span className="hidden md:inline">{view.label}</span>
                </Button>
              ))}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl border border-indigo-500/10 hover:bg-indigo-600 hover:text-white transition-all duration-500">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-indigo-500/20 rounded-2xl p-2 shadow-2xl">
                <DropdownMenuItem className="rounded-xl font-black uppercase tracking-widest text-[9px] p-3 cursor-pointer" onClick={() => setIsEditingBoard(true)}>
                  <Edit2 className="h-4 w-4 mr-3" /> Board Config
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl font-black uppercase tracking-widest text-[9px] p-3 text-red-500 cursor-pointer" onClick={() => {
                   showConfirm({
                     title: "Purge Interface?",
                     description: "This will permanently delete this board and all synchronization nodes within it.",
                     actionLabel: "Purge Interface",
                     destructive: true,
                     onAction: () => deleteBoardMutation.mutate()
                   });
                }}>
                  <Trash2 className="h-4 w-4 mr-3" /> Purge Interface
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/20 font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95"
              onClick={() => {
                setTargetColumnId(columns[0]?.id);
                setIsTaskDialogOpen(true);
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
            
            <SortableContext 
              items={columns.filter(c => c && c.id).map((c: any) => c.id)} 
              strategy={horizontalListSortingStrategy}
            >
              {columns.map((column: any) => {
                if (!column || !column.id) return null;
                const columnTasks = filteredTasks.filter((t: any) => t && t.columnId === column.id);
                return (
                  <SortableColumn key={column.id} column={column}>
                    <Card className="bg-slate-100/80 dark:bg-slate-900/80 border-none shadow-none h-full flex flex-col rounded-2xl overflow-hidden overflow-y-auto outline-1 outline-slate-200 dark:outline-slate-800 outline">
                      <div className="p-4 flex items-center justify-between sticky top-0 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-b border-slate-200/50 dark:border-slate-800/50">
                        <div className="flex items-center gap-2">
                          <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors" {...(column as any).attributes} {...(column as any).listeners}>
                            <GripVertical className="h-3 w-3 text-slate-400" />
                          </div>
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
                          items={columnTasks.filter(t => t && t.id).map((t: any) => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {columnTasks.map((task: any) => {
                            if (!task || !task.id) return null;
                            return (
                              <SortableTask
                                key={task.id}
                                task={task}
                                isSelected={selectedTaskIds.includes(task.id)}
                                onSelect={(checked) => {
                                  setSelectedTaskIds(prev => 
                                    checked 
                                      ? [...prev, task.id] 
                                      : prev.filter(id => id !== task.id)
                                  );
                                }}
                                onClick={() => setSelectedTask(task)}
                              />
                            );
                          })}
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
                  </SortableColumn>
                );
              })}
            </SortableContext>
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
            {activeColumn ? (
               <div className="flex-shrink-0 w-[320px] h-full flex flex-col opacity-80 scale-105 rotate-1">
                 <Card className="bg-slate-100 dark:bg-slate-900 border-2 border-indigo-500 shadow-2xl h-full flex flex-col rounded-2xl overflow-hidden">
                   <div className="p-4 flex items-center justify-between border-b bg-slate-100/50 dark:bg-slate-900/50">
                     <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 text-slate-400" />
                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        <h3 className="font-black text-xs uppercase tracking-widest">{activeColumn.name}</h3>
                     </div>
                   </div>
                 </Card>
               </div>
            ) : activeTask ? (
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
              {filteredTasks.map((task: any) => {
                if (!task || !task.id) return null;
                return (
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
                );
              })}
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
                  showConfirm({
                    title: "Delete Board",
                    description: "Are you sure you want to delete this board? This action is permanent and will remove all columns and their task placements.",
                    actionLabel: "Permanently Delete",
                    destructive: true,
                    onAction: () => deleteBoardMutation.mutate()
                  });
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

      {/* Batch Selection Bar */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 100, opacity: 0, x: "-50%" }}
            className="fixed bottom-8 left-1/2 z-50 bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl px-6 py-4 flex items-center gap-8 backdrop-blur-md min-w-[400px]"
          >
            <div className="flex items-center gap-3 border-r border-slate-700 pr-8">
              <div className="h-7 w-7 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-indigo-400/50">
                {selectedTaskIds.length}
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-slate-300">Tasks Selected</span>
            </div>
            
            <div className="flex items-center gap-6">
              <Button variant="ghost" size="sm" className="text-xs font-bold hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" onClick={() => setSelectedTaskIds([])}>
                 Cancel
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 gap-2 rounded-xl transition-all active:scale-95 px-4" 
                onClick={handleBatchDelete}
                disabled={batchDeleteMutation.isPending}
              >
                 <Trash2 className="h-3.5 w-3.5" />
                 {batchDeleteMutation.isPending ? "Deleting..." : "Delete Tasks"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
                {dayTasks.map(task => {
                  if (!task || !task.id) return null;
                  return (
                    <div
                      key={task.id}
                      className="text-[9px] font-bold p-1 rounded-md bg-white dark:bg-slate-800 border-l-2 border-indigo-500 shadow-sm truncate cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => onSelectTask(task)}
                    >
                      {task.title}
                    </div>
                  );
                })}
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
            if (!task || !task.id) return null;
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

