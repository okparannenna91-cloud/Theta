"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { 
    Users, 
    Plus, 
    Loader2,
    ArrowRight,
    Type,
    FileText,
    UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateTeamDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    autoLinkToProjectId?: string;
}

export function CreateTeamDialog({ 
    isOpen, 
    onOpenChange, 
    workspaceId,
    autoLinkToProjectId 
}: CreateTeamDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async () => {
            // 1. Create the team
            const teamRes = await fetch("/api/teams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    description,
                    workspaceId
                })
            });
            
            if (!teamRes.ok) {
                const error = await teamRes.json();
                throw new Error(error.error || "Failed to create team");
            }
            
            const team = await teamRes.json();

            // 2. Auto-link to project if requested
            if (autoLinkToProjectId) {
                const linkRes = await fetch(`/api/projects/${autoLinkToProjectId}/teams?workspaceId=${workspaceId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        teamIds: [team.id],
                        role: "full_access" // Default role for newly created teams linked to project
                    })
                });
                
                if (!linkRes.ok) {
                    console.error("Auto-link failed, but team was created");
                }
            }

            return team;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workspace-teams", workspaceId] });
            if (autoLinkToProjectId) {
                queryClient.invalidateQueries({ queryKey: ["project-teams", autoLinkToProjectId] });
            }
            toast.success("Team created and linked successfully");
            onOpenChange(false);
            setName("");
            setDescription("");
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to create team");
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                <div className="bg-indigo-950 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Users className="h-32 w-32" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black uppercase tracking-tight text-white">Create New Team</DialogTitle>
                        <DialogDescription className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">
                            Assemble your elite unit for project success
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-6 bg-white dark:bg-slate-950">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                                <Type className="h-3 w-3" /> Team Name
                            </label>
                            <Input 
                                placeholder="e.g. Design Ops, Core Engineering" 
                                className="rounded-2xl bg-slate-50 dark:bg-slate-900 border-none h-14 font-bold"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                                <FileText className="h-3 w-3" /> Description
                            </label>
                            <Textarea 
                                placeholder="Briefly describe the team's mission..." 
                                className="rounded-2xl bg-slate-50 dark:bg-slate-900 border-none min-h-[100px] font-medium resize-none"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border-2 border-dashed border-amber-200 dark:border-amber-900/30 flex items-start gap-3">
                        <UserPlus className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Quick Start Note</p>
                            <p className="text-[9px] font-bold text-amber-600/80 leading-relaxed uppercase tracking-wider mt-1">
                                You will be added as the Team Admin. You can add more members and assign a Team Lead once the team is created.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button 
                            variant="ghost" 
                            className="flex-1 rounded-2xl font-black uppercase tracking-widest h-14"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="flex-[2] rounded-2xl font-black uppercase tracking-widest h-14 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20"
                            disabled={!name || createMutation.isPending}
                            onClick={() => createMutation.mutate()}
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Create & Link Team <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
