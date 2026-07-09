"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Plus, FolderKanban, Trash2, Edit2, MoreVertical,
    Search, LayoutGrid, List, CheckCircle2, Calendar, Sparkles, AlertTriangle
} from "lucide-react";
import { ImageUpload } from "@/components/common/image-upload";
import { AiGenerator } from "@/components/ai/ai-generator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";

import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const { showUpgradePrompt, showAISuggestion } = usePopups();
  const router = useRouter();
  const projectsSuggested = useRef(false);
  const activeWorkspaceIdRef = useRef(activeWorkspaceId);
  useEffect(() => { activeWorkspaceIdRef.current = activeWorkspaceId; }, [activeWorkspaceId]);

  const { data: projectsData, isLoading, error: projectsError } = useQuery({
    queryKey: ["projects", activeWorkspaceId],
    queryFn: async () => {
        const url = activeWorkspaceId ? `/api/projects?workspaceId=${activeWorkspaceId}` : "/api/projects";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch projects");
        return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const projects = useMemo(() => {
    return Array.isArray(projectsData?.projects) ? projectsData.projects : Array.isArray(projectsData) ? projectsData : [];
  }, [projectsData]);
  const limits = projectsData?.limits || { max: -1, current: 0, hasAccess: true };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
        const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to create project");
        return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspaceIdRef.current] });
      setIsOpen(false);
      setName("");
      setDescription("");
      setCoverImage("");
      setVisibility("private");
      toast.success("Project created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
        const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete project");
        return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspaceIdRef.current] });
      toast.success("Project deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete project");
    },
  });

  useEffect(() => {
    if (!projectsSuggested.current && !isLoading && projects.length === 0) {
      projectsSuggested.current = true;
      showAISuggestion("Your projects area is empty. I can help you create a project with AI — just describe what you're working on.", {
        type: "no_projects",
        workspaceId: activeWorkspaceId,
      });
    }
  }, [isLoading, projects, showAISuggestion, activeWorkspaceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceIdRef.current) return;
    if (limits.max !== -1 && limits.current >= limits.max) {
      showUpgradePrompt("projects");
      return;
    }
    createMutation.mutate({ name, description, coverImage, visibility, workspaceId: activeWorkspaceIdRef.current });
  };

  const processedProjects = useMemo(() => {
      if (!Array.isArray(projects)) return [];
      let filtered = projects.map((p: any) => {
          const tasks = p.tasks || [];
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter((t: any) => t.status === "done").length;
          const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
          let status = "Active";
          if (progress === 100 && totalTasks > 0) status = "Completed";
          else if (progress < 40 && totalTasks > 0) status = "At Risk";
          return { ...p, totalTasks, completedTasks, progress, derivedStatus: status };
      });
      if (searchQuery) {
          filtered = filtered.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      if (statusFilter !== "all") {
          filtered = filtered.filter((p: any) => p.derivedStatus.toLowerCase() === statusFilter.toLowerCase());
      }
      if (sortBy === "newest") filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (sortBy === "progress") filtered.sort((a: any, b: any) => b.progress - a.progress);
      if (sortBy === "tasks") filtered.sort((a: any, b: any) => b.totalTasks - a.totalTasks);
      return filtered;
  }, [projects, searchQuery, statusFilter, sortBy]);

  if (projectsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full border shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle className="text-base">Connection Issue</CardTitle>
            <CardDescription>We couldn&apos;t retrieve your projects. Please try again.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-56 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your workspace projects and portfolios
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
          <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "Create a new project. Help me define the name, description, and goals." } }))} className="gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Create with AI
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative w-full lg:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search projects..." className="pl-9 h-10"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-36 text-xs">
                      <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="at risk">At Risk</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-10 w-36 text-xs">
                      <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="progress">Progress</SelectItem>
                      <SelectItem value="tasks">Task Count</SelectItem>
                  </SelectContent>
              </Select>
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                  <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}>
                      <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}>
                      <List className="h-4 w-4" />
                  </Button>
              </div>
          </div>
      </div>

      {processedProjects.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          {searchQuery ? (
            <>
              <h3 className="text-sm font-semibold mb-2">No matching projects</h3>
              <p className="text-sm text-muted-foreground mb-4">No projects found matching &quot;{searchQuery}&quot;. Try a different search term.</p>
              <Button onClick={() => setSearchQuery("")} variant="outline">Clear Search</Button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first project to get started.</p>
              <div className="flex gap-3">
                <Button onClick={() => setIsOpen(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
                <Button onClick={() => window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "Create a new project. Help me define the name, description, and goals." } }))} variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Create with AI
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {processedProjects.map((project: any) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className={cn(
                "border shadow-sm hover:border-primary/30 transition-colors cursor-pointer group overflow-hidden",
                viewMode === "list" ? "flex items-center" : ""
              )}>
                {project.coverImage && viewMode === "grid" && (
                  <div className="relative h-44 w-full overflow-hidden">
                    <Image src={project.coverImage} alt={project.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    <Badge className={cn(
                      "absolute top-3 right-3 rounded-md text-xs px-2 py-0.5 font-medium",
                      project.derivedStatus === "Completed" ? "bg-emerald-500/80 text-white" :
                      project.derivedStatus === "At Risk" ? "bg-rose-500/80 text-white" :
                      "bg-primary/80 text-white"
                    )}>
                        {project.derivedStatus}
                    </Badge>
                  </div>
                )}

                <CardContent className={cn("p-4 flex-1", viewMode === "list" ? "flex items-center gap-6 py-4" : "")}>
                  <div className={viewMode === "list" ? "flex items-center gap-4 flex-1" : "mb-4"}>
                    {!project.coverImage && (
                      <div className="flex items-center gap-4 mb-3">
                        <Badge className={cn(
                          "rounded-md text-xs px-2 py-0.5 font-medium",
                          project.derivedStatus === "Completed" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                          project.derivedStatus === "At Risk" ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" :
                          "bg-primary/10 text-primary border border-primary/20"
                        )}>
                            {project.derivedStatus}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{project.name}</h3>
                        {project.description && viewMode === "grid" && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{project.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={viewMode === "list" ? "w-48 mr-6" : "mb-4"}>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span className={cn("font-medium", project.progress === 100 ? "text-emerald-600" : "text-primary")}>{Math.round(project.progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn(
                        "h-full rounded-full transition-all",
                        project.progress === 100 ? "bg-emerald-500" : "bg-primary"
                      )} style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>

                  <div className={cn("flex items-center justify-between", viewMode === "list" ? "gap-8" : "pt-3 border-t")}>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        <span>{project.completedTasks}/{project.totalTasks}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{format(new Date(project.createdAt), "MMM d")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {project.team?.members && project.team.members.length > 0 && (
                        <div className="flex -space-x-2">
                          {project.team.members.slice(0, 3).map((member: any) => (
                            <Avatar key={member.userId} className="h-7 w-7 ring-2 ring-background">
                              <AvatarImage src={member.user?.imageUrl} />
                              <AvatarFallback className="text-[10px] font-medium bg-primary text-primary-foreground">{member.user?.name?.[0]}</AvatarFallback>
                            </Avatar>
                          ))}
                          {project.team.members.length > 3 && (
                            <div className="h-7 w-7 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              +{project.team.members.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/projects/${project.id}/settings`); }}>
                            <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteMutation.mutate(project.id); }} className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <ImageUpload value={coverImage} onChange={setCoverImage} onRemove={() => setCoverImage("")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="My Project" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <AiGenerator onGenerate={(text) => setDescription(text)} initialPrompt={`Description for a project named "${name}"`} title="Generate Description" />
              </div>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your project..." />
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select name="visibility" value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="team_access">Team Access</SelectItem>
                    <SelectItem value="workspace_visible">Workspace Visible</SelectItem>
                  </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Project"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
