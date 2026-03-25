"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Archive, MoreVertical, FileText, FilePlus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ProjectDocsProps {
    projectId: string;
    workspaceId: string;
}

export function ProjectDocs({ projectId, workspaceId }: ProjectDocsProps) {
    const queryClient = useQueryClient();

    const { data: documents, isLoading } = useQuery({
        queryKey: ["project-docs", projectId],
        queryFn: async () => {
            const res = await fetch(`/api/docs?workspaceId=${workspaceId}&projectId=${projectId}`);
            if (!res.ok) throw new Error("Failed to fetch documents");
            return res.json();
        },
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/docs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    workspaceId, 
                    projectId,
                    title: "New Project Document" 
                }),
            });
            if (!res.ok) throw new Error("Failed to create document");
            return res.json();
        },
        onSuccess: (newDoc) => {
            queryClient.invalidateQueries({ queryKey: ["project-docs", projectId] });
            toast.success("Project document created");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project-docs", projectId] });
            toast.success("Document archived");
        },
    });

    if (isLoading) return <div className="p-10 animate-pulse text-muted-foreground font-black uppercase text-[10px] tracking-widest">Compiling Files...</div>;

    return (
        <div className="space-y-8 h-full overflow-y-auto pr-2 pb-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                     <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Project Wiki</h3>
                     <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1">Foundational Intelligence & Strategy</p>
                </div>
                <Button onClick={() => createMutation.mutate()} className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg shadow-indigo-500/20">
                    <Plus className="h-4 w-4 mr-2" />
                    New Doc
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents?.map((doc: any) => (
                    <Card key={doc.id} className="group hover:shadow-2xl hover:-translate-y-1 transition-all border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl relative overflow-hidden h-48 rounded-[2rem]">
                        <Link href={`/wiki/${doc.id}`} className="absolute inset-0 z-0" />
                        
                        <CardHeader className="p-6 relative z-10">
                            <div className="flex items-start justify-between">
                                <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner">
                                    {doc.emoji || "📄"}
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative z-20">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 dark:border-slate-800">
                                        <DropdownMenuItem onClick={() => deleteMutation.mutate(doc.id)} className="text-red-500 font-bold uppercase tracking-widest text-[10px] cursor-pointer">
                                            <Archive className="h-3 w-3 mr-2" />
                                            Archive
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="mt-4">
                                <CardTitle className="text-lg font-black truncate pr-4 text-slate-900 dark:text-slate-100">{doc.title}</CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                     <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tight">Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                ))}

                {documents?.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-slate-50/50 dark:bg-slate-900/50 border-4 border-dashed rounded-[4rem] flex flex-col items-center justify-center space-y-6">
                         <div className="h-20 w-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-xl border border-slate-200 dark:border-slate-800">
                              <FilePlus className="h-8 w-8 text-slate-300" />
                         </div>
                         <div>
                             <p className="text-xl font-black uppercase tracking-tight">Project is Silenced</p>
                             <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest mt-1">Add documentation to anchor your project intelligence.</p>
                         </div>
                         <Button onClick={() => createMutation.mutate()} variant="outline" className="rounded-2xl border-2 px-8 font-black uppercase tracking-widest text-[10px] h-12">
                             Initialize Doc Store
                         </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
