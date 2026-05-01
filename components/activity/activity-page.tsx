"use client";

import { useState, useMemo, useEffect } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Activity as ActivityIcon, 
    Search, 
    Filter, 
    Calendar, 
    User as UserIcon,
    FolderKanban,
    Download,
    Loader2,
    ChevronDown,
    Clock,
    History,
    FileText,
    Settings,
    MoreVertical,
    ExternalLink
} from "lucide-react";
import { format, formatDistanceToNow, isSameDay, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityPage() {
    const { activeWorkspaceId } = useWorkspace();
    const { ref, inView } = useInView();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);

    // Fetch projects for filter
    const { data: projectsData } = useQuery({
        queryKey: ["workspace-projects", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!activeWorkspaceId
    });

    // Fetch users for filter
    const { data: membersData } = useQuery({
        queryKey: ["workspace-members", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!activeWorkspaceId
    });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useInfiniteQuery({
        queryKey: ["activity-feed", activeWorkspaceId, searchQuery, selectedProject, selectedUser, selectedType],
        queryFn: async ({ pageParam = 0 }) => {
            let url = `/api/activity?workspaceId=${activeWorkspaceId}&skip=${pageParam}&take=20`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            if (selectedProject) url += `&projectId=${selectedProject}`;
            if (selectedUser) url += `&userId=${selectedUser}`;
            if (selectedType) url += `&entityType=${selectedType}`;
            
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        getNextPageParam: (lastPage, allPages) => {
            const currentCount = allPages.length * 20;
            return lastPage.hasMore ? currentCount : undefined;
        },
        enabled: !!activeWorkspaceId
    });

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);

    const activities = useMemo(() => data?.pages.flatMap(page => page.activities) || [], [data?.pages]);

    // Group activities by date
    const groupedActivities = useMemo(() => {
        const groups: { date: Date; items: any[] }[] = [];
        activities.forEach(activity => {
            const date = startOfDay(new Date(activity.createdAt));
            const existingGroup = groups.find(g => isSameDay(g.date, date));
            if (existingGroup) {
                existingGroup.items.push(activity);
            } else {
                groups.push({ date, items: [activity] });
            }
        });
        return groups;
    }, [activities]);

    const handleExport = () => {
        // Mock export functionality
        const csvContent = "Date,User,Action,Entity,Project\n" + 
            activities.map(a => `${format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm')},${a.user?.name},${a.action},${a.entityType},${a.project?.name || 'N/A'}`).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `theta_audit_log_${format(new Date(), 'yyyy_MM_dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-slate-950 overflow-hidden">
            {/* Header Section */}
            <header className="px-8 py-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <History className="h-5 w-5" />
                            </div>
                            <h1 className="text-3xl font-black uppercase tracking-tight">Timeline</h1>
                        </div>
                        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Historical action logs across the ecosystem</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Search logs..." 
                                className="pl-11 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-12 font-bold uppercase tracking-widest text-[10px]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            className="h-12 rounded-2xl border-slate-200 dark:border-slate-800 font-black uppercase tracking-widest text-[10px] bg-white dark:bg-slate-900 shadow-sm"
                            onClick={handleExport}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Log
                        </Button>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-4 mt-8">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={`rounded-xl px-4 font-black uppercase tracking-widest text-[9px] ${selectedProject ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-500'}`}>
                                <FolderKanban className="h-3 w-3 mr-2" />
                                {selectedProject ? projectsData?.find((p: any) => p.id === selectedProject)?.name : "All Projects"}
                                <ChevronDown className="ml-2 h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 rounded-2xl">
                            <DropdownMenuItem onClick={() => setSelectedProject(null)}>All Projects</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {projectsData?.map((p: any) => (
                                <DropdownMenuItem key={p.id} onClick={() => setSelectedProject(p.id)}>{p.name}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={`rounded-xl px-4 font-black uppercase tracking-widest text-[9px] ${selectedUser ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-500'}`}>
                                <UserIcon className="h-3 w-3 mr-2" />
                                {selectedUser ? membersData?.members?.find((m: any) => m.user.id === selectedUser)?.user.name : "All Users"}
                                <ChevronDown className="ml-2 h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 rounded-2xl">
                            <DropdownMenuItem onClick={() => setSelectedUser(null)}>All Users</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {membersData?.members?.map((m: any) => (
                                <DropdownMenuItem key={m.user.id} onClick={() => setSelectedUser(m.user.id)}>{m.user.name}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={`rounded-xl px-4 font-black uppercase tracking-widest text-[9px] ${selectedType ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-500'}`}>
                                <Filter className="h-3 w-3 mr-2" />
                                {selectedType || "All Types"}
                                <ChevronDown className="ml-2 h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 rounded-2xl">
                            <DropdownMenuItem onClick={() => setSelectedType(null)}>All Types</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {["Task", "Project", "Document", "Member", "System"].map(type => (
                                <DropdownMenuItem key={type} onClick={() => setSelectedType(type)}>{type}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {(selectedProject || selectedUser || selectedType) && (
                        <Button 
                            variant="link" 
                            className="text-rose-500 font-black uppercase tracking-widest text-[9px] h-auto p-0"
                            onClick={() => {
                                setSelectedProject(null);
                                setSelectedUser(null);
                                setSelectedType(null);
                            }}
                        >
                            Reset Filters
                        </Button>
                    )}
                </div>
            </header>

            {/* Timeline Section */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950 p-4 sm:p-8">
                <div className="max-w-4xl mx-auto space-y-12">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-4">
                                <Skeleton className="h-6 w-32 rounded-full" />
                                <Skeleton className="h-32 w-full rounded-[2rem]" />
                                <Skeleton className="h-32 w-full rounded-[2rem]" />
                            </div>
                        ))
                    ) : groupedActivities.length > 0 ? (
                        groupedActivities.map((group, groupIdx) => (
                            <div key={group.date.toISOString()} className="relative">
                                {/* Date Header */}
                                <div className="sticky top-0 z-10 py-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
                                    <div className="flex items-center gap-4">
                                        <Badge className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1 rounded-full font-black uppercase tracking-widest text-[10px]">
                                            {isSameDay(group.date, new Date()) ? "Today" : format(group.date, "MMMM dd, yyyy")}
                                        </Badge>
                                        <div className="flex-1 h-px bg-slate-100 dark:border-slate-800" />
                                    </div>
                                </div>

                                <div className="space-y-4 mt-6 pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-4">
                                    {group.items.map((activity, activityIdx) => (
                                        <motion.div
                                            key={activity.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: activityIdx * 0.05 }}
                                            className="group relative"
                                        >
                                            <div className="absolute -left-[2.2rem] top-6 h-4 w-4 rounded-full border-4 border-white dark:border-slate-950 bg-indigo-600 z-10 shadow-sm" />
                                            
                                            <Card className="rounded-[2rem] border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group-hover:border-indigo-200 dark:group-hover:border-indigo-900/50">
                                                <CardContent className="p-6">
                                                    <div className="flex items-start gap-5">
                                                        <Avatar className="h-10 w-10 ring-4 ring-slate-50 dark:ring-slate-900 shadow-sm">
                                                            <AvatarImage src={activity.user?.imageUrl} />
                                                            <AvatarFallback className="font-black text-xs">{activity.user?.name?.[0]}</AvatarFallback>
                                                        </Avatar>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-4 mb-2">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-sm font-black uppercase tracking-tight">{activity.user?.name}</span>
                                                                    <span className="text-[10px] font-medium text-slate-500">{activity.action}</span>
                                                                    {activity.project && (
                                                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-indigo-100 dark:border-indigo-900/50 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10">
                                                                            {activity.project.name}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0 flex items-center gap-2">
                                                                    <Clock className="h-3 w-3" />
                                                                    {format(new Date(activity.createdAt), "hh:mm a")}
                                                                </span>
                                                            </div>

                                                            <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/50 dark:border-slate-800/50">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-8 w-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-indigo-600">
                                                                            <ActivityIcon className="h-4 w-4" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold uppercase tracking-tight line-clamp-1">{activity.entityType}: {activity.entityId.slice(-8)}</p>
                                                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Interaction Recorded</p>
                                                                        </div>
                                                                    </div>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
                            <div className="h-24 w-24 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-8">
                                <History className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                            </div>
                            <h3 className="text-3xl font-black uppercase tracking-tight mb-4">Void Timeline</h3>
                            <p className="text-slate-500 font-bold max-w-sm uppercase tracking-widest text-[10px] leading-relaxed">
                                No historical interactions found for the selected criteria. Try adjusting your filters.
                            </p>
                        </div>
                    )}

                    {/* Infinite Scroll Trigger */}
                    <div ref={ref} className="h-20 flex items-center justify-center">
                        {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />}
                    </div>
                </div>
            </main>
        </div>
    );
}
