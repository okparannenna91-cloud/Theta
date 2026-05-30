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
import { usePopups } from "@/components/popups/popup-manager";
import { cn } from "@/lib/utils";

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
  const { showUpgradePrompt } = usePopups();

  const { data: projectsData, isLoading } = useQuery({
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

    // Proactive Plan Limit Check
    if (limits.max !== -1 && limits.current >= limits.max) {
      showUpgradePrompt("projects");
      return;
    }

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
    <div className="p-4 sm:p-12 lg:p-16 max-w-7xl mx-auto relative selection:bg-indigo-500/30">
      {/* Neural Mesh Background */}
      <div className="absolute top-0 right-0 -z-20 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 -z-20 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
            Portfolio <span className="text-indigo-600">Core</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="h-1.5 w-16 bg-indigo-600 rounded-full" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] opacity-80">
              Neural Project Architecture & Management
            </p>
          </div>
        </motion.div>
        <Button onClick={() => setIsOpen(true)} className="rounded-[1.5rem] h-14 px-10 shadow-2xl shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:scale-105 active:scale-95 group">
          <Plus className="h-4 w-4 mr-3 group-hover:rotate-90 transition-transform duration-500" />
          Initialize Protocol
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-4 rounded-[2.5rem] border border-indigo-500/10 shadow-xl">
          <div className="flex items-center gap-4 w-full lg:w-auto px-2">
              <div className="relative w-full lg:w-96 group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <Input 
                      placeholder="Search protocols..." 
                      className="pl-12 h-14 bg-white/50 dark:bg-slate-800/50 border-none shadow-none rounded-2xl font-bold text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto px-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-14 w-[160px] bg-white/50 dark:bg-slate-800/50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest px-6 focus:ring-2 focus:ring-indigo-500/20">
                      <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-indigo-500/10">
                      <SelectItem value="all" className="font-black text-[10px] uppercase tracking-widest">All Statuses</SelectItem>
                      <SelectItem value="active" className="font-black text-[10px] uppercase tracking-widest text-indigo-600">Active</SelectItem>
                      <SelectItem value="completed" className="font-black text-[10px] uppercase tracking-widest text-emerald-600">Completed</SelectItem>
                      <SelectItem value="at risk" className="font-black text-[10px] uppercase tracking-widest text-rose-600">At Risk</SelectItem>
                  </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-14 w-[180px] bg-white/50 dark:bg-slate-800/50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest px-6 focus:ring-2 focus:ring-indigo-500/20">
                      <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-indigo-500/10">
                      <SelectItem value="newest" className="font-black text-[10px] uppercase tracking-widest">Temporal: Newest</SelectItem>
                      <SelectItem value="progress" className="font-black text-[10px] uppercase tracking-widest">Execution: Progress</SelectItem>
                      <SelectItem value="tasks" className="font-black text-[10px] uppercase tracking-widest">Volume: Task Count</SelectItem>
                  </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl ml-auto">
                  <Button variant="ghost" size="icon" onClick={() => setViewMode("grid")} className={`h-10 w-10 rounded-xl transition-all ${viewMode === "grid" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-400 hover:text-indigo-600"}`}>
                      <LayoutGrid className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} className={`h-10 w-10 rounded-xl transition-all ${viewMode === "list" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-400 hover:text-indigo-600"}`}>
                      <List className="h-5 w-5" />
                  </Button>
              </div>
          </div>
      </div>

      {processedProjects.length === 0 ? (
        <div className="text-center py-32 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl rounded-[3rem] border-2 border-dashed border-indigo-500/10">
          <FolderKanban className="h-20 w-20 text-slate-300 mx-auto mb-8 floating" />
          <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Neural Grid Empty</h3>
          <p className="text-slate-500 font-bold max-w-md mx-auto mb-10 text-sm">No active protocols detected in the current workspace. Initialize your first project to begin data synthesis.</p>
          <Button onClick={() => setIsOpen(true)} className="rounded-2xl h-14 px-10 shadow-xl bg-indigo-600 font-black uppercase tracking-widest text-[10px]">
            <Plus className="h-4 w-4 mr-2" />
            Initialize Protocol
          </Button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10" : "flex flex-col gap-6"}>
          {processedProjects.map((project: any, i: number) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.6 }}>
              <Link href={`/projects/${project.id}`}>
                <Card className={cn(
                  "glass-card border-none group cursor-pointer overflow-hidden transition-all duration-700 hover:scale-[1.03] hover:shadow-[0_40px_80px_-20px_rgba(99,102,241,0.2)]",
                  viewMode === "list" ? "flex flex-row items-center p-8 rounded-[2.5rem]" : "rounded-[3rem]"
                )}>
                  
                  {project.coverImage && viewMode === "grid" && (
                    <div className="relative h-56 w-full overflow-hidden">
                      <Image src={project.coverImage} alt={project.name} fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                      <Badge className={cn(
                        "absolute top-6 right-6 backdrop-blur-2xl border-none font-black tracking-[0.2em] text-[9px] px-5 py-2 uppercase",
                        project.derivedStatus === "Completed" ? "bg-emerald-500/80 text-white" :
                        project.derivedStatus === "At Risk" ? "bg-rose-500/80 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)]" :
                        "bg-indigo-600/80 text-white"
                      )}>
                          {project.derivedStatus}
                      </Badge>
                    </div>
                  )}

                  <CardContent className={cn(
                    "p-10 flex-1 relative",
                    viewMode === "list" ? "flex items-center gap-10 py-2" : ""
                  )}>
                    <div className="absolute top-0 right-0 p-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                            <Plus className="w-5 h-5" />
                        </div>
                    </div>

                    {!project.coverImage && viewMode === "grid" && (
                        <div className="flex items-center justify-between mb-8">
                            <Badge className={cn(
                                "rounded-xl font-black uppercase tracking-[0.2em] text-[9px] px-4 py-2 border-none",
                                project.derivedStatus === "Completed" ? "bg-emerald-500/10 text-emerald-600" :
                                project.derivedStatus === "At Risk" ? "bg-rose-500/10 text-rose-600" :
                                "bg-indigo-500/10 text-indigo-600"
                            )}>
                                {project.derivedStatus}
                            </Badge>
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                <FolderKanban className="h-5 w-5" />
                            </div>
                        </div>
                    )}

                    <div className={viewMode === "list" ? "flex-1 min-w-[250px]" : "mb-10"}>
                        <h3 className="text-2xl font-black tracking-tighter uppercase group-hover:text-indigo-600 transition-colors line-clamp-1">{project.name}</h3>
                        {project.description && viewMode === "grid" && (
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest line-clamp-2 mt-4 leading-relaxed">{project.description}</p>
                        )}
                    </div>

                    <div className={viewMode === "list" ? "w-64" : "mb-10 space-y-4"}>
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                            <span>Sustenance</span>
                            <span className={cn(
                                "transition-all duration-1000",
                                project.progress === 100 ? "text-emerald-500" : "text-indigo-600"
                            )}>{Math.round(project.progress)}% COMPLETED</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className={cn(
                                    "h-full rounded-full transition-all duration-1000",
                                    project.progress === 100 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                                )}
                            />
                        </div>
                    </div>

                    <div className={cn(
                        "flex items-center justify-between",
                        viewMode === "list" ? "w-80 gap-10" : "pt-8 border-t border-indigo-500/5"
                    )}>
                        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div className="flex items-center gap-2" title="Protocols">
                                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                                <span>{project.completedTasks}/{project.totalTasks}</span>
                            </div>
                            <div className="flex items-center gap-2" title="Initialized">
                                <Calendar className="h-4 w-4 text-indigo-500" />
                                <span>{format(new Date(project.createdAt), "MMM d")}</span>
                            </div>
                        </div>

                        {project.team?.members && project.team.members.length > 0 && (
                            <div className="flex -space-x-3">
                                {project.team.members.slice(0, 3).map((member: any) => (
                                    <Avatar key={member.userId} className="h-10 w-10 ring-4 ring-white dark:ring-slate-900 shadow-xl transition-all hover:scale-110 hover:z-20">
                                        <AvatarImage src={member.user?.imageUrl} />
                                        <AvatarFallback className="bg-indigo-600 text-white text-[10px] font-black uppercase">{member.user?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                ))}
                                {project.team.members.length > 3 && (
                                    <div className="h-10 w-10 rounded-full ring-4 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black uppercase text-slate-400 z-10">
                                        +{project.team.members.length - 3}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {viewMode === "list" && (
                        <div className="ml-6">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-indigo-500/5 hover:text-indigo-600 transition-all">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl border-indigo-500/10 p-2 min-w-[200px]">
                                    <DropdownMenuItem className="rounded-xl h-10 font-black uppercase tracking-widest text-[9px] focus:bg-indigo-500 focus:text-white cursor-pointer">
                                        <Edit2 className="h-3.5 w-3.5 mr-3" /> Reconfigure
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(project.id); }} className="rounded-xl h-10 font-black uppercase tracking-widest text-[9px] text-rose-500 focus:bg-rose-500 focus:text-white cursor-pointer">
                                        <Trash2 className="h-3.5 w-3.5 mr-3" /> Purge Protocol
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
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-indigo-500/20 rounded-[2.5rem] selection:bg-indigo-500/30 shadow-2xl">
          <div className="p-10 space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Initialize Protocol</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Configure new neural workstream parameters</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Visualization Core</Label>
                <div className="p-1 bg-white/50 dark:bg-slate-900/50 rounded-[2rem] border border-indigo-500/10">
                  <ImageUpload value={coverImage} onChange={setCoverImage} onRemove={() => setCoverImage("")} />
                </div>
              </div>
              
              <div className="space-y-4">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Protocol Identifier</Label>
                <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="e.g. STRATEGIC SYNERGY" 
                    className="h-14 bg-white/50 dark:bg-slate-900/50 border-none rounded-2xl font-black text-lg focus-visible:ring-2 focus-visible:ring-indigo-500/20 uppercase tracking-tight"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Parameter Overview</Label>
                  <AiGenerator onGenerate={(text) => setDescription(text)} initialPrompt={`Description for a project named "${name}"`} title="Neural Synthesis" />
                </div>
                <Textarea 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Synthesize project objectives..." 
                    className="min-h-[140px] bg-white/50 dark:bg-slate-900/50 border-none rounded-[2rem] font-bold text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/20 p-6 leading-relaxed" 
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="h-14 rounded-2xl px-8 font-black uppercase tracking-widest text-[10px]">Decline</Button>
                <Button type="submit" disabled={createMutation.isPending} className="h-14 rounded-2xl px-10 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 font-black uppercase tracking-widest text-[10px]">
                    {createMutation.isPending ? "Synchronizing..." : "Authorize"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
