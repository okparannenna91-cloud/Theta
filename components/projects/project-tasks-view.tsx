"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Circle, CheckCircle2, MoreVertical } from "lucide-react";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { cn } from "@/lib/utils";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ProjectTasksViewProps {
    project: any;
}

export function ProjectTasksView({ project }: ProjectTasksViewProps) {
    const queryClient = useQueryClient();
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const safeTasks = Array.isArray(project?.tasks) ? project.tasks : [];

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update task");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            queryClient.invalidateQueries({ queryKey: ["project", project.id] });
            toast.success("Task updated");
        },
    });

    const handleToggleDone = (e: React.MouseEvent, task: any) => {
        e.stopPropagation();
        const newStatus = (task.status === "done") ? "todo" : "done";
        updateMutation.mutate({ id: task.id, data: { status: newStatus } });
    };

    return (
        <div className="space-y-4 h-full overflow-y-auto pr-2">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-500">Project Tasks ({safeTasks.length})</h3>
            </div>

            <div className="grid gap-3">
                {safeTasks.map((task: any) => {
                    if (!task || !task.id) return null;
                    return (
                        <Card
                            key={task.id}
                            className="group p-4 flex items-center gap-4 hover:border-primary/20 cursor-pointer transition-all shadow-sm"
                            onClick={() => setSelectedTask(task)}
                        >
                            <button
                                onClick={(e) => handleToggleDone(e, task)}
                                className="hover:scale-110 transition-transform active:scale-95 z-10"
                            >
                                {task.status === "done" ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                    <Circle className="h-5 w-5 text-slate-300 hover:text-emerald-500/50" />
                                )}
                            </button>

                            <div className="flex-1 min-w-0">
                                <h4 className={cn("text-sm font-bold truncate group-hover:text-primary transition-colors", (task.status === "done") && "line-through text-muted-foreground opacity-50")}>{task.title}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="outline" className="text-[9px] font-semibold bg-muted border-none px-2">
                                        {task.priority || "Medium"}
                                    </Badge>
                                    {task.dueDate && (
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            Due {new Date(task.dueDate).toLocaleDateString()}
                                        </span>
                                    )}
                                    {task.progress > 0 && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${task.progress}%` }} />
                                            </div>
                                            <span className="text-[9px] font-semibold text-primary">{task.progress}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                            </div>
                        </Card>
                    );
                })}
            </div>

            {safeTasks.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed">
                    <p className="text-sm text-muted-foreground italic">No tasks assigned to this project yet.</p>
                </div>
            )}

            {selectedTask && (
                <TaskDialog
                    task={selectedTask}
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    workspaceId={project.workspaceId}
                />
            )}
        </div>
    );
}
