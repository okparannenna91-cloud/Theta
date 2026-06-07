"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LayoutGrid, List, Search, Plus, Filter,
  MoreHorizontal, Star, Clock, User, CalendarDays,
  MessageSquare, Paperclip, ListChecks, Flag
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface GalleryViewProps {
  tasks: any[];
  columns: any[];
  onSelectTask: (task: any) => void;
}

export default function GalleryView({ tasks, columns, onSelectTask }: GalleryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cardSize, setCardSize] = useState<"sm" | "md" | "lg">("md");

  const filteredTasks = tasks.filter(t =>
    !searchQuery || t.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const gridCols = cardSize === "sm" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    : cardSize === "lg" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  const statusColor: Record<string, string> = {
    todo: "bg-slate-400",
    in_progress: "bg-amber-400",
    done: "bg-emerald-400",
    completed: "bg-emerald-400",
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Gallery</h3>
          <p className="text-xs text-muted-foreground">{filteredTasks.length} cards</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search cards..."
              className="h-8 pl-8 w-48 text-xs rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
            {(["sm", "md", "lg"] as const).map(size => (
              <button
                key={size}
                onClick={() => setCardSize(size)}
                className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", cardSize === size && "bg-white dark:bg-slate-800 shadow-sm")}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={cn("grid gap-4 flex-1 overflow-auto pb-4", gridCols)}>
        {filteredTasks.map((task) => {
          const completedSubtasks = task.subtasks?.filter((s: any) => s.completed).length || 0;
          const totalSubtasks = task.subtasks?.length || 0;
          const hasCover = task.coverImage;

          return (
            <Card
              key={task.id}
              className="group border shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden"
              onClick={() => onSelectTask(task)}
            >
              {hasCover && (
                <div className="aspect-video bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
                  <Image src={task.coverImage} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              {!hasCover && (
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center">
                    <Flag className="h-6 w-6 text-primary" />
                  </div>
                </div>
              )}
              <CardContent className={cn("p-4", cardSize === "sm" && "p-3")}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={cn("flex items-center gap-1.5", cardSize === "sm" ? "flex-col items-start" : "")}>
                    <div className={cn("h-2 w-2 rounded-full", statusColor[task.status] || "bg-slate-400")} />
                    <span className="text-[10px] font-bold text-slate-500">
                      {task.status?.replace("_", " ") || "Todo"}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-36">
                      <DropdownMenuItem className="text-xs">Open</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs">Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs text-red-500">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h4 className={cn(
                  "font-semibold leading-snug mb-2",
                  cardSize === "sm" ? "text-xs" : "text-sm"
                )}>
                  {task.title}
                </h4>

                {task.description && cardSize !== "sm" && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                    {task.description}
                  </p>
                )}

                {task.priority && (
                  <div className="flex items-center gap-1 mb-2">
                    <Flag className={cn(
                      "h-3 w-3",
                      task.priority === "high" ? "text-red-500" :
                      task.priority === "medium" ? "text-amber-500" : "text-emerald-500"
                    )} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{task.priority}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(task.dueDate), "MMM d")}
                    </span>
                  )}
                  {totalSubtasks > 0 && (
                    <span className="flex items-center gap-1">
                      <ListChecks className="h-3 w-3" />
                      {completedSubtasks}/{totalSubtasks}
                    </span>
                  )}
                  {task._count?.comments > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {task._count.comments}
                    </span>
                  )}
                  {task.attachments && <Paperclip className="h-3 w-3" />}
                </div>

                {task.tags && task.tags.length > 0 && cardSize !== "sm" && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {task.tags.map((tag: any) => (
                      <Badge
                        key={tag.id}
                        className="text-[8px] px-1.5 py-0 font-bold border-none"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <LayoutGrid className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">No cards to display</p>
            <p className="text-xs mt-1">Create tasks to populate the gallery</p>
          </div>
        </div>
      )}
    </div>
  );
}
