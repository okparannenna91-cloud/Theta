"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Circle, CheckCircle2, MoreVertical, Plus } from "lucide-react";
import { TaskDialog } from "@/components/tasks/task-dialog";

interface ProjectTasksViewProps {
    project: any;
}

export function ProjectTasksView({ project }: ProjectTasksViewProps) {
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const tasks = project.tasks || [];

    return (
        <div className="space-y-4 h-full overflow-y-auto pr-2">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Project Tasks ({tasks.length})</h3>
            </div>

            <div className="grid gap-3">
                {tasks.map((task: any) => (
                    <Card
                        key={task.id}
                        className="group p-4 flex items-center gap-4 hover:border-indigo-500/50 cursor-pointer transition-all shadow-sm"
                        onClick={() => setSelectedTask(task)}
                    >
                        {task.status === "done" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                            <Circle className="h-5 w-5 text-slate-300" />
                        )}

                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold truncate group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                            <div className="flex items-center gap-3 mt-1">
                                <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter bg-slate-50 border-none px-2">
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
                                            <div className="h-full bg-indigo-500" style={{ width: `${task.progress}%` }} />
                                        </div>
                                        <span className="text-[9px] font-black text-indigo-600">{task.progress}%</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                        </div>
                    </Card>
                ))}
            </div>

            {tasks.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed">
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
