"use client";

import {
  CalendarDays,
  Flag,
  User,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  high: "text-rose-500 border-rose-500/20 bg-rose-500/10",
  medium: "text-amber-500 border-amber-500/20 bg-amber-500/10",
  low: "text-emerald-500 border-emerald-500/20 bg-emerald-500/10",
};

export function TaskCard({ task }: { task: { title: string; priority?: string; status?: string; assignee?: string; dueDate?: string } }) {
  return (
    <div className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span className="text-sm font-semibold text-foreground truncate">{task.title}</span>
        </div>
        {task.priority && (
          <span className={cn("shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border", priorityColors[task.priority] || "")}>
            {task.priority}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        {task.status && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.status}
          </span>
        )}
        {task.assignee && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {task.assignee}
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProjectCard({ project }: { project: { name: string; description?: string; status?: string; taskCount?: number } }) {
  return (
    <div className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-1.5">
        <FolderKanban className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{project.name}</span>
      </div>
      {project.description && (
        <p className="text-[11px] text-muted-foreground mb-2 line-clamp-1">{project.description}</p>
      )}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {project.status && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {project.status}
          </span>
        )}
        {project.taskCount !== undefined && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {project.taskCount} tasks
          </span>
        )}
      </div>
    </div>
  );
}

export function FileCard({ file }: { file: { name: string; url?: string; size?: string } }) {
  return (
    <a
      href={file.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-all hover:border-primary/30 group"
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
        <FileText className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{file.name}</p>
        {file.size && <p className="text-[10px] text-muted-foreground">{file.size}</p>}
      </div>
      <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

export function PollCard({ poll }: { poll: { question: string; options: string[]; votes?: Record<string, number> } }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs font-semibold text-foreground mb-3">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const total = poll.votes ? Object.values(poll.votes).reduce((a, b) => a + b, 0) : 0;
          const count = poll.votes?.[opt] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={i} className="relative p-2 rounded-lg bg-muted/50 overflow-hidden">
              <div
                className="absolute inset-0 bg-primary/10 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between text-[11px]">
                <span className="text-foreground font-medium">{opt}</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChecklistCard({ items }: { items: { text: string; done: boolean }[] }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className={cn(
            "w-3.5 h-3.5 rounded border flex items-center justify-center",
            item.done ? "bg-primary border-primary" : "border-muted-foreground/30"
          )}>
            {item.done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
          </div>
          <span className={cn(item.done ? "text-muted-foreground line-through" : "text-foreground")}>
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}
