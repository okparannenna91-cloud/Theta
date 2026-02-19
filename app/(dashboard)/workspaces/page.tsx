"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/hooks/use-workspace";
import { Plus, Layout, ArrowRight, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function WorkspacesPage() {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const queryClient = useQueryClient();
    const router = useRouter();
    const { workspaces, activeWorkspaceId, switchWorkspace, isLoading } = useWorkspace();

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await fetch("/api/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) throw new Error("Failed to create workspace");
            return res.json();
        },
        onSuccess: (newWorkspace) => {
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            setIsOpen(false);
            setName("");
            toast.success("Workspace created successfully");
            switchWorkspace(newWorkspace.id);
            router.push("/dashboard");
        },
        onError: (error: any) => {
            toast.error(error.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        createMutation.mutate(name);
    };

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                        Workspaces
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">
                        Manage your organizations and environments
                    </p>
                </motion.div>

                <Button onClick={() => setIsOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg group">
                    <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
                    Create Workspace
                </Button>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Workspace</DialogTitle>
                            <CardDescription>
                                Workspaces are top-level containers for your projects, teams, and billing.
                            </CardDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Workspace Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Acme Inc, Development, Personal"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending || !name.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {createMutation.isPending ? "Creating..." : "Create Workspace"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workspaces?.map((ws: any, i: number) => (
                    <motion.div
                        key={ws.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card
                            className={`relative overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl ${activeWorkspaceId === ws.id
                                ? "ring-2 ring-indigo-500 border-indigo-500 shadow-md"
                                : "hover:border-indigo-300 border-slate-200 dark:border-slate-800"
                                }`}
                            onClick={() => {
                                switchWorkspace(ws.id);
                                router.push("/dashboard");
                            }}
                        >
                            {activeWorkspaceId === ws.id && (
                                <div className="absolute top-0 right-0 p-3">
                                    <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                                </div>
                            )}
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110 ${activeWorkspaceId === ws.id
                                        ? "bg-gradient-to-br from-indigo-500 to-indigo-700"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                        }`}>
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold">{ws.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1.5 mt-0.5">
                                            <span className="capitalize">{ws.plan || "Free"}</span> Plan
                                            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                            {ws.role || "Member"}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 border-t border-slate-50 dark:border-slate-800/50 mt-4 py-4 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <div className="flex gap-4">
                                        <span>{ws._count?.projects || 0} Projects</span>
                                        <span>{ws._count?.members || 0} Members</span>
                                    </div>
                                    <div className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Enter <ArrowRight className="h-3 w-3" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (workspaces?.length || 0) * 0.1 }}
                >
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-full h-full min-h-[160px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-indigo-600 hover:border-indigo-400 transition-all group p-6"
                    >
                        <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                            <Plus className="h-6 w-6" />
                        </div>
                        <span className="font-bold">Create New Workspace</span>
                    </button>
                </motion.div>
            </div>

            <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Layout className="h-5 w-5 text-indigo-500" />
                    Workspace Fundamentals
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
                    <div className="space-y-2">
                        <p className="font-bold text-slate-900 dark:text-white">Strict Isolation</p>
                        <p>Every workspace has its own projects, tasks, and teams. Data never crosses organization boundaries.</p>
                    </div>
                    <div className="space-y-2">
                        <p className="font-bold text-slate-900 dark:text-white">Individual Billing</p>
                        <p>Subscriptions and limits are managed per workspace. You can have a Pro workspace and a Free one simultaneously.</p>
                    </div>
                    <div className="space-y-2">
                        <p className="font-bold text-slate-900 dark:text-white">Team Collaboration</p>
                        <p>Invite members directly to a workspace. Their access level is managed organization-wide.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
