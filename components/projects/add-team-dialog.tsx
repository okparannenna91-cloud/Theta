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
                <DialogContent className="sm:max-w-[600px] rounded-lg p-0 overflow-hidden border shadow-sm">
                    <div className="bg-primary p-8 text-primary-foreground relative">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-semibold tracking-tight text-primary-foreground">Add Team to Project</DialogTitle>
                            <DialogDescription className="text-primary-foreground/80 font-semibold text-xs">
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
                                    className="pl-11 rounded-lg bg-slate-50 dark:bg-slate-900 border-none h-12 font-medium"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button 
                                variant="outline" 
                                className="rounded-lg border-dashed border-2 h-12 px-6 font-semibold"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Team
                            </Button>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="h-16 w-full bg-slate-50 dark:bg-slate-900 animate-pulse rounded-lg" />
                                ))
                            ) : filteredTeams.length > 0 ? (
                                filteredTeams.map((team: any) => (
                                    <div 
                                        key={team.id}
                                        onClick={() => toggleTeam(team.id)}
                                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                            selectedTeamIds.includes(team.id)
                                            ? "border-primary bg-primary/10"
                                            : "border-transparent bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-primary shadow-sm">
                                                <Users className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{team.name}</p>
                                                <p className="text-xs font-semibold text-slate-400">{team.membersCount || 0} Members</p>
                                            </div>
                                        </div>
                                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                            selectedTeamIds.includes(team.id)
                                            ? "bg-primary border-primary"
                                            : "border-slate-200 dark:border-slate-700"
                                        }`}>
                                            {selectedTeamIds.includes(team.id) && <Check className="h-4 w-4 text-primary-foreground" />}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm font-semibold text-slate-400">No matching teams found</p>
                                </div>
                            )}
                        </div>

                        {selectedTeamIds.length > 0 && (
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-semibold">Project-Specific Permissions</span>
                                    </div>
                                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                                        <SelectTrigger className="w-[180px] rounded-lg bg-slate-50 dark:bg-slate-900 border-none h-10 font-semibold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-lg border-slate-200 dark:border-slate-800">
                                            <SelectItem value="full_access" className="text-xs font-semibold">Full Access</SelectItem>
                                            <SelectItem value="editor" className="text-xs font-semibold">Editor</SelectItem>
                                            <SelectItem value="viewer" className="text-xs font-semibold">Viewer</SelectItem>
                                            <SelectItem value="custom" className="text-xs font-semibold">Custom Role</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="p-4 rounded-lg bg-primary/10 flex items-start gap-3">
                                    <Info className="h-4 w-4 text-primary mt-0.5" />
                                    <p className="text-xs font-semibold text-primary/80 leading-relaxed">
                                        Permissions apply to all members of the selected teams within the context of this project.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <Button 
                                variant="ghost" 
                                className="flex-1 rounded-lg font-semibold h-14"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                className="flex-[2] rounded-lg font-semibold h-14 shadow-sm"
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
