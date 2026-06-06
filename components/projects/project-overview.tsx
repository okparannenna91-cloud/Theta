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
                     <Card className="bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 shadow-sm rounded-xl">
                        <CardHeader className="pb-2">
                             <p className="text-xs font-semibold text-blue-600">Total Tasks</p>
                        </CardHeader>
                        <CardContent>
                             <h3 className="text-3xl font-semibold text-blue-700">{safeTasks.length}</h3>
                        </CardContent>
                     </Card>
                     <Card className="bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 shadow-sm rounded-xl">
                        <CardHeader className="pb-2">
                             <p className="text-xs font-semibold text-emerald-600">Completed</p>
                        </CardHeader>
                        <CardContent>
                             <h3 className="text-3xl font-semibold text-emerald-700">{completedTasks}</h3>
                        </CardContent>
                     </Card>
                     <Card className="bg-amber-50/30 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 shadow-sm rounded-xl">
                        <CardHeader className="pb-2">
                             <p className="text-xs font-semibold text-amber-600">Remaining</p>
                        </CardHeader>
                        <CardContent>
                             <h3 className="text-3xl font-semibold text-amber-700">{safeTasks.length - completedTasks}</h3>
                        </CardContent>
                     </Card>
                </div>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                        <div className="flex items-center justify-between">
                             <div>
                                <CardTitle className="text-xl font-semibold tracking-tight">Project Summary</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground mt-1">Detailed Description & Objectives</CardDescription>
                             </div>
                             <Badge className="bg-primary text-primary-foreground border-none text-xs px-4 py-1.5 rounded-full">Active</Badge>
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
                                 <h4 className="text-sm font-semibold text-slate-500">Overall Progress</h4>
                                 <span className="text-sm font-semibold text-primary">{Math.round(progress)}% Complete</span>
                             </div>
                             <Progress value={progress} className="h-3 bg-slate-100 dark:bg-slate-800" />
                         </div>
                    </CardContent>
                </Card>

                {/* Teams Section */}
                {(project.projectTeams?.length > 0 || project.team) && (
                    <div className="space-y-6">
                         <h3 className="text-xl font-semibold tracking-tight flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                                <Layers className="h-5 w-5" />
                            </div>
                            Assigned Operational Units
                         </h3>
                         
                         <div className="grid grid-cols-1 gap-6">
                             {/* Handle new multi-team structure */}
                             {project.projectTeams?.map((pt: any) => {
                                 if (!pt || !pt.id || !pt.team) return null;
                                 return (
                                     <Card key={pt.id} className="rounded-lg border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
                                         <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                                             <div className="flex items-center gap-3">
                                                 <p className="text-lg font-semibold tracking-tight">{pt.team.name}</p>
                                                 <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-none">
                                                     {pt.role?.replace("_", " ") || "Viewer"}
                                                 </Badge>
                                             </div>
                                             <p className="text-xs font-semibold text-slate-400">{pt.team.members?.length || 0} Members</p>
                                         </div>
                                         <div className="p-6">
                                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                 {pt.team.members?.slice(0, 6).map((member: any) => {
                                                     if (!member || !member.id || !member.user) return null;
                                                     return (
                                                         <div key={member.id} className="group flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/30 dark:border-slate-800/30 shadow-sm hover:border-primary/50 transition-all">
                                                              <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-950">
                                                                  <AvatarImage src={member.user?.imageUrl} />
                                                                  <AvatarFallback>{member.user?.name?.[0]}</AvatarFallback>
                                                              </Avatar>
                                                              <div className="flex-1 min-w-0">
                                                                  <p className="text-xs font-semibold truncate">{member.user?.name}</p>
                                                                  <p className="text-[9px] text-muted-foreground font-medium">{member.role}</p>
                                                              </div>
                                                         </div>
                                                     );
                                                 })}
                                                 {(pt.team.members?.length || 0) > 6 && (
                                                     <div className="flex items-center justify-center p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700">
                                                         <p className="text-xs font-semibold text-slate-500">+{(pt.team.members?.length || 0) - 6} More</p>
                                                     </div>
                                                 )}
                                             </div>
                                         </div>
                                     </Card>
                                 );
                             })}

                             {/* Fallback for legacy single team structure */}
                             {(!project.projectTeams || (Array.isArray(project.projectTeams) && project.projectTeams.length === 0)) && project.team && (
                                 <Card className="rounded-xl border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
                                     <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                                         <p className="text-lg font-semibold tracking-tight">{project.team.name}</p>
                                         <p className="text-xs font-semibold text-slate-400">{project.team.members?.length || 0} Members</p>
                                     </div>
                                     <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                         {project.team.members?.map((member: any) => {
                                             if (!member || !member.id || !member.user) return null;
                                             return (
                                                 <div key={member.id} className="group flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/30 dark:border-slate-800/30 shadow-sm hover:border-primary/50 transition-all">
                                                      <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-950">
                                                          <AvatarImage src={member.user?.imageUrl} />
                                                          <AvatarFallback>{member.user?.name?.[0]}</AvatarFallback>
                                                      </Avatar>
                                                      <div className="flex-1 min-w-0">
                                                          <p className="text-xs font-semibold truncate">{member.user?.name}</p>
                                                          <p className="text-[9px] text-muted-foreground font-medium">{member.role}</p>
                                                      </div>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 </Card>
                             )}
                         </div>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-2">
                         <CardTitle className="text-sm font-semibold text-slate-500">Project Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                 <User className="h-5 w-5" />
                             </div>
                             <div>
                                 <p className="text-xs font-semibold text-slate-400">Owner</p>
                                 <p className="text-sm font-semibold">{project.user?.name || "System"}</p>
                             </div>
                        </div>

                        <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 shadow-sm">
                                 <Calendar className="h-5 w-5" />
                             </div>
                             <div>
                                 <p className="text-xs font-semibold text-slate-400">Created</p>
                                 <p className="text-sm font-semibold">{project.createdAt ? format(new Date(project.createdAt), "PPP") : "N/A"}</p>
                             </div>
                        </div>

                        <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 shadow-sm">
                                 <Clock className="h-5 w-5" />
                             </div>
                             <div>
                                 <p className="text-xs font-semibold text-slate-400">Duration</p>
                                 <p className="text-sm font-semibold truncate">3 Months</p>
                             </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="rounded-xl border bg-primary/10 shadow-sm overflow-hidden relative p-8">
                    <div className="relative z-10">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Team Velocity</p>
                        <h2 className="text-5xl font-semibold mb-4 flex items-baseline gap-2">
                            94 <span className="text-base font-medium opacity-50">%</span>
                        </h2>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
                             <FileText className="h-3 w-3 text-primary" />
                             <p className="text-xs font-semibold">Boots AI Forecast</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
