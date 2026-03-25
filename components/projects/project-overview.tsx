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
    const tasks = project.tasks || [];
    const completedTasks = tasks.filter((t: any) => t.status === "done" || t.status === "Completed").length;
    const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

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
                             <h3 className="text-3xl font-black text-blue-700">{tasks.length}</h3>
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
                             <h3 className="text-3xl font-black text-amber-700">{tasks.length - completedTasks}</h3>
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

                {/* Team Section */}
                {project.team && (
                    <div className="space-y-4">
                         <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                            <Layers className="h-5 w-5 text-indigo-500" />
                            Project Team: {project.team.name}
                         </h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                             {project.team.members?.map((member: any) => (
                                 <div key={member.id} className="group relative flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:border-indigo-500/50 transition-all cursor-pointer">
                                      <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-slate-950 transition-transform group-hover:scale-110">
                                          <AvatarImage src={member.user?.imageUrl} />
                                          <AvatarFallback>{member.user?.name?.[0]}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                          <p className="text-sm font-bold truncate">{member.user?.name}</p>
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{member.role}</p>
                                      </div>
                                      <ArrowUpRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                                 </div>
                             ))}
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
