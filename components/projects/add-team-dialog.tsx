"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { 
    Users, 
    Search, 
    Plus, 
    Check, 
    Shield, 
    Info,
    ArrowRight,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CreateTeamDialog } from "./create-team-dialog";

interface AddTeamDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    workspaceId: string;
    existingTeamIds: string[];
}

export function AddTeamDialog({ 
    isOpen, 
    onOpenChange, 
    projectId, 
    workspaceId,
    existingTeamIds 
}: AddTeamDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
    const [selectedRole, setSelectedRole] = useState("viewer");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: allTeamsData, isLoading } = useQuery({
        queryKey: ["workspace-teams", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/teams?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch teams");
            return res.json();
        },
        enabled: isOpen
    });

    const linkMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/teams?workspaceId=${workspaceId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    teamIds: selectedTeamIds,
                    role: selectedRole
                })
            });
            if (!res.ok) throw new Error("Failed to link teams");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project-teams", projectId] });
            toast.success(`${selectedTeamIds.length} team(s) linked to project`);
            onOpenChange(false);
            setSelectedTeamIds([]);
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to link teams");
        }
    });

    const teams = allTeamsData?.teams || [];
    const availableTeams = teams.filter((t: any) => !existingTeamIds.includes(t.id));
    const filteredTeams = availableTeams.filter((t: any) => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleTeam = (id: string) => {
        setSelectedTeamIds(prev => 
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-indigo-600 p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Users className="h-32 w-32" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black uppercase tracking-tight text-white">Add Team to Project</DialogTitle>
                            <DialogDescription className="text-indigo-100 font-bold uppercase tracking-widest text-[10px] opacity-80">
                                Link existing teams to grant collective access
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6 bg-white dark:bg-slate-950">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Search workspace teams..." 
                                    className="pl-11 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none h-12 font-medium"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button 
                                variant="outline" 
                                className="rounded-2xl border-dashed border-2 h-12 px-6 font-black uppercase tracking-widest text-[10px]"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Team
                            </Button>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="h-16 w-full bg-slate-50 dark:bg-slate-900 animate-pulse rounded-2xl" />
                                ))
                            ) : filteredTeams.length > 0 ? (
                                filteredTeams.map((team: any) => (
                                    <div 
                                        key={team.id}
                                        onClick={() => toggleTeam(team.id)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                            selectedTeamIds.includes(team.id)
                                            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                                            : "border-transparent bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 shadow-sm">
                                                <Users className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm uppercase tracking-tight">{team.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{team.membersCount || 0} Members</p>
                                            </div>
                                        </div>
                                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                            selectedTeamIds.includes(team.id)
                                            ? "bg-indigo-600 border-indigo-600"
                                            : "border-slate-200 dark:border-slate-700"
                                        }`}>
                                            {selectedTeamIds.includes(team.id) && <Check className="h-4 w-4 text-white" />}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching teams found</p>
                                </div>
                            )}
                        </div>

                        {selectedTeamIds.length > 0 && (
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-indigo-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Project-Specific Permissions</span>
                                    </div>
                                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                                        <SelectTrigger className="w-[180px] rounded-xl bg-slate-50 dark:bg-slate-900 border-none h-10 font-black uppercase tracking-widest text-[9px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                                            <SelectItem value="full_access" className="text-[9px] font-black uppercase">Full Access</SelectItem>
                                            <SelectItem value="editor" className="text-[9px] font-black uppercase">Editor</SelectItem>
                                            <SelectItem value="viewer" className="text-[9px] font-black uppercase">Viewer</SelectItem>
                                            <SelectItem value="custom" className="text-[9px] font-black uppercase">Custom Role</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 flex items-start gap-3">
                                    <Info className="h-4 w-4 text-indigo-600 mt-0.5" />
                                    <p className="text-[9px] font-bold text-indigo-600/80 leading-relaxed uppercase tracking-wider">
                                        Permissions apply to all members of the selected teams within the context of this project.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <Button 
                                variant="ghost" 
                                className="flex-1 rounded-2xl font-black uppercase tracking-widest h-14"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                className="flex-[2] rounded-2xl font-black uppercase tracking-widest h-14 shadow-xl shadow-indigo-500/20"
                                disabled={selectedTeamIds.length === 0 || linkMutation.isPending}
                                onClick={() => linkMutation.mutate()}
                            >
                                {linkMutation.isPending ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Confirm & Add Team <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <CreateTeamDialog 
                isOpen={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                workspaceId={workspaceId}
                autoLinkToProjectId={projectId}
            />
        </>
    );
}
