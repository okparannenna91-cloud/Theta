"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WikiTree } from "@/components/wiki/wiki-tree";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProjectDocsProps {
    projectId: string;
    workspaceId: string;
}

export function ProjectDocs({ projectId, workspaceId }: ProjectDocsProps) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [search, setSearch] = useState("");

    const { data: documents, isLoading } = useQuery({
        queryKey: ["project-docs", projectId],
        queryFn: async () => {
            const res = await fetch(`/api/docs?workspaceId=${workspaceId}&projectId=${projectId}`);
            if (!res.ok) throw new Error("Failed to fetch documents");
            return res.json();
        },
    });

    const createMutation = useMutation({
        mutationFn: async (parentId?: string) => {
            const res = await fetch("/api/docs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    workspaceId, 
                    projectId,
                    parentId: parentId || null,
                    title: "New Project Document" 
                }),
            });
            if (!res.ok) throw new Error("Failed to create document");
            return res.json();
        },
        onSuccess: (newDoc) => {
            queryClient.invalidateQueries({ queryKey: ["project-docs", projectId] });
            toast.success("Project document created");
            router.push(`/wiki/${newDoc.id}`);
        },
    });

    const filteredDocs = search 
        ? (documents || []).filter((d: any) => (d.title || "").toLowerCase().includes(search.toLowerCase()))
        : (documents || []);

    if (isLoading) return <div className="p-10 animate-pulse text-muted-foreground font-black uppercase text-[10px] tracking-widest">Compiling Intelligence...</div>;

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 flex-1">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search Intelligence..."
                            className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-none text-[10px] uppercase font-black tracking-widest"
                        />
                    </div>
                </div>
                <Button onClick={() => createMutation.mutate()} className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px] h-10 px-6 shadow-lg shadow-indigo-500/20">
                    <Plus className="h-4 w-4 mr-2" />
                    New Doc
                </Button>
            </div>

            <div className="flex gap-8 h-full">
                {/* Sidebar Tree */}
                <div className="w-80 shrink-0 border-r border-slate-100 dark:border-slate-800 pr-8">
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Document Hierarchy</span>
                    </div>
                    <WikiTree 
                        documents={filteredDocs}
                        onCreatePage={(pid) => createMutation.mutate(pid)}
                    />
                </div>

                {/* Grid View of Top Level Docs */}
                <div className="flex-1 overflow-y-auto pr-2 pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(documents || []).filter((d: any) => !d.parentId).map((doc: any) => (
                             <Link key={doc.id} href={`/wiki/${doc.id}`}>
                                 <div className="group p-6 rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-900/50 border border-transparent hover:border-indigo-500/30 hover:bg-white dark:hover:bg-slate-900 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500">
                                     <div className="flex items-center gap-4">
                                         <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                                             {doc.emoji || "📄"}
                                         </div>
                                         <div>
                                             <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">{doc.title}</h4>
                                             <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                                                 Updated {new Date(doc.updatedAt).toLocaleDateString()}
                                             </p>
                                         </div>
                                     </div>
                                 </div>
                             </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

