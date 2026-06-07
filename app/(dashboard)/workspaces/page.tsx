"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/hooks/use-workspace";
import { Plus, ArrowRight, CheckCircle2, Building2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function WorkspacesPage() {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { workspaces, activeWorkspaceId, switchWorkspace, isLoading, error } = useWorkspace();

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await fetch("/api/workspaces", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) throw new Error("Failed to create workspace");
            return res.json();
        },
        onSuccess: (newWorkspace) => {
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            setIsOpen(false); setName("");
            toast.success("Workspace created successfully");
            switchWorkspace(newWorkspace.id);
            router.push("/dashboard");
        },
        onError: (error: any) => { toast.error(error.message); },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
            if (!res.ok) { const error = await res.json(); throw new Error(error.error || "Failed to delete workspace"); }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            setDeleteId(null);
            toast.success("Workspace deleted successfully");
            router.refresh();
        },
        onError: (error: any) => { toast.error(error.message); },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        createMutation.mutate(name);
    };

    const handleDelete = (id: string) => { deleteMutation.mutate(id); };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Loading your workspaces...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="max-w-md w-full border shadow-sm">
                    <CardHeader className="text-center">
                        <div className="mx-auto h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        </div>
                        <CardTitle className="text-base">Connection Issue</CardTitle>
                        <CardDescription>We couldn&apos;t retrieve your workspaces. Please try again.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-6">
                        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="pb-10 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Workspaces</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your organizations and environments
                    </p>
                </div>
                <Button onClick={() => setIsOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Create Workspace
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workspaces?.map((ws: any) => (
                    <Card key={ws.id}
                        className={`border shadow-sm transition-all hover:shadow-md cursor-pointer ${activeWorkspaceId === ws.id ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"}`}>
                        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                            {activeWorkspaceId === ws.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            {ws.role === "owner" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => { e.stopPropagation(); setDeleteId(ws.id); }}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <div className="h-full" onClick={() => { switchWorkspace(ws.id); router.push("/dashboard"); }}>
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${activeWorkspaceId === ws.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">{ws.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1.5 text-xs mt-0.5">
                                            <span className="capitalize">{ws.plan || "Free"}</span>
                                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
                                            {ws.role || "Member"}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 border-t mt-4 py-4 bg-muted/20">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <div className="flex gap-4">
                                        <span>{ws._count?.projects || 0} Projects</span>
                                        <span>{ws._count?.members || 0} Members</span>
                                    </div>
                                    <div className="flex items-center gap-1 font-semibold text-primary">
                                        Enter <ArrowRight className="h-3 w-3" />
                                    </div>
                                </div>
                            </CardContent>
                        </div>
                    </Card>
                ))}

                <button onClick={() => setIsOpen(true)}
                    className="h-full min-h-[160px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors p-6">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">Create New Workspace</span>
                </button>
            </div>

            <div className="mt-8 p-5 rounded-lg border bg-muted/30">
                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Workspace Fundamentals
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
                    <div className="space-y-1">
                        <p className="font-medium text-foreground">Strict Isolation</p>
                        <p>Every workspace has its own projects, tasks, and teams. Data never crosses organization boundaries.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-medium text-foreground">Individual Billing</p>
                        <p>Subscriptions and limits are managed per workspace.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-medium text-foreground">Team Collaboration</p>
                        <p>Invite members directly to a workspace.</p>
                    </div>
                </div>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Workspace</DialogTitle>
                        <CardDescription>Workspaces are top-level containers for your projects, teams, and billing.</CardDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Workspace Name</Label>
                            <Input id="name" placeholder="e.g. Acme Inc, Development, Personal" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                                {createMutation.isPending ? "Creating..." : "Create Workspace"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" /> Delete Workspace
                        </DialogTitle>
                        <CardDescription>This action is permanent and will delete all projects, tasks, and data.</CardDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && handleDelete(deleteId)}>
                            {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
