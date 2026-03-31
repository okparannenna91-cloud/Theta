"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
    Save, 
    Trash2, 
    Settings as SettingsIcon,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

import { usePopups } from "@/components/popups/popup-manager";

interface ProjectSettingsProps {
    project: any;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || "");
    const [color, setColor] = useState(project.color || "#4f46e5");
    const { showConfirm, showUpgradePrompt } = usePopups();
    const queryClient = useQueryClient();
    const router = useRouter();

    const updateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, color }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update project");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project", project.id] });
            toast.success("Project updated successfully");
        },
        onError: (error: any) => {
            if (error.message.includes("limit") || error.message.includes("Upgrade")) {
                showUpgradePrompt("projects");
            } else {
                toast.error(error.message);
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete project");
            }
        },
        onSuccess: () => {
             toast.success("Project deleted successfully");
             router.push("/projects");
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    const handleDeleteClick = () => {
        showConfirm({
            title: "Total Annihilation",
            description: `You are about to permanently delete "${project.name}". This action cannot be undone and all associated data will be lost in the void.`,
            actionLabel: "Confirm Deletion",
            destructive: true,
            onAction: () => deleteMutation.mutate()
        });
    };

    return (
        <div className="max-w-4xl space-y-8 h-full overflow-y-auto pr-2 pb-10">
            <div className="flex items-center gap-3 mb-8">
                 <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                      <SettingsIcon className="h-6 w-6" />
                 </div>
                 <div>
                     <h3 className="text-2xl font-black uppercase tracking-tight">Project Configuration</h3>
                     <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mt-1">Manage Settings & Danger Zone</p>
                 </div>
            </div>

            <Card className="rounded-3xl border-slate-200/60 dark:border-slate-800/60 shadow-lg overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">General Details</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest">Update the foundational identity of this project.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Project Name</Label>
                        <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className="h-12 rounded-xl font-medium"
                            placeholder="Enter project name..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</Label>
                        <Textarea 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)}
                            className="rounded-xl min-h-[120px] resize-none font-medium"
                            placeholder="Describe the project goals..."
                        />
                    </div>

                    <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Brand Color</Label>
                         <div className="flex items-center gap-4">
                              <Input 
                                  type="color" 
                                  value={color} 
                                  onChange={(e) => setColor(e.target.value)}
                                  className="h-12 w-20 p-1 rounded-xl cursor-pointer"
                              />
                              <div className="flex-1 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                   <div className="h-6 w-6 rounded-full shadow-inner" style={{ backgroundColor: color }} />
                                   <span className="text-sm font-bold opacity-70 uppercase">{color}</span>
                              </div>
                         </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 border-t p-6 flex justify-end">
                    <Button 
                        onClick={() => updateMutation.mutate()} 
                        disabled={updateMutation.isPending || !name}
                        className="rounded-2xl px-8 font-black uppercase tracking-widest text-[10px] h-12 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20"
                    >
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        {!updateMutation.isPending && <CheckCircle2 className="h-4 w-4 ml-2" />}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="rounded-3xl border-red-200 dark:border-red-900/50 shadow-lg overflow-hidden bg-red-50/30 dark:bg-red-950/20">
                <CardHeader className="border-b border-red-100 dark:border-red-900/30">
                    <CardTitle className="text-lg font-black uppercase tracking-tight text-red-600 flex items-center gap-2">
                         <AlertTriangle className="h-5 w-5" /> Danger Zone
                    </CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-red-500/70">Irreversible actions that affect the entire project lifecycle.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                         <div>
                              <h4 className="font-black text-sm uppercase">Delete Project</h4>
                              <p className="text-xs text-muted-foreground mt-1 max-w-md font-medium">
                                  This action is permanent and will delete all tasks, boards, comments, and files associated with this project.
                              </p>
                         </div>
                         <Button 
                             variant="destructive" 
                             onClick={handleDeleteClick}
                             className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-11"
                         >
                             <Trash2 className="h-4 w-4 mr-2" />
                             Delete Project
                         </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
