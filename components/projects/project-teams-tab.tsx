"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Users, 
    Plus, 
    Search, 
    MoreHorizontal, 
    Trash2, 
    Shield, 
    Calendar,
    UserCheck,
    Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { AddTeamDialog } from "./add-team-dialog";
import { toast } from "sonner";

interface ProjectTeamsTabProps {
    projectId: string;
    workspaceId: string;
}

export function ProjectTeamsTab({ projectId, workspaceId }: ProjectTeamsTabProps) {
    const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const queryClient = useQueryClient();

    const { data: teams, isLoading } = useQuery({
        queryKey: ["project-teams", projectId],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/teams?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch teams");
            return res.json();
        }
    });

    const unlinkMutation = useMutation({
        mutationFn: async (teamId: string) => {
            const res = await fetch(`/api/projects/${projectId}/teams?workspaceId=${workspaceId}&teamId=${teamId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to unlink team");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project-teams", projectId] });
            toast.success("Team unlinked from project");
        },
        onError: () => {
            toast.error("Failed to unlink team");
        }
    });

    const filteredTeams = teams?.filter((t: any) => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-12 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-slate-50 dark:bg-slate-900 animate-pulse rounded-3xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 h-full overflow-y-auto pr-2 pb-20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search linked teams..." 
                        className="pl-11 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button 
                    onClick={() => setIsAddTeamOpen(true)}
                    className="w-full sm:w-auto rounded-2xl font-black uppercase tracking-widest px-8 shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team
                </Button>
            </div>

            {filteredTeams?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map((team: any) => (
                        <Card key={team.id} className="rounded-[2.5rem] border-slate-200/50 dark:border-slate-800/50 shadow-md hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 dark:border-slate-800">
                                        <DropdownMenuItem 
                                            className="text-destructive focus:text-destructive rounded-xl"
                                            onClick={() => unlinkMutation.mutate(team.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove from Project
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <CardHeader className="pb-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                                        <Users className="h-7 w-7" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-xl font-black truncate">{team.name}</CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border-none">
                                                {team.projectRole?.replace("_", " ") || "Viewer"}
                                            </Badge>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                {team._count?.members || 0} Members
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                <div className="flex -space-x-3 overflow-hidden p-1">
                                    {team.members?.slice(0, 5).map((member: any) => (
                                        <Avatar key={member.id} className="h-8 w-8 ring-2 ring-white dark:ring-slate-950 shadow-sm">
                                            <AvatarImage src={member.user?.imageUrl} />
                                            <AvatarFallback className="text-[10px] font-bold">{member.user?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                    {(team._count?.members || 0) > 5 && (
                                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black ring-2 ring-white dark:ring-slate-950 text-slate-500">
                                            +{(team._count?.members || 0) - 5}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400 flex items-center gap-2">
                                            <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                                            Team Lead
                                        </span>
                                        <span className="text-slate-900 dark:text-white">
                                            {team.members?.find((m: any) => m.role === "admin" || m.role === "owner")?.user?.name || "Unassigned"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400 flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                            Date Linked
                                        </span>
                                        <span className="text-slate-900 dark:text-white">
                                            {team.dateAdded ? format(new Date(team.dateAdded), "MMM dd, yyyy") : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 dark:bg-slate-900/50 border-4 border-dashed rounded-[4rem] min-h-[400px]">
                    <div className="h-24 w-24 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-xl mb-6 text-indigo-500">
                        <Users className="h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-black uppercase mb-2 tracking-tight">No Teams Linked</h3>
                    <p className="text-sm text-muted-foreground mb-8 max-w-sm font-medium">Assign existing teams to this project to enable collaborative workspace environments.</p>
                    <Button 
                        size="lg" 
                        onClick={() => setIsAddTeamOpen(true)}
                        className="rounded-2xl px-10 font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20"
                    >
                        Link First Team
                    </Button>
                </div>
            )}

            <AddTeamDialog 
                isOpen={isAddTeamOpen}
                onOpenChange={setIsAddTeamOpen}
                projectId={projectId}
                workspaceId={workspaceId}
                existingTeamIds={teams?.map((t: any) => t.id) || []}
            />
        </div>
    );
}
