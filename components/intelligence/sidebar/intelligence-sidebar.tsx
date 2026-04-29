"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Plus, 
    Search, 
    FileText, 
    ChevronRight, 
    ChevronDown, 
    Pin, 
    Clock, 
    Trash2,
    Settings,
    MoreHorizontal,
    Star,
    Zap,
    Library
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/hooks/use-workspace";
import { IntelligenceTree } from "./intelligence-tree";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function IntelligenceSidebar() {
    const { activeWorkspaceId } = useWorkspace();
    const queryClient = useQueryClient();
    const router = useRouter();
    const params = useParams();
    const [search, setSearch] = useState("");

    const { data: documents, isLoading } = useQuery({
        queryKey: ["intelligence-tree", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/intelligence?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch intelligence");
            return res.json();
        },
        enabled: !!activeWorkspaceId
    });

    const createMutation = useMutation({
        mutationFn: async (parentId?: string) => {
            const res = await fetch("/api/intelligence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    workspaceId: activeWorkspaceId, 
                    parentId: parentId || null,
                    title: "New Strategic Node" 
                }),
            });
            return res.json();
        },
        onSuccess: (newDoc) => {
            queryClient.invalidateQueries({ queryKey: ["intelligence-tree", activeWorkspaceId] });
            toast.success("Intelligence node initialized");
            router.push(`/intelligence/${newDoc.id}`);
        }
    });

    const filteredDocs = search 
        ? (documents || []).filter((d: any) => d.title.toLowerCase().includes(search.toLowerCase()))
        : (documents || []);

    const pinnedDocs = (documents || []).filter((d: any) => d.isPinned);

    return (
        <div className="w-80 h-full border-r bg-slate-50/50 dark:bg-slate-900/50 flex flex-col backdrop-blur-xl">
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cortex v2.0</span>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-xl hover:bg-indigo-500/10 text-indigo-500"
                        onClick={() => createMutation.mutate(undefined)}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Scan Intelligence..."
                        className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-950 border-none shadow-sm text-[10px] font-bold uppercase tracking-tight"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-8 scrollbar-none">
                <div className="space-y-1 mb-4">
                    <button
                        onClick={() => router.push("/intelligence")}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group",
                            !params.id 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                                : "hover:bg-indigo-500/10 text-slate-600 dark:text-slate-400"
                        )}
                    >
                        <Library className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-tight truncate flex-1">Neural Home</span>
                    </button>
                </div>

                {/* Pinned Section */}
                {pinnedDocs.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-2">
                            <Star className="h-3 w-3 text-amber-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Neural Favorites</span>
                        </div>
                        <div className="space-y-1">
                            {pinnedDocs.map((doc: any) => (
                                <button
                                    key={doc.id}
                                    onClick={() => router.push(`/intelligence/${doc.id}`)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group",
                                        params.id === doc.id 
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                                            : "hover:bg-indigo-500/10 text-slate-600 dark:text-slate-400"
                                    )}
                                >
                                    <span className="text-lg">{doc.emoji || "📄"}</span>
                                    <span className="text-[10px] font-black uppercase tracking-tight truncate flex-1">{doc.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Hierarchy */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Library className="h-3 w-3 text-indigo-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Intelligence Tree</span>
                        </div>
                    </div>
                    
                    {isLoading ? (
                        <div className="space-y-2 p-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-8 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <IntelligenceTree 
                            documents={filteredDocs}
                            activeId={params.id as string}
                            onCreatePage={(pid) => createMutation.mutate(pid)}
                        />
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30">
                 <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-12 hover:bg-slate-100 dark:hover:bg-slate-800">
                     <Trash2 className="h-4 w-4 text-slate-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Neural Trash</span>
                 </Button>
            </div>
        </div>
    );
}
