"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { StatusCategory, inferStatusCategory } from "@/lib/constants/status";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

  List as ListIcon,
  Users as UsersIcon,
  ListChecks,
  MessageSquare,
  Paperclip,
  GitBranch,
  GripVertical,
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
import { format, isSameDay } from "date-fns";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
} from "@dnd-kit/core";
class NoDndPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-no-dnd]")) return false;
        return true;
      },
    },
  ];
}
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import FilterSortBar from "@/components/boards/filter-sort-bar";
import type { FilterConfig, SortConfig, ColumnVisibility, SavedView } from "@/components/boards/filter-sort-bar";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { CustomFieldBadges } from "@/components/tasks/task-custom-fields";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAbly } from "@/hooks/use-ably";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { useStatuses } from "@/hooks/use-statuses";
import { usePopups } from "@/components/popups/popup-manager";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { getBoardChannel } from "@/lib/ably";
import { isDoneColumnName, isTodoColumnName } from "@/lib/constants/status";

async function fetchBoard(id: string) {
  const res = await fetch(`/api/boards/${id}`);
  if (!res.ok) throw new Error("Failed to fetch board");
  return res.json();
}

async function createColumn(boardId: string, name: string, category?: string) {
  const res = await fetch(`/api/boards/${boardId}/columns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, ...(category && { category }) }),
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

async function deleteColumn(columnId: string, migrateToStatusId?: string) {
  const params = migrateToStatusId ? `?migrateToStatusId=${migrateToStatusId}` : "";
  const res = await fetch(`/api/columns/${columnId}${params}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to delete column");
  }
  return res.json();
}

const TaskCardContent = React.memo(function TaskCardContent({ task, memberMap, fields }: { task: any; memberMap: Record<string, any>; fields: any[] }) {
  const priorityInfo = useMemo(() => {
    switch (task.priority) {
      case "urgent":
      case "critical":
        return { label: "Critical", bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50" };
      case "high":
        return { label: "High", bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50" };
      case "medium":
        return { label: "Medium", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50" };
      default:
        return { label: "Low", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50" };
    }
  }, [task.priority]);

  const isOverdue = useMemo(() =>
    task.dueDate && new Date(task.dueDate) < new Date() && !isSameDay(new Date(task.dueDate), new Date()),
    [task.dueDate]
  );

  const dueDateLabel = useMemo(() => {
    if (!task.dueDate) return null;
    const date = new Date(task.dueDate);
    const today = new Date();
    if (isSameDay(date, today)) return "Today";
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (isSameDay(date, tomorrow)) return "Tomorrow";
    return format(date, "MMM d");
  }, [task.dueDate]);

  const subtaskProgress = useMemo(() => {
    if (!task.children?.length) return null;
    const done = task.children.filter((c: any) => c.status === "completed").length;
    return { done, total: task.children.length };
  }, [task.children]);

  const commentCount = useMemo(() => task._count?.comments ?? 0, [task._count?.comments]);

  const attachmentCount = useMemo(() => task._count?.attachments ?? 0, [task._count?.attachments]);

  const dependencyCount = useMemo(() =>
    (task.predecessors?.length ?? 0) + (task.successors?.length ?? 0),
    [task.predecessors, task.successors]
  );

  const hasMetadata = subtaskProgress || commentCount > 0 || attachmentCount > 0 || dependencyCount > 0;

  const visibleTags = useMemo(() => {
    if (!task.tags?.length) return null;
    return {
      shown: task.tags.slice(0, 2),
      overflow: task.tags.length - 2,
    };
  }, [task.tags]);


  return (
    <div className="space-y-1.5">
      {/* Title — font-semibold, max 2 lines */}
      <h4 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">
        {task.title}
      </h4>

      {/* Tags — max 2 pills, +N overflow, hidden when empty */}
      {visibleTags && (
        <div className="flex flex-wrap items-center gap-1">
          {visibleTags.shown.map((tag: any) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight"
              style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {visibleTags.overflow > 0 && (
            <span className="text-[10px] text-muted-foreground font-semibold px-0.5">
              +{visibleTags.overflow}
            </span>
          )}
        </div>
      )}

      {/* Custom field badges */}
      <CustomFieldBadges fields={fields} task={task} memberMap={memberMap} />

      {/* Metadata row — only renders when at least one item exists */}
      {hasMetadata && (
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          {subtaskProgress && (
            <span className="flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              <span>{subtaskProgress.done}/{subtaskProgress.total}</span>
            </span>
          )}
          {commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{commentCount}</span>
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span>{attachmentCount}</span>
            </span>
          )}
          {dependencyCount > 0 && (
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              <span>{dependencyCount}</span>
            </span>
          )}
        </div>
      )}

      {/* Footer — three-aligned layout */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/40">
        {/* Left: Assignee avatars — max 3, +N overflow */}
        {task.assigneeIds?.length > 0 && (
          <div className="flex items-center">
            <div className="flex -space-x-1">
              {task.assigneeIds.slice(0, 3).map((id: string) => {
                const member = memberMap[id];
                return (
                  <UserAvatar
                    key={id}
                    imageUrl={member?.imageUrl}
                    name={member?.name}
                    size="sm"
                    className="ring-1 ring-background"
                  />
                );
              })}
              {task.assigneeIds.length > 3 && (
                <div className="h-5 w-5 rounded-full bg-muted ring-1 ring-background flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                  +{task.assigneeIds.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Center: Due date — Today/Tomorrow/MMM d, overdue in red */}
        {dueDateLabel && (
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-medium",
            isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
          )}>
            <Calendar className="h-3 w-3" />
            <span>{dueDateLabel}</span>
          </div>
        )}

        {/* Right: Priority badge */}
        {task.priority && (
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight border",
            priorityInfo.bg
          )}>
            {priorityInfo.label}
          </span>
        )}
      </div>
    </div>
  );
});

const SortableTask = React.memo(function SortableTask({ 
  task, 
  onClick, 
  isSelected, 
  onSelect,
  memberMap,
  fields,
}: { 
  task: any; 
  onClick: (task: any) => void;
  isSelected: boolean;
  onSelect: (taskId: string, checked: boolean) => void;
  memberMap: Record<string, any>;
  fields: any[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "Task", task } });

  const cardStyle = useMemo(() => ({
    transform: CSS.Translate.toString(transform),
    transition,
    ...(task.color ? { borderLeftColor: task.color, borderLeftWidth: "3px" } : {}),
  }), [transform, transition, task.color]);

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={{ transform: CSS.Translate.toString(transform), transition }} 
        className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 min-h-[90px] w-full" 
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={cardStyle}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (transform) return;
        onClick(task);
      }}
      className={cn(
        "p-3 cursor-grab active:cursor-grabbing transition-all duration-200 group relative bg-card border shadow-sm rounded-lg",
        "hover:shadow-md hover:-translate-y-0.5",
        "active:scale-[1.02] active:rotate-[0.5deg] active:shadow-lg",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <div 
        className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={(checked) => onSelect(task.id, !!checked)}
          className="h-3.5 w-3.5 rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>
      <TaskCardContent task={task} memberMap={memberMap} fields={fields} />
    </Card>
  );
});

function ColumnContainer({ 
  column, 
  children 
}: { 
  column: any; 
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ 
    id: column.id, 
    data: { type: "Column", column } 
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[320px] h-full max-h-full flex flex-col bg-muted/30 rounded-xl border shadow-sm transition-colors",
        isOver && "ring-2 ring-primary/30 bg-primary/5 border-primary/30"
      )}
    >
      {children}
    </div>
  );
}

const SortableColumn = React.memo(function SortableColumn({ column, children }: {
  column: any;
  children: (handle: { attributes: any; listeners: any }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "Column", column },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex-shrink-0 w-[320px] h-full", isDragging && "opacity-40")}
    >
      <ColumnContainer column={column}>
        {children({ attributes, listeners })}
      </ColumnContainer>
    </div>
  );
});

interface KanbanBoardProps {
  boardId: string;
  onBack: () => void;
}

function isTodoColumn(name: string) {
  return isTodoColumnName(name);
}

function isDoneColumn(name: string) {
  return isDoneColumnName(name);
}

function getMoveViolation(task: any, targetColName: string, allTasks: any[], columns: any[]): string | null {
  if (!task.predecessors?.length) return null;

  for (const dep of task.predecessors) {
    const pred = dep.predecessor;
    if (!pred) continue;
    const type = dep.type || "FS";
    const predTitle = pred.title || "Predecessor";
    const predCol = columns.find((c: any) => c.id === pred.columnId);
    const predColName = predCol?.name || "";

    switch (type) {
      case "FS":
        if (!isDoneColumn(predColName)) {
          return `"${predTitle}" must be done first (Finish-to-Start)`;
        }
        break;
      case "SS":
        if (isTodoColumn(predColName)) {
          return `"${predTitle}" must be started first (Start-to-Start)`;
        }
        break;
      case "FF":
        if (isDoneColumn(targetColName) && !isDoneColumn(predColName)) {
          return `"${predTitle}" must be done first (Finish-to-Finish)`;
        }
        break;
      case "SF":
        if (isDoneColumn(targetColName) && isTodoColumn(predColName)) {
          return `"${predTitle}" must be started first (Start-to-Finish)`;
        }
        break;
    }
  }
  return null;
}

export default function KanbanBoard({ boardId }: KanbanBoardProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { memberMap } = useWorkspaceMembers(activeWorkspaceId);
  const { showConfirm, showUpgradePrompt } = usePopups();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<any>(null);
  const [activeColumn, setActiveColumn] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnCategory, setNewColumnCategory] = useState<string>(StatusCategory.TODO);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [targetColumnId, setTargetColumnId] = useState<string | null>(null);

  // New features state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<any[]>([]);

  const boardRef = useRef<any>(null);
  const dragStartBoardRef = useRef<any>(null);
  const lastColumnOverRef = useRef<string | null>(null);
  const dragStartTaskRef = useRef<any>(null);

  const handleOpenTask = useCallback((task: any) => setSelectedTask(task), []);
  const handleToggleSelect = useCallback((taskId: string, checked: boolean) => {
    setSelectedTaskIds(prev =>
      checked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  }, []);

  // Filter & Sort state
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({});
  const { data: savedViews = [] } = useQuery({
    queryKey: ["board-views", boardId],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/views`);
      if (!res.ok) throw new Error("Failed to fetch views");
      return res.json();
    },
  });

  const saveViewMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/boards/${boardId}/views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, filterConfig, sortConfig, columnVisibility }),
      });
      if (!res.ok) throw new Error("Failed to save view");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-views", boardId] });
      toast.success("View saved");
    },
    onError: () => toast.error("Failed to save view"),
  });

  const deleteViewMutation = useMutation({
    mutationFn: async (viewId: string) => {
      const res = await fetch(`/api/boards/${boardId}/views/${viewId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete view");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-views", boardId] });
      toast.success("View deleted");
    },
    onError: () => toast.error("Failed to delete view"),
  });

  const { user } = useUser();
  const boardChannel = getBoardChannel(activeWorkspaceId || "", boardId);
  const reorderRef = useRef(0);
  const ablyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleAblyUpdate = useCallback(() => {
    // Skip refetch if a reorder just finished — handleDragEnd's finally block handles it
    if (reorderRef.current > 0) return;
    if (ablyTimerRef.current) clearTimeout(ablyTimerRef.current);
    ablyTimerRef.current = setTimeout(() => {
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId, projectId: board?.projectId });
    }, 500);
  }, [queryClient, boardId]);

  const ablyClient = useAbly(boardChannel, "task:created", handleAblyUpdate);
  useAbly(boardChannel, "task:updated", handleAblyUpdate);
  useAbly(boardChannel, "task:deleted", handleAblyUpdate);
  useAbly(boardChannel, "column:created", handleAblyUpdate);
  useAbly(boardChannel, "column:updated", handleAblyUpdate);
  useAbly(boardChannel, "column:deleted", handleAblyUpdate);
  useAbly(boardChannel, "column:reordered", handleAblyUpdate);

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
    enabled: !!boardId,
  });

  const { data: dbStatuses = [] } = useStatuses(activeWorkspaceId, board?.projectId);

  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields", boardId],
    queryFn: async () => {
      const res = await fetch(`/api/custom-fields?boardId=${boardId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!boardId,
  });

  boardRef.current = board;

  const selectedTaskId = selectedTask?.id;

  // Keep selectedTask in sync with board data updates
  useEffect(() => {
    if (board && selectedTaskId) {
      const updated = (board as any).tasks?.find((t: any) => t.id === selectedTaskId);
      if (updated) setSelectedTask(updated);
    }
  }, [board, selectedTaskId]);

  const sensors = useSensors(
    useSensor(NoDndPointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createColumnMutation = useMutation({
    mutationFn: ({ name, category }: { name: string; category: string }) =>
      createColumn(boardId, name, category),
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId, projectId: board?.projectId });
      setIsColumnDialogOpen(false);
      setNewColumnName("");
      setNewColumnCategory(StatusCategory.TODO);
      toast.success("Column created");
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: ({ columnId, migrateToStatusId }: { columnId: string; migrateToStatusId?: string }) =>
      deleteColumn(columnId, migrateToStatusId),
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId, projectId: board?.projectId });
      setDeletingColumn(null);
      setDeleteTargetColumnId(null);
      toast.success("Column deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete column"),
  });

  const createTaskMutation = useMutation({
    mutationFn: async (columnId: string) => {
      const column = columns.find((c: any) => c.id === columnId);
      const status = column ? column.name.toLowerCase().replace(/\s+/g, "_") : "todo";
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
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId, projectId: board?.projectId });
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
  const [colCategory, setColCategory] = useState<string>(StatusCategory.TODO);
  const [colWip, setColWip] = useState<number | null>(null);
  const [colColor, setColColor] = useState("#4f46e5");

  const [deletingColumn, setDeletingColumn] = useState<any>(null);
  const [deleteTargetColumnId, setDeleteTargetColumnId] = useState<string | null>(null);

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
    onMutate: async (updatedCol) => {
      await queryClient.cancelQueries({ queryKey: ["board", boardId] });
      const previousBoard = queryClient.getQueryData(["board", boardId]);
      if (previousBoard) {
        queryClient.setQueryData(["board", boardId], {
          ...previousBoard,
          columns: (previousBoard as any).columns.map((c: any) =>
            c.id === updatedCol.id ? { ...c, ...updatedCol } : c
          ),
        });
      }
      return { previousBoard };
    },
    onError: (err, updatedCol, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
      }
      toast.error("Failed to update column");
    },
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId, projectId: board?.projectId });
      setEditingColumn(null);
      toast.success("Column updated");
    },
  });

  // Auto-suggest the semantic category from the column name while typing
  useEffect(() => {
    const inferred = inferStatusCategory(newColumnName);
    if (inferred) setNewColumnCategory(inferred);
  }, [newColumnName]);

  useEffect(() => {
    if (!editingColumn) return;
    const inferred = inferStatusCategory(colName);
    if (inferred) setColCategory(inferred);
  }, [colName, editingColumn]);

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
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId, projectId: board?.projectId });
      setSelectedTaskIds([]);
      toast.success("Tasks deleted successfully");
    },
  });

  const columns = useMemo(
    () => [...(board?.columns || [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
    [board]
  );
  const tasks = board?.tasks || [];

  // Filter tasks
  const filteredTasks = useMemo(() => tasks.filter((task: any) => {
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
  }), [tasks, searchQuery, filterConfig]);

  // Sort tasks
  const sortedTasks = useMemo(() => [...filteredTasks].sort((a: any, b: any) => {
    if (!sortConfig) return (a.order || 0) - (b.order || 0);
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
      case "assignee": return dir * ((a.assigneeId || "").localeCompare(b.assigneeId || ""));
      default: return 0;
    }
  }), [filteredTasks, sortConfig]);

  const allTags = useMemo(() => Array.from(
    new Map(tasks.flatMap((t: any) => t.tags || []).map((tag: any) => [tag.id, tag])).values()
  ) as any[], [tasks]);

  const handleDragStart = (event: any) => {
    const { active } = event;
    const type = active.data.current?.type;
    if (type === "Task") {
      setActiveTask(active.data.current.task);
      dragStartBoardRef.current = queryClient.getQueryData(["board", boardId]);
      dragStartTaskRef.current = active.data.current.task;
    } else if (type === "Column") {
      console.log("[col] dragStart", active.id, "| type:", type);
      lastColumnOverRef.current = null;
      setActiveColumn(active.data.current.column);
      dragStartBoardRef.current = queryClient.getQueryData(["board", boardId]);
    }
  };

  const handleDragOver = useCallback((event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Column reordering — live preview by moving the column array in the cache
    if (active.data.current?.type === "Column") {
      console.log("[col] dragOver", activeId, "->", overId);
      if (overId !== activeId) {
        lastColumnOverRef.current = overId;
      }
      const latestBoard = queryClient.getQueryData(["board", boardId]) as any;
      if (!latestBoard) return;
      const latestColumns = latestBoard.columns || [];
      const oldIndex = latestColumns.findIndex((c: any) => c.id === activeId);
      if (oldIndex === -1) return;
      let newIndex = latestColumns.findIndex((c: any) => c.id === overId);
      if (newIndex === -1) {
        const overTask = (latestBoard.tasks || []).find((t: any) => t.id === overId);
        if (!overTask) return;
        newIndex = latestColumns.findIndex((c: any) => c.id === overTask.columnId);
      }
      if (oldIndex === newIndex || newIndex === -1) return;
      const reordered = arrayMove(latestColumns, oldIndex, newIndex).map((c: any, i: number) => ({ ...c, order: i * 1000 }));
      queryClient.setQueryData(["board", boardId], { ...latestBoard, columns: reordered });
      return;
    }

    if (active.data.current?.type !== "Task") return;

    const latestBoard = queryClient.getQueryData(["board", boardId]) as any;
    if (!latestBoard) return;
    const latestTasks = latestBoard.tasks || [];
    const latestColumns = latestBoard.columns || [];

    const activeTask = latestTasks.find((t: any) => t.id === activeId);
    if (!activeTask) return;

    let targetColumnId: string;
    const overColumn = latestColumns.find((c: any) => c.id === overId);
    if (overColumn) {
      targetColumnId = overId;
    } else {
      const overTask = latestTasks.find((t: any) => t.id === overId);
      if (!overTask) return;
      targetColumnId = overTask.columnId;
    }

    if (activeTask.columnId === targetColumnId) return;

    const targetCol = latestColumns.find((c: any) => c.id === targetColumnId);
    const derivedStatus = targetCol
      ? targetCol.name.toLowerCase().replace(/\s+/g, "_")
      : undefined;

    queryClient.setQueryData(["board", boardId], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        tasks: old.tasks.map((t: any) =>
          t.id === activeId
            ? { ...t, columnId: targetColumnId, ...(derivedStatus && { status: derivedStatus }) }
            : t
        ),
      };
    });
  }, [queryClient, boardId]);

  const handleDragEnd = useCallback(async (event: any) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumn(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Column reordering — save the new order to the API
    if (active.data.current?.type === "Column") {
      const startBoard = dragStartBoardRef.current;
      const latestBoard = queryClient.getQueryData(["board", boardId]) as any;
      if (!latestBoard) return;
      const baseColumns = startBoard?.columns || latestBoard.columns || [];
      const oldIndex = baseColumns.findIndex((c: any) => c.id === activeId);
      if (oldIndex === -1) return;
      const resolvedOverId = overId !== activeId ? overId : lastColumnOverRef.current;
      let newIndex = resolvedOverId ? baseColumns.findIndex((c: any) => c.id === resolvedOverId) : -1;
      if (newIndex === -1 && resolvedOverId) {
        const overTask = (startBoard?.tasks || latestBoard.tasks || []).find((t: any) => t.id === resolvedOverId);
        if (overTask) newIndex = baseColumns.findIndex((c: any) => c.id === overTask.columnId);
      }
      if (newIndex === -1) {
        dragStartBoardRef.current = null;
        return;
      }
      if (oldIndex === newIndex) {
        console.log("[col] dragEnd EARLY-RETURN (no move) | type:", active.data.current?.type, "| hasSnapshot:", !!startBoard, "| old:", oldIndex, "new:", newIndex);
        dragStartBoardRef.current = null;
        return;
      }

      console.log("[col] dragEnd SAVING | old:", oldIndex, "new:", newIndex);
      const reordered = arrayMove(baseColumns, oldIndex, newIndex).map((c: any, i: number) => ({ ...c, order: i * 1000 }));
      const snapshotBoard = startBoard || latestBoard;
      queryClient.setQueryData(["board", boardId], { ...latestBoard, columns: reordered });

      try {
        const res = await fetch(`/api/boards/${boardId}/columns/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            columnOrders: reordered.map((c: any) => ({ id: c.id, order: c.order })),
          }),
        });
        if (!res.ok) throw new Error("Failed to save column position");
      } catch {
        if (snapshotBoard) {
          queryClient.setQueryData(["board", boardId], snapshotBoard);
        }
        toast.error("Failed to save column position");
      } finally {
        dragStartBoardRef.current = null;
        lastColumnOverRef.current = null;
        invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId, projectId: board?.projectId });
      }
      return;
    }

    if (active.data.current?.type !== "Task") return;

    const startBoard = dragStartBoardRef.current;
    const latestBoard = queryClient.getQueryData(["board", boardId]) as any;
    if (!latestBoard) return;
    const latestColumns = latestBoard.columns || [];

    const activeTaskData = dragStartTaskRef.current;
    if (!activeTaskData) return;

    let targetColumnId: string;
    let targetIndex: number;

    const overColumn = latestColumns.find((c: any) => c.id === overId);
    if (overColumn) {
      targetColumnId = overId;
      const columnTasks = (startBoard?.tasks || latestBoard.tasks || [])
        .filter((t: any) => t.columnId === targetColumnId && t.id !== activeId)
        .sort((a: any, b: any) => a.order - b.order);
      targetIndex = columnTasks.length;
    } else {
      const overTask = (startBoard?.tasks || latestBoard.tasks || [])
        .find((t: any) => t.id === overId);
      if (!overTask) return;
      targetColumnId = overTask.columnId;
      const columnTasks = (startBoard?.tasks || latestBoard.tasks || [])
        .filter((t: any) => t.columnId === targetColumnId && t.id !== activeId)
        .sort((a: any, b: any) => a.order - b.order);
      targetIndex = columnTasks.findIndex((t: any) => t.id === overId);
      if (targetIndex === -1) targetIndex = columnTasks.length;
    }

    // If dropped on the task itself, use the cache columnId from handleDragOver
    if (overId === activeId) {
      const cachedActive = latestBoard?.tasks?.find((t: any) => t.id === activeId);
      if (cachedActive && cachedActive.columnId !== activeTaskData.columnId) {
        targetColumnId = cachedActive.columnId;
        const colTasks = (latestBoard.tasks || [])
          .filter((t: any) => t.columnId === targetColumnId && t.id !== activeId)
          .sort((a: any, b: any) => a.order - b.order);
        targetIndex = colTasks.length;
      }
    }

    if (activeTaskData.columnId === targetColumnId) {
      const origColTasks = (startBoard?.tasks || latestBoard.tasks || [])
        .filter((t: any) => t.columnId === targetColumnId)
        .sort((a: any, b: any) => a.order - b.order);
      const origIndex = origColTasks.findIndex((t: any) => t.id === activeId);
      if (origIndex === targetIndex) return;
    }

    // Enforce dependency rules on cross-column moves
    if (activeTaskData.columnId !== targetColumnId) {
      const targetCol = latestColumns.find((c: any) => c.id === targetColumnId);
      const targetColName = targetCol?.name || "";
      const violation = getMoveViolation(activeTaskData, targetColName, latestBoard.tasks, latestColumns);
      if (violation) {
        toast.error(violation);
        dragStartBoardRef.current = null;
        return;
      }
    }

    const columnTasks = (startBoard?.tasks || latestBoard.tasks || [])
      .filter((t: any) => t.columnId === targetColumnId && t.id !== activeId)
      .sort((a: any, b: any) => a.order - b.order);

    const reorderedTasks = [...columnTasks];
    reorderedTasks.splice(targetIndex, 0, activeTaskData);

    const updates: { id: string; columnId: string; order: number }[] = [];

    for (let i = 0; i < reorderedTasks.length; i++) {
      const task = reorderedTasks[i];
      const newOrder = i * 1000;
      if (task.order !== newOrder || task.columnId !== targetColumnId) {
        updates.push({ id: task.id, columnId: targetColumnId, order: newOrder });
      }
    }

    if (updates.length === 0) return;

    await queryClient.cancelQueries({ queryKey: ["board", boardId] });
    const snapshotBoard = startBoard || queryClient.getQueryData(["board", boardId]);

    const columnNameMap: Record<string, string> = {};
    for (const col of latestColumns) {
      columnNameMap[col.id] = col.name;
    }

    queryClient.setQueryData(["board", boardId], (old: any) => {
      if (!old) return old;
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      return {
        ...old,
        tasks: old.tasks.map((t: any) => {
          const update = updateMap.get(t.id);
          if (update) {
            const colName = columnNameMap[update.columnId];
            const status = colName ? colName.toLowerCase().replace(/\s+/g, "_") : t.status;
            return { ...t, columnId: update.columnId, order: update.order, status };
          }
          return t;
        }),
      };
    });

    try {
      const res = await fetch(`/api/boards/${boardId}/tasks/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error("Failed to save task position");
    } catch {
      if (snapshotBoard) {
        queryClient.setQueryData(["board", boardId], snapshotBoard);
      }
      toast.error("Failed to save task position");
    } finally {
      dragStartBoardRef.current = null;
      dragStartTaskRef.current = null;
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId, projectId: board?.projectId });
      setTimeout(() => { reorderRef.current -= 1; }, 1000);
    }
  }, [queryClient, boardId]);

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

  const handleBatchDelete = () => {
    showConfirm({
      title: "Bulk Delete Tasks",
      description: `Are you sure you want to permanently delete these ${selectedTaskIds.length} tasks? This action cannot be reversed.`,
      actionLabel: `Delete ${selectedTaskIds.length} Tasks`,
      destructive: true,
      onAction: () => batchDeleteMutation.mutate(selectedTaskIds)
    });
  };

  const handleOpenColumnSettings = (column: any) => {
    setEditingColumn(column);
    setColName(column.name);
    const matchingStatus = dbStatuses.find(
      (s: any) => s.name.toLowerCase() === (column.name || "").toLowerCase()
    );
    setColCategory(matchingStatus?.category || inferStatusCategory(column.name) || StatusCategory.TODO);
    setColWip(column.wipLimit);
    setColColor(column.color || "#4f46e5");
  };

  return (
    <>
      <div className="h-full flex flex-col">
      <div className="px-6 sm:px-8 py-3 border-b bg-muted/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <FilterSortBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterConfig={filterConfig}
              onFilterChange={setFilterConfig}
              sortConfig={sortConfig}
              onSortChange={setSortConfig}
              columns={columns.map((c: any) => ({ id: c.id, name: c.name, columnType: c.columnType }))}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              allTags={allTags}
              savedViews={savedViews}
              projectId={board?.projectId}
              onSaveView={(name) => saveViewMutation.mutate(name)}
              onLoadView={(view) => {
                setFilterConfig(view.filterConfig ?? {});
                setSortConfig(view.sortConfig ?? null);
                setColumnVisibility(view.columnVisibility ?? {});
              }}
              onDeleteView={(id) => deleteViewMutation.mutate(id)}
              totalTasks={tasks.length}
              filteredCount={filteredTasks.length}
            />
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedTaskIds.length > 0 && (
        <div className="px-6 sm:px-8 py-2 border-b bg-primary/5 flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">{selectedTaskIds.length} selected</span>
          <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedTaskIds([])}>
            Deselect all
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="h-full flex gap-6 p-6 sm:p-8 overflow-x-auto">
              {columns.length === 0 ? (
                <div className="flex items-center justify-center w-full h-full min-h-[400px]">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">No columns yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Create your first column to get started</p>
                    <Button onClick={() => setIsColumnDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Create Column
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                <SortableContext items={columns.map((c: any) => c.id)} strategy={horizontalListSortingStrategy}>
                {columns.map((column: any) => {
                  const columnTasks = sortedTasks.filter((t: any) => t.columnId === column.id);
                  const taskIds = columnTasks.map((t: any) => t.id);
                  return (
                    <SortableColumn key={column.id} column={column}>
                      {({ attributes, listeners }) => (
                        <>
                      {/* Column Header */}
                      <div className="p-4 border-b bg-card rounded-t-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            {...attributes}
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="Drag to reorder column"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: column.color || "#4f46e5" }} />
                          <span className="font-semibold text-sm truncate">{column.name}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium">{columnTasks.length}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground" data-no-dnd>
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleOpenColumnSettings(column); }}>
                              <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => {
                              e.preventDefault();
                              setTargetColumnId(column.id);
                              setIsTaskDialogOpen(true);
                            }}>
                              <Plus className="h-3.5 w-3.5 mr-2" /> Add Task
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => {
                                e.preventDefault();
                                const remainingCols = columns.filter((c: any) => c.id !== column.id);
                                setDeleteTargetColumnId(remainingCols.length > 0 ? remainingCols[0].id : null);
                                setDeletingColumn(column);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {/* Column Tasks */}
                      <ScrollArea className="flex-1 p-3">
                        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                          <div className="space-y-3 min-h-[60px]">
                            {columnTasks.map((task: any) => (
                              <SortableTask
                                key={task.id}
                                task={task}
                                onClick={handleOpenTask}
                                isSelected={selectedTaskIds.includes(task.id)}
                                onSelect={handleToggleSelect}
                                memberMap={memberMap}
                                fields={customFields}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </ScrollArea>
                      {/* Add Task */}
                      <div className="p-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setTargetColumnId(column.id);
                            setIsTaskDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Task
                        </Button>
                      </div>
                      </>
                      )}
                    </SortableColumn>
                  );
                })}
                </SortableContext>
              {/* New Column Button */}
              {columns.length > 0 && (
                <div className="flex-shrink-0 w-[320px]">
                  <Button
                    variant="outline"
                    className="w-full h-32 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                    onClick={() => setIsColumnDialogOpen(true)}
                  >
                    <Plus className="h-5 w-5 mr-2" /> New Column
                  </Button>
                </div>
              )}
              </>
            )}
            </div>
            <DragOverlay>
              {activeColumn && (
                <div className="w-[320px] bg-card border shadow-2xl rounded-xl p-4 flex items-center gap-2 rotate-[1deg]">
                  <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: activeColumn.color || "#4f46e5" }} />
                  <span className="font-semibold text-sm truncate">{activeColumn.name}</span>
                </div>
              )}
              {activeTask && (
                <div
                  className="p-3 w-[320px] bg-card border shadow-2xl rounded-lg rotate-[1deg] scale-[1.02]"
                  style={activeTask.color ? { borderLeftColor: activeTask.color, borderLeftWidth: "3px" } : {}}
                >
                  <TaskCardContent task={activeTask} memberMap={memberMap} fields={customFields} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
      </div>
      </div>
      {/* New Column Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new-col-name">Column Name</Label>
              <Input id="new-col-name" placeholder="e.g., In Progress" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-col-category">Category</Label>
              <Select value={newColumnCategory} onValueChange={setNewColumnCategory}>
                <SelectTrigger id="new-col-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={StatusCategory.TODO}>To Do / Not Started</SelectItem>
                  <SelectItem value={StatusCategory.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={StatusCategory.DONE}>Done / Completed</SelectItem>
                  <SelectItem value={StatusCategory.BLOCKED}>Blocked</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Controls how Theta counts tasks in this column (completion, analytics, calendar, timeline).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsColumnDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createColumnMutation.mutate({ name: newColumnName, category: newColumnCategory })} disabled={!newColumnName || createColumnMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Settings Dialog */}
      <Dialog open={!!editingColumn} onOpenChange={(open) => !open && setEditingColumn(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Column Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-col-name">Column Name</Label>
              <Input id="edit-col-name" value={colName} onChange={(e) => setColName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-col-category">Category</Label>
              <Select value={colCategory} onValueChange={setColCategory}>
                <SelectTrigger id="edit-col-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={StatusCategory.TODO}>To Do / Not Started</SelectItem>
                  <SelectItem value={StatusCategory.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={StatusCategory.DONE}>Done / Completed</SelectItem>
                  <SelectItem value={StatusCategory.BLOCKED}>Blocked</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Controls how Theta counts tasks in this column (completion, analytics, calendar, timeline).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-wip">WIP Limit</Label>
              <Input id="col-wip" type="number" value={colWip ?? ""} onChange={(e) => setColWip(e.target.value ? parseInt(e.target.value) : null)} placeholder="No limit" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-color">Color</Label>
              <Input id="col-color" type="color" value={colColor} onChange={(e) => setColColor(e.target.value)} className="h-10 w-full p-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingColumn(null)}>Cancel</Button>
            <Button onClick={() => updateColumnMutation.mutate({ id: editingColumn.id, name: colName, wipLimit: colWip, color: colColor, category: colCategory })} disabled={!colName}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Column Confirmation Dialog */}
      <Dialog open={!!deletingColumn} onOpenChange={(open) => { if (!open) { setDeletingColumn(null); setDeleteTargetColumnId(null); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">&quot;{deletingColumn?.name}&quot;</span>?
              {deletingColumn && (() => {
                const taskCount = tasks.filter((t: any) => t.columnId === deletingColumn.id).length;
                if (taskCount > 0) {
                  return <> <span className="font-medium text-foreground">{taskCount} task{taskCount !== 1 ? "s" : ""}</span> will be moved to another column.</>;
                }
                return <> This column has no tasks.</>;
              })()}
            </p>
            {deletingColumn && tasks.filter((t: any) => t.columnId === deletingColumn.id).length > 0 && (
              <div className="space-y-2">
                <Label>Move tasks to</Label>
                <Select value={deleteTargetColumnId || ""} onValueChange={setDeleteTargetColumnId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns
                      .filter((c: any) => c.id !== deletingColumn.id)
                      .map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletingColumn(null); setDeleteTargetColumnId(null); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={tasks.filter((t: any) => t.columnId === deletingColumn?.id).length > 0 && !deleteTargetColumnId}
              onClick={() => {
                if (deletingColumn) {
                  deleteColumnMutation.mutate({
                    columnId: deletingColumn.id,
                    migrateToStatusId: deleteTargetColumnId || undefined,
                  });
                }
              }}
            >
              Delete Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsTaskDialogOpen(false);
          setTargetColumnId(null);
          setNewTaskTitle("");
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                placeholder="What needs to be done?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && targetColumnId && createTaskMutation.mutate(targetColumnId)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsTaskDialogOpen(false);
              setTargetColumnId(null);
              setNewTaskTitle("");
            }}>Cancel</Button>
            <Button onClick={() => targetColumnId && createTaskMutation.mutate(targetColumnId)} disabled={!newTaskTitle || !targetColumnId || createTaskMutation.isPending}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Sheet */}
      <TaskDialog
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => {
          setSelectedTask(null);
          invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId, projectId: board?.projectId });
        }}
        workspaceId={activeWorkspaceId || ""}
      />
  </>
  );
}


