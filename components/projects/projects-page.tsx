"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Plus, FolderKanban, Trash2, Edit2, MoreVertical, 
    Search, LayoutGrid, List, Calendar, CheckCircle2, 
    AlertCircle, Clock
} from "lucide-react";
import { ImageUpload } from "@/components/common/image-upload";
import { AiGenerator } from "@/components/ai/ai-generator";
import Link from "next/link";
import Image from "next/image";
import { format, isPast } from "date-fns";

import { useWorkspace } from "@/hooks/use-workspace";

export default function ProjectsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  
  // Portfolio Filters & View State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", activeWorkspaceId],
    queryFn: async () => {
        const url = activeWorkspaceId ? `/api/projects?workspaceId=${activeWorkspaceId}` : "/api/projects";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch projects");
        return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

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
      queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspaceId] });
      setIsOpen(false);
      setName("");
      setDescription("");
      setCoverImage("");
      import("sonner").then(({ toast }) => toast.success("Project created successfully"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
        const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete project");
        return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspaceId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
    createMutation.mutate({ name, description, coverImage, workspaceId: activeWorkspaceId });
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

      // Filter by Search
      if (searchQuery) {
          filtered = filtered.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }

      // Filter by Status
      if (statusFilter !== "all") {
          filtered = filtered.filter((p: any) => p.derivedStatus.toLowerCase() === statusFilter.toLowerCase());
      }

      // Sort
      if (sortBy === "newest") filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (sortBy === "progress") filtered.sort((a: any, b: any) => b.progress - a.progress);
      if (sortBy === "tasks") filtered.sort((a: any, b: any) => b.totalTasks - a.totalTasks);

      return filtered;
  }, [projects, searchQuery, statusFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Portfolio Management</h1>
          <p className="text-muted-foreground font-medium">
            Track, analyze, and manage all projects in your workspace.
          </p>
        </motion.div>
        <Button onClick={() => setIsOpen(true)} className="rounded-full shadow-lg shadow-primary/20 bg-primary font-black uppercase tracking-widest">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Search projects..." 
                      className="pl-9 bg-white dark:bg-slate-900 border-none shadow-sm rounded-xl"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 border-none shadow-sm rounded-xl text-xs font-bold uppercase tracking-wider">
                      <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="at risk">At Risk</SelectItem>
                  </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 border-none shadow-sm rounded-xl text-xs font-bold uppercase tracking-wider">
                      <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="progress">Highest Progress</SelectItem>
                      <SelectItem value="tasks">Most Tasks</SelectItem>
                  </SelectContent>
              </Select>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm">
                  <Button variant="ghost" size="icon" onClick={() => setViewMode("grid")} className={`h-8 w-8 rounded-lg ${viewMode === "grid" ? "bg-slate-100 dark:bg-slate-800" : ""}`}>
                      <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} className={`h-8 w-8 rounded-lg ${viewMode === "list" ? "bg-slate-100 dark:bg-slate-800" : ""}`}>
                      <List className="h-4 w-4" />
                  </Button>
              </div>
          </div>
      </div>

      {processedProjects.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
          <FolderKanban className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black uppercase tracking-tight mb-2">No Projects Found</h3>
          <p className="text-muted-foreground font-medium mb-6">Create your first project to start tracking your portfolio.</p>
          <Button onClick={() => setIsOpen(true)} className="rounded-full shadow-lg font-bold uppercase tracking-widest">
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
          {processedProjects.map((project: any, i: number) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/projects/${project.id}`}>
                <Card className={`hover:shadow-xl transition-all duration-300 border-slate-200/50 dark:border-slate-800/50 group cursor-pointer overflow-hidden ${viewMode === "list" ? "flex flex-row items-center p-4 rounded-3xl" : "rounded-3xl"}`}>
                  
                  {project.coverImage && viewMode === "grid" && (
                    <div className="relative h-32 w-full">
                      <Image src={project.coverImage} alt={project.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Badge className="absolute bottom-3 left-3 bg-white/20 backdrop-blur-md text-white border-none font-bold tracking-wider">
                          {project.derivedStatus}
                      </Badge>
                    </div>
                  )}

                  <CardContent className={`p-6 flex-1 ${viewMode === "list" ? "flex items-center gap-6 py-2" : ""}`}>
                    {!project.coverImage && viewMode === "grid" && (
                        <div className="flex items-center justify-between mb-4">
                            <Badge variant={project.derivedStatus === "Completed" ? "default" : project.derivedStatus === "At Risk" ? "destructive" : "secondary"} className="rounded-full font-bold uppercase tracking-widest text-[10px]">
                                {project.derivedStatus}
                            </Badge>
                            <FolderKanban className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}

                    <div className={viewMode === "list" ? "flex-1 min-w-[200px]" : "mb-6"}>
                        <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
                        {project.description && viewMode === "grid" && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{project.description}</p>
                        )}
                    </div>

                    <div className={viewMode === "list" ? "w-48" : "mb-6 space-y-2"}>
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span className={project.progress === 100 ? "text-emerald-500" : "text-primary"}>{Math.round(project.progress)}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                    </div>

                    <div className={`flex items-center justify-between ${viewMode === "list" ? "w-64 gap-6" : "pt-4 border-t border-slate-100 dark:border-slate-800"}`}>
                        <div className="flex items-center gap-4 text-sm font-bold text-muted-foreground">
                            <div className="flex items-center gap-1.5" title="Tasks">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{project.completedTasks}/{project.totalTasks}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Created">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(project.createdAt), "MMM d")}</span>
                            </div>
                        </div>

                        {project.team?.members && project.team.members.length > 0 && (
                            <div className="flex -space-x-2">
                                {project.team.members.slice(0, 3).map((member: any) => (
                                    <Avatar key={member.userId} className="h-8 w-8 border-2 border-white dark:border-slate-900 shadow-sm">
                                        <AvatarImage src={member.user?.imageUrl} />
                                        <AvatarFallback className="bg-primary/10 text-[10px] font-bold">{member.user?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                ))}
                                {project.team.members.length > 3 && (
                                    <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold z-10">
                                        +{project.team.members.length - 3}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {viewMode === "list" && (
                        <div className="ml-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(project.id); }} className="text-red-500">
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Project
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
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
                <ImageUpload value={coverImage} onChange={setCoverImage} onRemove={() => setCoverImage("")} />
              </div>
            </div>
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Website Redesign" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <AiGenerator onGenerate={(text) => setDescription(text)} initialPrompt={`Description for a project named "${name}"`} title="Generate Description" />
              </div>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your project goals..." className="min-h-[100px]" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
