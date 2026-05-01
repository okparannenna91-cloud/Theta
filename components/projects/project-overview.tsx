"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Calendar, 
    User, 
    Layers, 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    Circle,
    MoreVertical,
    FileText,
    Activity as ActivityIcon,
    ArrowUpRight
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import Image from "next/image";

interface ProjectOverviewProps {
    project: any;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
    const safeTasks = Array.isArray(project?.tasks) ? project.tasks : [];
    const completedTasks = safeTasks.filter((t: any) => t.status === "done" || t.status === "Completed").length;
    const progress = safeTasks.length > 0 ? (completedTasks / safeTasks.length) * 100 : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full overflow-y-auto pr-2 pb-10">
            <div className="lg:col-span-2 space-y-8">
                {/* Highlights Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <Card className="bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                             <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Total Tasks</p>
                        </CardHeader>
                        <CardContent>
                             <h3 className="text-3xl font-black text-blue-700">{safeTasks.length}</h3>
                        </CardContent>
                     </Card>
                     <Card className="bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                             <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Completed</p>
                        </CardHeader>
                        <CardContent>
                             <h3 className="text-3xl font-black text-emerald-700">{completedTasks}</h3>
                        </CardContent>
                     </Card>
                     <Card className="bg-amber-50/30 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                             <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Remaining</p>
                        </CardHeader>
                        <CardContent>
                             <h3 className="text-3xl font-black text-amber-700">{safeTasks.length - completedTasks}</h3>
                        </CardContent>
                     </Card>
                </div>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                        <div className="flex items-center justify-between">
                             <div>
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Project Summary</CardTitle>
                                <CardDescription className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mt-1">Detailed Description & Objectives</CardDescription>
                             </div>
                             <Badge className="bg-indigo-600 text-white border-none uppercase text-[10px] tracking-widest px-4 py-1.5 rounded-full">Active</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                         <div className="prose prose-slate dark:prose-invert max-w-none">
                             <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
                                 {project.description || "No description provided for this project. Enhance its clarity by adding goals and objectives."}
                             </p>
                         </div>
                         
                         <div className="mt-10 pt-10 border-t">
                             <div className="flex items-center justify-between mb-2">
                                 <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Overall Progress</h4>
                                 <span className="text-sm font-black text-indigo-600">{Math.round(progress)}% Complete</span>
                             </div>
                             <Progress value={progress} className="h-3 bg-slate-100 dark:bg-slate-800" />
                         </div>
                    </CardContent>
                </Card>

                {/* Teams Section */}
                {(project.projectTeams?.length > 0 || project.team) && (
                    <div className="space-y-6">
                         <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Layers className="h-5 w-5" />
                            </div>
                            Assigned Operational Units
                         </h3>
                         
                         <div className="grid grid-cols-1 gap-6">
                             {/* Handle new multi-team structure */}
                             {project.projectTeams?.map((pt: any) => (
                                 <Card key={pt.id} className="rounded-3xl border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
                                     <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                                         <div className="flex items-center gap-3">
                                             <p className="text-lg font-black uppercase tracking-tight">{pt.team.name}</p>
                                             <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border-none">
                                                 {pt.role?.replace("_", " ") || "Viewer"}
                                             </Badge>
                                         </div>
                                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{pt.team.members?.length || 0} Members</p>
                                     </div>
                                     <div className="p-6">
                                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                             {pt.team.members?.slice(0, 6).map((member: any) => (
                                                 <div key={member.id} className="group flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/30 dark:border-slate-800/30 shadow-sm hover:border-indigo-500/50 transition-all">
                                                      <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-950">
                                                          <AvatarImage src={member.user?.imageUrl} />
                                                          <AvatarFallback>{member.user?.name?.[0]}</AvatarFallback>
                                                      </Avatar>
                                                      <div className="flex-1 min-w-0">
                                                          <p className="text-xs font-bold truncate">{member.user?.name}</p>
                                                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{member.role}</p>
                                                      </div>
                                                 </div>
                                             ))}
                                             {(pt.team.members?.length || 0) > 6 && (
                                                 <div className="flex items-center justify-center p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700">
                                                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">+{(pt.team.members?.length || 0) - 6} More</p>
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 </Card>
                             ))}

                             {/* Fallback for legacy single team structure */}
                             {(!project.projectTeams || (Array.isArray(project.projectTeams) && project.projectTeams.length === 0)) && project.team && (
                                 <Card className="rounded-3xl border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
                                     <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                                         <p className="text-lg font-black uppercase tracking-tight">{project.team.name}</p>
                                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{project.team.members?.length || 0} Members</p>
                                     </div>
                                     <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                         {project.team.members?.map((member: any) => (
                                             <div key={member.id} className="group flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/30 dark:border-slate-800/30 shadow-sm hover:border-indigo-500/50 transition-all">
                                                  <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-950">
                                                      <AvatarImage src={member.user?.imageUrl} />
                                                      <AvatarFallback>{member.user?.name?.[0]}</AvatarFallback>
                                                  </Avatar>
                                                  <div className="flex-1 min-w-0">
                                                      <p className="text-xs font-bold truncate">{member.user?.name}</p>
                                                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{member.role}</p>
                                                  </div>
                                             </div>
                                         ))}
                                     </div>
                                 </Card>
                             )}
                         </div>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-md">
                    <CardHeader className="pb-2">
                         <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Project Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shadow-inner">
                                 <User className="h-5 w-5" />
                             </div>
                             <div>
                                 <p className="text-xs font-black uppercase tracking-widest text-slate-400">Owner</p>
                                 <p className="text-sm font-bold">{project.user?.name || "System"}</p>
                             </div>
                        </div>

                        <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 shadow-inner">
                                 <Calendar className="h-5 w-5" />
                             </div>
                             <div>
                                 <p className="text-xs font-black uppercase tracking-widest text-slate-400">Created</p>
                                 <p className="text-sm font-bold">{project.createdAt ? format(new Date(project.createdAt), "PPP") : "N/A"}</p>
                             </div>
                        </div>

                        <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 shadow-inner">
                                 <Clock className="h-5 w-5" />
                             </div>
                             <div>
                                 <p className="text-xs font-black uppercase tracking-widest text-slate-400">Duration</p>
                                 <p className="text-sm font-bold truncate">3 Months</p>
                             </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="rounded-3xl border-none bg-indigo-950 text-white shadow-xl overflow-hidden relative p-8">
                    <div className="absolute -top-10 -right-10 opacity-10">
                         <ActivityIcon className="h-48 w-48 text-indigo-400" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs uppercase tracking-widest font-black opacity-60 mb-2">Team Velocity</p>
                        <h2 className="text-5xl font-black mb-4 flex items-baseline gap-2">
                            94 <span className="text-base font-medium opacity-50">%</span>
                        </h2>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/20 w-fit">
                             <FileText className="h-3 w-3 text-indigo-400" />
                             <p className="text-[10px] font-black uppercase tracking-widest">Boots AI Forecast</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
