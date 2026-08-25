"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Milestone, Plus, X, Edit, Trash2, Calendar, Flag, CheckCircle2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useWorkspaceStatuses } from "@/hooks/use-statuses";

interface MilestonePanelProps {
  projectId?: string;
  workspaceId: string;
  onMilestonesChange?: () => void;
}

interface MilestoneTask {
  id: string;
  title: string;
  status: string;
  progress: number;
  dueDate?: string;
  isCompleted: boolean;
  statusCategory: string | null;
}

interface TaskOption {
  id: string;
  title: string;
  status: string;
  statusId?: string | null;
  customStatus?: { id: string; name: string; category: string } | null;
}

interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  color: string;
  status: "planned" | "active" | "completed" | "cancelled";
  taskIds: string[];
  owner: { id: string; name: string; imageUrl?: string };
  project?: { id: string; name: string; color?: string };
  tasks?: MilestoneTask[];
}

type MilestoneStatus = "planned" | "active" | "completed" | "cancelled";

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string }> = {
  planned: { label: "Planned", color: "bg-slate-500" },
  active: { label: "Active", color: "bg-blue-500" },
  completed: { label: "Completed", color: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "bg-red-500" },
};

const PRESET_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#6366f1",
];

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function MilestonePanel({ projectId, workspaceId, onMilestonesChange }: MilestonePanelProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    color: "#f59e0b",
    status: "planned" as MilestoneStatus,
    taskIds: [] as string[],
  });
  const [projectTasks, setProjectTasks] = useState<TaskOption[]>([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "");

  const { data: workspaceStatuses } = useWorkspaceStatuses(workspaceId);
  const statusCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(workspaceStatuses)) {
      for (const s of workspaceStatuses) {
        if (s.category) map.set(s.id, s.category);
      }
    }
    return map;
  }, [workspaceStatuses]);

  const fetchMilestones = useCallback(async () => {
    try {
      const params = new URLSearchParams({ workspaceId });
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/milestones?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMilestones(data);
      }
    } catch (error) {
      console.error("Failed to fetch milestones:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, workspaceId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const pickerProjectId = projectId || selectedProjectId || editingMilestone?.project?.id;

  useEffect(() => {
    if (!isDialogOpen) return;
    if (!pickerProjectId) {
      setProjectTasks([]);
      setIsTasksLoading(false);
      return;
    }
    let cancelled = false;
    setIsTasksLoading(true);
    fetch(`/api/tasks?workspaceId=${workspaceId}&projectId=${pickerProjectId}&includeSubtasks=1&limit=200`)
      .then((res) => (res.ok ? res.json() : { tasks: [] }))
      .then((data) => {
        if (!cancelled) setProjectTasks(data.tasks || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsTasksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isDialogOpen, workspaceId, pickerProjectId]);

  const toggleTask = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      taskIds: prev.taskIds.includes(id)
        ? prev.taskIds.filter((t) => t !== id)
        : [...prev.taskIds, id],
    }));
  };

  const filteredTasks = useMemo(() => {
    if (!taskSearch.trim()) return projectTasks;
    const q = taskSearch.toLowerCase();
    return projectTasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [projectTasks, taskSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProjectId = projectId || selectedProjectId;
    if (!targetProjectId) return;
    try {
      const url = editingMilestone ? `/api/milestones/${editingMilestone.id}` : "/api/milestones";
      const method = editingMilestone ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dueDate: new Date(formData.dueDate).toISOString(),
          projectId: targetProjectId,
        }),
      });
      if (res.ok) {
        setIsDialogOpen(false);
        setEditingMilestone(null);
        resetForm();
        fetchMilestones();
        onMilestonesChange?.();
      }
    } catch (error) {
      console.error("Failed to save milestone:", error);
    }
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setFormData({
      title: milestone.title,
      description: milestone.description || "",
      dueDate: toLocalInput(milestone.dueDate),
      color: milestone.color,
      status: milestone.status,
      taskIds: milestone.taskIds || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this milestone? Linked tasks will be unmarked.")) return;
    try {
      const res = await fetch(`/api/milestones/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchMilestones();
        onMilestonesChange?.();
      }
    } catch (error) {
      console.error("Failed to delete milestone:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      dueDate: "",
      color: "#f59e0b",
      status: "planned",
      taskIds: [],
    });
    setTaskSearch("");
  };

  const handleNew = () => {
    if (!projectId && !selectedProjectId) {
      alert("Please select a project to create milestones");
      return;
    }
    setEditingMilestone(null);
    resetForm();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData((prev) => ({ ...prev, dueDate: toLocalInput(tomorrow.toISOString()) }));
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.planned;
    return <span className={cn("px-2 py-0.5 text-[9px] font-medium rounded-full", config.color, "text-white")}>{config.label}</span>;
  };

  const isOverdue = (date: string) => {
    return isPast(parseISO(date)) && !isToday(parseISO(date));
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
        <Milestone className="h-3.5 w-3.5" /> Loading milestones...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-muted-foreground/70">
          <Milestone className="h-3.5 w-3.5 text-amber-500" />
          Milestones ({milestones.length})
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNew} title="Add milestone">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground/60 border border-dashed border-border/50 rounded-lg">
          No milestones yet. Click + to add your first checkpoint.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {milestones.map((ms) => (
            <div
              key={ms.id}
              className={cn(
                "relative p-3 bg-card border border-border/50 rounded-lg transition-all hover:border-primary/20",
                isOverdue(ms.dueDate) && "border-amber-500/30 bg-amber-500/5"
              )}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 border-2 border-background"
                  style={{ backgroundColor: ms.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold truncate pr-2">{ms.title}</h4>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(ms.status)}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-foreground">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-40">
                          <button
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-left hover:bg-accent rounded"
                            onClick={() => handleEdit(ms)}
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-left text-red-500 hover:bg-accent rounded"
                            onClick={() => handleDelete(ms.id)}
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  {ms.description && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-2">{ms.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      {format(parseISO(ms.dueDate), "MMM d, yyyy")}
                      {isOverdue(ms.dueDate) && <span className="text-amber-500 font-medium">(overdue)</span>}
                      {isToday(parseISO(ms.dueDate)) && <span className="text-emerald-500 font-medium">(today)</span>}
                    </span>
                    {ms.tasks && ms.tasks.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Flag className="h-2.5 w-2.5" />
                        {ms.tasks.filter((t) => t.isCompleted).length}/{ms.tasks.length} tasks
                      </span>
                    )}
                    {ms.owner && (
                      <Avatar className="h-5 w-5" src={ms.owner.imageUrl} fallback={ms.owner.name?.charAt(0)}>
                        <AvatarFallback className="text-[8px]" />
                      </Avatar>
                    )}
                  </div>
                </div>
              </div>
              {ms.tasks && ms.tasks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {ms.tasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="flex-shrink-0 w-32 bg-muted/50 rounded border border-border/30 p-1.5"
                        title={task.title}
                      >
                        <div className="flex items-center gap-1 text-[9px]">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              task.isCompleted ? "bg-emerald-500" :
                              task.statusCategory === "IN_PROGRESS" ? "bg-blue-500" :
                              task.statusCategory === "BLOCKED" ? "bg-red-500" :
                              "bg-slate-400"
                            )}
                          />
                          <span className="truncate font-medium">{task.title}</span>
                        </div>
                        <div className="h-1 bg-muted rounded mt-1 overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        {task.dueDate && (
                          <span className="text-[8px] text-muted-foreground/50 flex justify-end mt-0.5">
                            {format(parseISO(task.dueDate), "MMM d")}
                          </span>
                        )}
                      </div>
                    ))}
                    {ms.tasks.length > 5 && (
                      <div className="flex-shrink-0 w-20 flex items-center justify-center text-[9px] text-muted-foreground bg-muted/50 rounded border border-dashed border-border/30">
                        +{ms.tasks.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base">{editingMilestone ? "Edit Milestone" : "New Milestone"}</DialogTitle>
            <DialogDescription className="text-xs">Track key project checkpoints and link related tasks</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {!projectId && (
                <div className="grid gap-2">
                  <Label htmlFor="project" className="text-xs">Project *</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-xs">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Design Review, Launch, Alpha Release"
                  required
                  maxLength={200}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional details about this milestone"
                  rows={3}
                  className="text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dueDate" className="text-xs">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Color</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all",
                          formData.color === color ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status" className="text-xs">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {pickerProjectId && (
                <div className="grid gap-2">
                  <Label className="text-xs">Linked Tasks ({formData.taskIds.length})</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
                    <Input
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      placeholder="Search tasks..."
                      className="h-8 pl-7 text-xs"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30">
                    {isTasksLoading ? (
                      <div className="p-3 text-[10px] text-muted-foreground/60">Loading tasks...</div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="p-3 text-[10px] text-muted-foreground/60">
                        {pickerProjectId ? "No tasks in this project" : "Select a project to link tasks"}
                      </div>
                    ) : (
                      filteredTasks.map((task) => {
                        const checked = formData.taskIds.includes(task.id);
                        return (
                          <label
                            key={task.id}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent/40 text-xs transition-colors",
                              checked && "bg-primary/5"
                            )}
                          >
                            <Checkbox checked={checked} onCheckedChange={() => toggleTask(task.id)} />
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                (task.customStatus?.category || statusCategoryMap.get(task.statusId || "")) === "DONE" ? "bg-emerald-500" :
                                (task.customStatus?.category || statusCategoryMap.get(task.statusId || "")) === "IN_PROGRESS" ? "bg-blue-500" :
                                (task.customStatus?.category || statusCategoryMap.get(task.statusId || "")) === "BLOCKED" ? "bg-red-500" :
                                "bg-slate-400"
                              )}
                            />
                            <span className="truncate flex-1 text-foreground/90">{task.title}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" className="text-xs">
                {editingMilestone ? "Save Changes" : "Create Milestone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}