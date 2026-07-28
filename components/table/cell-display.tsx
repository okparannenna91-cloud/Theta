"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, User, MessageSquare, Paperclip, Link2, Clock, Flag,
  CheckSquare, Square,
} from "lucide-react";
import { format } from "date-fns";
import type { Column } from "./types";
import { getStatusColor, getPriorityMeta } from "./cell-utils";

export function CellDisplay({
  col, value, row, onClick, isActive,
}: {
  col: Column; value: any; row: any; onClick: () => void; isActive?: boolean;
}) {
  if (col.type === "checkbox") {
    const isDone = row.status === "done";
    return (
      <span className="flex items-center justify-center h-full cursor-pointer" onClick={e => { e.stopPropagation(); onClick(); }}>
        {isDone
          ? <CheckSquare className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
          : <Square className="h-4 w-4 text-muted-foreground/20 hover:text-muted-foreground/40" strokeWidth={1.5} />}
      </span>
    );
  }

  if (col.type === "title") {
    const isDone = row.status === "done";
    const subtaskCount = row.subtasks?.length || 0;
    const completedSubtasks = row.subtasks?.filter((s: any) => s.completed).length || 0;
    const depCount = row.dependencies?.length || row.dependsOn?.length || 0;
    const commentCount = row._count?.comments || 0;
    const attachmentCount = row._count?.attachments || 0;
    return (
      <div className="flex items-center gap-2 min-w-0 h-full">
        {subtaskCount > 0 && (
          <div className="shrink-0 flex items-center gap-0.5">
            {completedSubtasks === subtaskCount ? (
              <CheckSquare className="h-3 w-3 text-emerald-500" strokeWidth={1.5} />
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground/40 tabular-nums">{completedSubtasks}/{subtaskCount}</span>
            )}
          </div>
        )}
        <span className={cn(
          "text-[13px] font-medium truncate leading-none",
          "hover:text-primary transition-colors cursor-pointer",
          isDone && "line-through text-muted-foreground/50",
        )}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          title="Open task">
          {row.title || "Untitled"}
        </span>
        <span className="flex items-center gap-2 ml-auto shrink-0">
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40 tabular-nums">
              <MessageSquare className="h-3 w-3" strokeWidth={1.5} />
              {commentCount}
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40 tabular-nums">
              <Paperclip className="h-3 w-3" strokeWidth={1.5} />
              {attachmentCount}
            </span>
          )}
          {depCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40 tabular-nums">
              <Link2 className="h-3 w-3" strokeWidth={1.5} />
              {depCount}
            </span>
          )}
          {row.estimatedHours > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40 tabular-nums">
              <Clock className="h-3 w-3" strokeWidth={1.5} />
              {row.estimatedHours}h
            </span>
          )}
        </span>
      </div>
    );
  }

  if (col.type === "status") {
    const color = getStatusColor(value);
    return (
      <div className="flex items-center gap-2 h-full">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs capitalize text-foreground/80">{typeof value === "string" ? value.replace(/[_-]/g, " ") : "todo"}</span>
      </div>
    );
  }

  if (col.type === "priority") {
    const meta = getPriorityMeta(value);
    return (
      <span className={cn("inline-flex items-center gap-2 text-xs font-medium", meta.text)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
        {meta.label}
      </span>
    );
  }

  if (col.type === "assignee") {
    const assignees = (value || []).slice(0, 3);
    const overflow = (value || []).length - 3;
    if (!assignees.length) return <User className="h-4 w-4 text-muted-foreground/20" strokeWidth={1.5} />;
    return (
      <div className="flex -space-x-1.5 items-center h-full">
        {assignees.map((id: string, i: number) => (
          <div key={id || i} className="h-6 w-6 rounded-full ring-2 ring-background bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary">
            {id?.[0]?.toUpperCase() || "?"}
          </div>
        ))}
        {overflow > 0 && (
          <div className="h-6 w-6 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
            +{overflow}
          </div>
        )}
      </div>
    );
  }

  if (col.type === "date" || col.type === "dueDate" || col.type === "startDate") {
    if (!value) return <span className="text-xs text-muted-foreground/30">—</span>;
    let d: Date;
    try { d = new Date(value); if (isNaN(d.getTime())) throw new Error("invalid"); } catch { return <span className="text-xs">{String(value)}</span>; }
    const isOverdue = col.id === "dueDate" && d < new Date() && row.status !== "done";
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs", isOverdue ? "text-red-500 font-medium" : "text-muted-foreground/70")}>
        <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} />
        {format(d, "MMM d")}
      </span>
    );
  }

  if (col.type === "progress") {
    const p = Math.min(100, Math.max(0, value || 0));
    return (
      <div className="flex items-center gap-2.5 h-full">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden" style={{ maxWidth: 64 }}>
          <div className="h-full rounded-full bg-foreground/40 transition-all" style={{ width: `${p}%` }} />
        </div>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground/60">{p}%</span>
      </div>
    );
  }

  if (col.type === "project") {
    return (
      <span className="inline-flex text-xs text-muted-foreground/60">
        {value || "—"}
      </span>
    );
  }

  if (col.type === "sprint") {
    return <span className="text-xs text-muted-foreground/60">{value ? String(value).replace(/[_-]/g, " ") : "—"}</span>;
  }

  if (col.type === "milestone") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <Flag className="h-3 w-3" strokeWidth={1.5} />
        {value ? String(value).replace(/[_-]/g, " ") : "—"}
      </span>
    );
  }

  if (col.type === "labels" || col.type === "tags") {
    return (
      <div className="flex items-center gap-1 flex-wrap h-full">
        {(value || []).slice(0, 2).map((t: string, i: number) => (
          <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground/70 font-medium">{t}</span>
        ))}
        {(value || []).length > 2 && <span className="text-[10px] text-muted-foreground/40">+{(value || []).length - 2}</span>}
      </div>
    );
  }

  if (col.type === "number" || col.type === "estimate" || col.type === "storyPoints") {
    return <span className="text-xs tabular-nums text-muted-foreground/80">{value ?? "—"}</span>;
  }

  if (col.type === "boolean") {
    return (
      <div className={cn("h-3.5 w-6 rounded-full transition-colors relative", value ? "bg-foreground/30" : "bg-muted")}>
        <div className={cn("h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-all absolute top-[2px]", value ? "left-[14px]" : "left-[2px]")} />
      </div>
    );
  }

  if (col.type === "color") {
    return (
      <div className="h-4 w-4 rounded-full border border-border/40" style={value ? { backgroundColor: value } : { background: "linear-gradient(135deg, #e2e8f0, #94a3b8)" }} />
    );
  }

  if (col.type === "createdBy") {
    return <span className="text-xs text-muted-foreground/60">{value || "—"}</span>;
  }

  if (col.type === "updatedAt") {
    if (!value) return <span className="text-xs text-muted-foreground/60">—</span>;
    try { return <span className="text-xs text-muted-foreground/60 tabular-nums">{format(new Date(value), "MMM d")}</span>; }
    catch { return <span className="text-xs text-muted-foreground/60">—</span>; }
  }

  return <span className="text-xs truncate text-muted-foreground/80">{String(value ?? "")}</span>;
}