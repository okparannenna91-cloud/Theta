"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, ChevronRight, MoreVertical, Trash2, FilePlus, Archive, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Document {
    id: string;
    title: string;
    emoji: string;
    updatedAt: string;
    children: any[];
}

export default function DocsPage() {
    const { activeWorkspaceId } = useWorkspace();
    const queryClient = useQueryClient();

    const { data: documents, isLoading } = useQuery<Document[]>({
        queryKey: ["docs", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/docs?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!activeWorkspaceId,
    });

    const router = useRouter(); // <-- NEED TO IMPORT AND ADD THIS

    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/docs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: activeWorkspaceId, title: "Untitled Document" }),
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: (newDoc) => {
            queryClient.invalidateQueries({ queryKey: ["docs", activeWorkspaceId] });
            toast.success("Document created");
            router.push(`/wiki/${newDoc.id}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["docs", activeWorkspaceId] });
            toast.success("Document archived");
        },
    });

    if (isLoading) return <div className="p-10 animate-pulse text-muted-foreground font-bold text-xs uppercase tracking-widest">Scanning Intelligence...</div>;

    return (
        <div className="p-4 sm:p-10 space-y-10 max-w-7xl mx-auto min-h-full bg-slate-50/30 dark:bg-slate-950/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                   <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-gradient mb-2">Knowledge Base</h1>
                   <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-80">Documentation & Strategy</p>
                </div>
                <Button onClick={() => createMutation.mutate()} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl">
                    <Plus className="h-4 w-4 mr-2" />
                    New Intelligence
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents?.map((doc, i) => (
                    <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <Card className="group hover:border-indigo-500/30 transition-all cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1 border-slate-200/60 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl relative overflow-hidden h-52">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <Link href={`/wiki/${doc.id}`} className="absolute inset-0" />

                            <CardHeader className="p-6">
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner">
                                        {doc.emoji}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-2xl border-white/10 shadow-2xl">
                                            <DropdownMenuItem onClick={() => deleteMutation.mutate(doc.id)} className="text-red-500 font-bold uppercase tracking-widest text-[10px] cursor-pointer">
                                                <Archive className="h-3 w-3 mr-2" />
                                                Archive Doc
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="mt-4">
                                    <CardTitle className="text-lg font-black truncate pr-4">{doc.title}</CardTitle>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{doc.children?.length || 0} Pages</span>
                                        <span className="text-slate-200 dark:text-slate-800 text-[10px]">•</span>
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tight">Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </motion.div>
                ))}

                {documents?.length === 0 && (
                    <div className="col-span-full py-32 text-center space-y-6">
                        <div className="h-24 w-24 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                             <FilePlus className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                        </div>
                        <div>
                            <p className="text-xl font-black">No Documentation Found</p>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">Create strategic documents, wiki pages, and architecture notes for your workspace.</p>
                        </div>
                        <Button onClick={() => createMutation.mutate()} variant="outline" className="h-12 border-2 px-8 font-black uppercase tracking-widest text-[10px] rounded-2xl">
                            Initialize Store
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
