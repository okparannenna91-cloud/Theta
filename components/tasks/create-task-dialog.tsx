"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/common/image-upload";
import { AiGenerator } from "@/components/ai/ai-generator";
import { Sparkles } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { useStatuses, getStatusValue, FALLBACK_STATUSES } from "@/hooks/use-statuses";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { toast } from "sonner";

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  defaultStatus?: string;
}

export function CreateTaskDialog({
  isOpen,
  onOpenChange,
  defaultProjectId = "",
  defaultStatus = "todo",
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState("medium");
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [coverImage, setCoverImage] = useState("");

  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const { showUpgradePrompt } = usePopups();
  const { data: dbStatuses } = useStatuses(activeWorkspaceId);
  const statuses = (dbStatuses && dbStatuses.length > 0 ? dbStatuses : FALLBACK_STATUSES).map(s => ({
      id: getStatusValue(s.name),
      name: s.name,
  }));

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", activeWorkspaceId],
    queryFn: async () => {
      const url = activeWorkspaceId ? `/api/tasks?workspaceId=${activeWorkspaceId}` : "/api/tasks";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const taskLimits = tasksData?.limits || { max: -1, current: 0, hasAccess: true };

  const { data: projectsData } = useQuery({
    queryKey: ["projects", activeWorkspaceId],
    queryFn: async () => {
      const url = activeWorkspaceId ? `/api/projects?workspaceId=${activeWorkspaceId}` : "/api/projects";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const projects = Array.isArray(projectsData?.projects) ? projectsData.projects : Array.isArray(projectsData) ? projectsData : [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, workspaceId: activeWorkspaceId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create task");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setStatus(defaultStatus);
      setPriority("medium");
      setProjectId(defaultProjectId);
      setCoverImage("");
      toast.success("Task created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create task");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    if (taskLimits.max !== -1 && taskLimits.current >= taskLimits.max) {
      showUpgradePrompt("tasks");
      return;
    }

    createMutation.mutate({
      title,
      description,
      status,
      priority,
      projectId: projectId && projectId !== "no-project" ? projectId : undefined,
      coverImage,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Cover Image</Label>
            <div className="mt-2">
              <ImageUpload
                value={coverImage}
                onChange={setCoverImage}
                onRemove={() => setCoverImage("")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Task Title</Label>
            <div className="relative">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="pr-10"
                placeholder="What needs to be done?"
              />
              <button
                type="button"
                onClick={async () => {
                    if (!title) return;
                    const res = await fetch("/api/ai/recommend", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title, workspaceId: activeWorkspaceId })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.priority) setPriority(data.priority);
                        if (data.projectId && data.projectId !== "no-project") setProjectId(data.projectId);
                        toast.success("Nova recommended priority and project!");
                    }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-600 transition-colors"
                title="Nova Recommendation"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <AiGenerator
                onGenerate={(text) => setDescription(text)}
                initialPrompt={`Description for a task titled "${title}"`}
                title="Generate Task Description"
              />
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="project">Project</Label>
            <Select
              value={projectId}
              onValueChange={(val) => setProjectId(val)}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-project">No Project</SelectItem>
                {projects?.map((project: any) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
