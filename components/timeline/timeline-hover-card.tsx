"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, User, Flag, Tag, CheckCircle2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPriorityColor, getStatusColor } from "./timeline-utils";
import { useWorkspace } from "@/hooks/use-workspace";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { UserAvatar } from "@/components/ui/user-avatar";

interface TimelineHoverCardProps {
  task: any;
}

export function TimelineHoverCard({ task }: TimelineHoverCardProps) {
  const priorityColor = getPriorityColor(task.priority);
  const statusColor = getStatusColor(task.status);
  const { activeWorkspaceId } = useWorkspace();
  const { memberMap } = useWorkspaceMembers(activeWorkspaceId);

  const statusLabel = task.status
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const dateRange = useMemo(() => {
    if (task.isMilestone && task.dueDate) {
      return format(parseISO(task.dueDate), "MMM d, yyyy");
    }
    const start = task.startDate ? format(parseISO(task.startDate), "MMM d") : "—";
    const end = task.dueDate ? format(parseISO(task.dueDate), "MMM d, yyyy") : "—";
    return `${start} → ${end}`;
  }, [task]);

  const taskColor = task.color || "";

  const assignees = (task.assigneeIds || [])
    .map((id: string) => memberMap[id]?.user)
    .filter(Boolean);

  return (
    <div className="w-72 rounded-xl border-subtle bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      {taskColor && (
        <div className="h-1 w-full" style={{ backgroundColor: taskColor }} />
      )}
      <div className="p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {task.isMilestone && (
              <Target className="h-4 w-4 text-amber-500 flex-shrink-0" />
            )}
            <span className="text-sm font-semibold leading-tight truncate">
              {task.title}
            </span>
          </div>
          {task.isMilestone && (
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded shrink-0">
              Milestone
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{dateRange}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Flag className="h-3.5 w-3.5 flex-shrink-0" style={{ color: priorityColor }} />
            <span className="capitalize">{task.priority}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <div
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusColor }}
            />
            <span>{statusLabel}</span>
          </div>

          {assignees.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <User className="h-3.5 w-3.5 flex-shrink-0" />
              <div className="flex -space-x-1">
                {assignees.map((u: any) => (
                  <UserAvatar key={u.id} imageUrl={u.imageUrl} name={u.name} size="sm" className="ring-1 ring-background" />
                ))}
              </div>
            </div>
          )}

          {task.project?.name && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Tag className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{task.project.name}</span>
            </div>
          )}
        </div>

        {task.progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(task.progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
              />
            </div>
          </div>
        )}

        {task.status === "done" && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </div>
        )}
      </div>
    </div>
  );
}
