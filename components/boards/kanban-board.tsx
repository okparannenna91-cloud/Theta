"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

function SortableTask({ task }: { task: any }) {
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group relative"
    >
      <h4 className="font-medium mb-1">{task.title}</h4>
      {task.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <Badge
          className={
            task.priority === "high"
              ? "bg-red-100/50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : task.priority === "medium"
                ? "bg-yellow-100/50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          }
        >
          {task.priority}
        </Badge>
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
  const [activeTask, setActiveTask] = useState<any>(null);

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

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
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

    // Find the column the task was dropped on
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
    <div className="p-4 sm:p-6 lg:p-8 h-full bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{board?.name}</h1>
            <p className="text-sm text-muted-foreground">Manage tasks across progress columns</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            New Column
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-6 h-full items-start px-2">
          {columns.map((column: any) => {
            const columnTasks = tasks.filter((t: any) => t.columnId === column.id);
            return (
              <div key={column.id} className="flex-shrink-0 w-80">
                <Card className="bg-slate-100/50 dark:bg-slate-900/50 border-none shadow-sm h-full flex flex-col">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-700 dark:text-slate-200">{column.name}</h3>
                      <Badge variant="outline" className="bg-white dark:bg-slate-800 border-none shadow-sm">{columnTasks.length}</Badge>
                    </div>
                  </div>
                  <div className="p-2 gap-2 flex flex-col flex-1 overflow-y-auto">
                    <SortableContext
                      id={column.id}
                      items={columnTasks.map((t: any) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {columnTasks.map((task: any) => (
                        <SortableTask key={task.id} task={task} />
                      ))}
                    </SortableContext>
                    <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 mt-2 border-dashed border-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="p-3 bg-white dark:bg-slate-800 border rounded-lg shadow-xl opacity-90 scale-105 transition-transform rotate-2 border-indigo-500">
              <h4 className="font-medium mb-1">{activeTask.title}</h4>
              <Badge className="bg-indigo-100 text-indigo-700">{activeTask.priority}</Badge>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

