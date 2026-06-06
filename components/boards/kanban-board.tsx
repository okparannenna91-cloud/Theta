"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Image from "next/image";

import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  MessageSquare,
  BarChart3,
  LayoutDashboard,
  MapPin,
  FileText,
  Images,
  BookOpen,
  Users,
  Grid3X3,
  Zap,
  Link2,
  Shield,
  BrainCircuit,
  Puzzle,
  Code,
  Beaker,
  Globe
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
import TableView from "@/components/boards/table-view";
import ChartView from "@/components/boards/chart-view";
import BoardDashboardView from "@/components/boards/board-dashboard-view";
import WorkloadView from "@/components/boards/workload-view";
import MapView from "@/components/boards/map-view";
import FormView from "@/components/boards/form-view";
import FilesView from "@/components/boards/files-view";
import GalleryView from "@/components/boards/gallery-view";
import DocsView from "@/components/boards/docs-view";
import AutomationPanel from "@/components/boards/automation-panel";
import BoardRelationshipsPanel from "@/components/boards/board-relationships-panel";
import CollaborationPanel from "@/components/boards/collaboration-panel";
import PermissionsPanel from "@/components/boards/permissions-panel";
import AIFeaturesPanel from "@/components/boards/ai-features-panel";
import IntegrationsPanel from "@/components/boards/integrations-panel";
import DeveloperPanel from "@/components/boards/developer-panel";
import AdvancedFeaturesPanel from "@/components/boards/advanced-features-panel";
import FilterSortBar from "@/components/boards/filter-sort-bar";
import type { FilterConfig, SortConfig, ColumnVisibility, SavedView } from "@/components/boards/filter-sort-bar";
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
      columnOrders: columns.filter((c: any) => c && c.id).map((c: any, i: number) => ({ id: c.id, order: i * 10 })) 
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
        <h4 className="font-semibold text-sm leading-tight text-foreground">{task.title}</h4>
        {task.assigneeId && (
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 border" title="Assignee">
             <UserIcon className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
        {!task.assigneeId && (
          <div className="h-6 w-6 rounded-full border border-dashed border-border flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-muted" title="Unassigned">
            <UserIcon className="h-3 w-3 text-muted-foreground" />
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
             <Badge key={tag.id} variant="outline" className="text-[9px] px-1.5 py-0 font-semibold" style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}10` }}>
               {tag.name}
             </Badge>
           ))}
         </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
        <Badge
          variant="outline"
          className={`text-[9px] font-semibold px-1.5 py-0 border ${priorityInfo.color}`}
        >
          {task.priority}
        </Badge>

        <div className="flex items-center gap-3">
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
              <ListIcon className="h-3 w-3" />
              <span>
                {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}
              </span>
            </div>
          )}

          {task.dueDate && (
            <div className={cn("flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded", isOverdue ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "text-muted-foreground")}>
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
        className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 h-[100px] w-full" 
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
        if (transform) return;
        onClick();
      }}
      className={cn(
        "p-4 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary/20 transition-all group relative bg-card border shadow-sm hover:shadow-md rounded-lg",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <div 
        className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={(checked) => onSelect(!!checked)}
          className="h-4 w-4 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
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
        className="flex-shrink-0 w-[320px] h-full rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 mr-6 flex flex-col"
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
  const [currentView, setCurrentView] = useState("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<any[]>([]);
  const [activeColumn, setActiveColumn] = useState<any>(null);

  // Filter & Sort state
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({});
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

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
      toast.success("Column updated");
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
      !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      !filterConfig.priority || filterConfig.priority === "all" || task.priority === filterConfig.priority;
    const matchesTag =
      !filterConfig.tagIds || filterConfig.tagIds.length === 0 ||
      task.tags?.some((t: any) => t.tagId ? filterConfig.tagIds?.includes(t.tagId) : filterConfig.tagIds?.includes(t.id));
    const matchesStatus =
      !filterConfig.status || filterConfig.status === "all" || task.status === filterConfig.status;
    return matchesSearch && matchesPriority && matchesTag && matchesStatus;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a: any, b: any) => {
    if (!sortConfig) return 0;
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    switch (sortConfig.field) {
      case "title": return dir * (a.title || "").localeCompare(b.title || "");
      case "priority": {
        const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return dir * ((pMap[a.priority] || 0) - (pMap[b.priority] || 0));
      }
      case "dueDate": {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return dir * (da - db);
      }
      case "status": return dir * ((a.status || "").localeCompare(b.status || ""));
      case "createdAt": return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default: return 0;
    }
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
    <div className="h-full bg-background relative flex flex-col">
      {/* Board Header */}
      <div className="p-6 sm:p-8 border-b bg-background/40 backdrop-blur-2xl z-40">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-12 w-12 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-300 bg-card border shadow-sm group">
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                {isEditingHeader ? (
                  <Input
                    className="text-3xl font-semibold h-12 w-80 bg-transparent border-none p-0 focus-visible:ring-0 tracking-tight"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={() => updateBoardMutation.mutate({ name: editedName })}
                    onKeyDown={(e) => e.key === "Enter" && updateBoardMutation.mutate({ name: editedName })}
                    autoFocus
                  />
                ) : (
                  <h1
                    className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground cursor-pointer hover:text-primary transition-colors leading-none"
                    onClick={() => setIsEditingHeader(true)}
                  >
                    {board?.name}
                  </h1>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-10 w-10 rounded-lg", board?.isFavorite ? "text-amber-400" : "text-muted-foreground")}
                  onClick={toggleFavorite}
                >
                  <Star className={cn("h-5 w-5", board?.isFavorite && "fill-current")} />
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 bg-primary rounded-full" />
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                  <p>Board</p>
                  <div className="flex items-center gap-1">
                    {board?.visibility === "private" ? <Lock className="h-3 w-3" /> : <UsersIcon className="h-3 w-3" />}
                    <span>{board?.visibility}</span>
                  </div>
                  {presenceUsers.length > 0 && (
                    <div className="flex items-center -space-x-2 ml-4">
                      {presenceUsers.map((user: any) => (
                        <div 
                          key={user.id} 
                          className="h-7 w-7 rounded-full border-2 border-background bg-muted shadow-sm overflow-hidden transition-all hover:scale-110 hover:z-10"
                          title={user.name}
                        >
                           <Image src={user.avatar} className="h-full w-full object-cover" alt={user.name} width={28} height={28} />
                        </div>
                      ))}
                      <div className="h-7 w-7 rounded-full border-2 border-background bg-primary flex items-center justify-center text-[8px] text-primary-foreground font-semibold z-20 shadow-sm">
                         {presenceUsers.length}
            </div>
          </div>
        )}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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

  const tasksWithDates = tasks.filter((t: any) => t.dueDate);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-sm font-semibold text-muted-foreground">{format(currentDate, "MMMM yyyy")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 text-center text-[10px] font-semibold text-muted-foreground">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 overflow-auto">
        {calendarDays.map((day, i) => {
          const dayTasks = tasksWithDates.filter((t: any) => isSameDay(new Date(t.dueDate), day));
          return (
            <div
              key={i}
              className={cn(
                "min-h-[100px] p-2 border-r border-b group hover:bg-muted/30 transition-colors",
                !isSameMonth(day, monthStart) && "bg-muted/30 opacity-40",
                isSameDay(day, new Date()) && "bg-primary/5"
              )}
            >
              <span className={cn(
                "text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-1",
                isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}>
                {format(day, "d")}
              </span>
              <div className="space-y-1">
                {dayTasks.map(task => {
                  if (!task || !task.id) return null;
                  return (
                    <div
                      key={task.id}
                      className="text-[9px] font-medium p-1 rounded-md bg-card border-l-2 border-primary shadow-sm truncate cursor-pointer hover:scale-105 transition-transform"
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
        <div className="flex border-b bg-muted/50 sticky top-0 z-20 backdrop-blur-md">
          <div className="w-48 sticky left-0 bg-card border-r z-10 px-4 py-3 text-[10px] font-semibold text-muted-foreground">Task Title</div>
          <div className="flex">
            {days.map((day) => (
              <div key={day.toISOString()} className={cn(
                "w-12 border-r py-3 flex flex-col items-center",
                (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/20"
              )}>
                <span className="text-[8px] text-muted-foreground font-medium">{format(day, "EEE")}</span>
                <span className="text-[10px] font-semibold">{format(day, "d")}</span>
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
              <div key={task.id} className="flex border-b group hover:bg-muted/20 transition-colors">
                <div className="w-48 sticky left-0 bg-card border-r z-10 px-4 py-3 flex items-center min-w-0" onClick={() => onSelectTask(task)}>
                  <span className="text-xs font-medium truncate group-hover:text-primary transition-colors cursor-pointer">{task.title}</span>
                </div>
                <div className="flex relative h-12 w-full">
                  <div
                    className={cn(
                      "absolute top-2.5 h-7 rounded-md flex items-center px-3 shadow-sm border border-black/5 cursor-pointer transition-transform hover:scale-[1.02]",
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
                    <span className="text-[9px] font-semibold truncate">{task.title}</span>
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
