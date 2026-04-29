"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    ChevronRight, 
    ChevronDown, 
    FileText, 
    Plus, 
    MoreHorizontal,
    Search,
    Trash2,
    Settings,
    Layers,
    BookOpen,
    Hash,
    Pin,
    Clock
} from "lucide-react";
import { WikiTree } from "./wiki-tree";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface WikiSidebarProps {
    workspaceId: string;
}

export function WikiSidebar({ workspaceId }: WikiSidebarProps) {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const { data: documents, isLoading } = useQuery({
        queryKey: ["wiki-tree", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/docs?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!workspaceId,
    });
    
    const pinnedDocs = (documents || []).filter((d: any) => d.isPinned);
    
    const [recentPages, setRecentPages] = useState<any[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("recent-wiki-pages");
        if (stored) setRecentPages(JSON.parse(stored));
    }, [params.id]); // Reload on navigation

    const createMutation = useMutation({
        mutationFn: async (parentId?: string) => {
            const res = await fetch("/api/docs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    workspaceId, 
                    title: "Untitled Page",
                    parentId: parentId || null
                }),
            });
            return res.json();
        },
        onSuccess: (newDoc) => {
            queryClient.invalidateQueries({ queryKey: ["wiki-tree", workspaceId] });
            toast.success("Page created");
            router.push(`/wiki/${newDoc.id}`);
        },
    });

    const filteredDocuments = search 
        ? (documents || []).filter((d: any) => (d.title || "").toLowerCase().includes(search.toLowerCase()))
        : (documents || []);

    if (isLoading) return (
        <div className="w-80 border-r dark:border-white/10 p-6 animate-pulse space-y-6">
            <div className="h-10 w-full bg-slate-100 dark:bg-slate-900 rounded-2xl" />
            <div className="h-10 w-full bg-slate-100 dark:bg-slate-900 rounded-2xl" />
            <div className="space-y-4 pt-8">
                {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-full bg-slate-50 dark:bg-slate-900/50 rounded-xl" />)}
            </div>
        </div>
    );

    return (
        <div className="w-80 border-r border-slate-100 dark:border-white/5 flex flex-col h-screen bg-white/60 dark:bg-slate-950/40 backdrop-blur-[64px] lg:translate-x-0 transition-all duration-500 overflow-hidden relative shadow-2xl shadow-indigo-500/5 z-40">
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-600/10">
                              <BookOpen className="h-5 w-5" />
                         </div>
                         <div>
                             <h2 className="text-sm font-black uppercase tracking-tighter text-slate-900 dark:text-slate-100">Knowledge Base</h2>
                             <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest opacity-80">v2.0 Neural Tree</p>
                         </div>
                    </div>
                    <Button onClick={() => createMutation.mutate(undefined)} variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800/50 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-200/50 dark:border-white/10 group">
                        <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                    </Button>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Scan Intelligence..."
                        className="h-11 pl-11 pr-4 bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-white/10 rounded-2xl text-[10px] uppercase font-black tracking-widest focus-visible:ring-4 focus-visible:ring-indigo-500/10 shadow-sm transition-all"
                    />
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 pb-8 space-y-6 scrollbar-thin">
                {pinnedDocs.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
                            <Pin className="h-2.5 w-2.5" />
                            <span>Pinned Intelligence</span>
                        </div>
                        <div className="space-y-0.5">
                            {pinnedDocs.map((doc: any) => (
                                <Link key={doc.id} href={`/wiki/${doc.id}`}>
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer border border-transparent",
                                        params.id === doc.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "hover:bg-slate-100 dark:hover:bg-slate-900/60"
                                    )}>
                                        <span className="text-sm shrink-0">{doc.emoji || "📄"}</span>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-tight truncate",
                                            params.id === doc.id ? "text-white" : "text-slate-600 dark:text-slate-400"
                                        )}>
                                            {doc.title || "Untitled Page"}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {recentPages.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
                            <Clock className="h-2.5 w-2.5" />
                            <span>Recently Viewed</span>
                        </div>
                        <div className="space-y-0.5">
                            {recentPages.map((doc: any) => (
                                <Link key={doc.id} href={`/wiki/${doc.id}`}>
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-transparent",
                                        params.id === doc.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "hover:bg-slate-100 dark:hover:bg-slate-900/60"
                                    )}>
                                        <span className="text-sm shrink-0">{doc.emoji || "📄"}</span>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-tight truncate",
                                            params.id === doc.id ? "text-white" : "text-slate-600 dark:text-slate-400"
                                        )}>
                                            {doc.title || "Untitled Page"}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
                        <Layers className="h-2.5 w-2.5" />
                        <span>Intelligence Tree</span>
                    </div>
                    <WikiTree 
                        documents={filteredDocuments}
                        activeId={params.id as string}
                        workspaceId={workspaceId}
                        onCreatePage={(pid) => createMutation.mutate(pid)}
                    />
                </div>

                {documents?.length === 0 && !isLoading && (
                     <div className="py-20 text-center space-y-4 px-6 grayscale">
                          <Layers className="h-10 w-10 text-muted-foreground mx-auto opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 leading-relaxed">No documentation branches detected in this node.</p>
                          <Button onClick={() => createMutation.mutate(undefined)} variant="outline" className="rounded-xl border-2 px-6 font-black uppercase tracking-widest text-[8px] h-9">Initialize Node</Button>
                     </div>
                )}
            </nav>

            <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50/30 dark:bg-slate-950/20">
                 <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                      <Settings className="h-4 w-4 group-hover:rotate-45 transition-transform duration-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest underline-offset-4 group-hover:underline">Tree Configuration</span>
                 </div>
            </div>
        </div>
    );
}
