"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FolderKanban, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/common/image-upload";
import { AiGenerator } from "@/components/ai/ai-generator";
import Link from "next/link";
import Image from "next/image";

import { useWorkspace } from "@/hooks/use-workspace";

async function fetchProjects(workspaceId: string | null) {
  const url = workspaceId ? `/api/projects?workspaceId=${workspaceId}` : "/api/projects";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

async function createProject(data: { name: string; description?: string; color?: string; coverImage?: string; workspaceId: string }) {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to create project");
  }
  return res.json();
}

async function deleteProject(id: string) {
  const res = await fetch(`/api/projects/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete project");
  return res.json();
}

export default function ProjectsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", activeWorkspaceId],
    queryFn: () => fetchProjects(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string; coverImage?: string }) =>
      createProject({ ...data, workspaceId: activeWorkspaceId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspaceId] });
      setIsOpen(false);
      setName("");
      setDescription("");
      setCoverImage("");
      import("sonner").then(({ toast }) => toast.success("Project created successfully"));
    },
    onError: (error: any) => {
      import("sonner").then(({ toast }) => toast.error(error.message || "Failed to create project"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspaceId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
    createMutation.mutate({ name, description, coverImage });
  };

  const handleAiGenerate = (text: string) => {
    setDescription(text);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-48 sm:w-64 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Projects</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage and organize your projects
          </p>
        </motion.div>
        <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {projects?.map((project: any, i: number) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={`/projects/${project.id}`}>
              <Card className="hover:shadow-lg transition-shadow overflow-hidden group cursor-pointer">
                {project.coverImage && (
                  <div className="relative h-32 w-full">
                    <Image
                      src={project.coverImage}
                      alt={project.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <CardHeader className={project.coverImage ? "pt-4" : ""}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {!project.coverImage && <FolderKanban className="h-5 w-5 text-blue-600" />}
                      <CardTitle>{project.name}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {project.description && (
                    <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {project._count?.tasks || 0} tasks
                  </p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {projects?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No projects yet. Create your first project!
          </p>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
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
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Website Redesign"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <AiGenerator
                  onGenerate={handleAiGenerate}
                  initialPrompt={`Description for a project named "${name}"`}
                  title="Generate Description"
                />
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project goals..."
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
