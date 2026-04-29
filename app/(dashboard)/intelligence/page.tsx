"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Plus, 
    Search, 
    Zap, 
    Clock, 
    Star, 
    FileText, 
    LayoutGrid, 
    ChevronRight,
    SearchCheck,
    Library,
    ArrowRight,
    PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function IntelligencePage() {
    const { activeWorkspaceId } = useWorkspace();
    const queryClient = useQueryClient();
    const router = useRouter();
    const [search, setSearch] = useState("");

    const { data: documents, isLoading } = useQuery({
        queryKey: ["intelligence-home", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/intelligence?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch intelligence");
            return res.json();
        },
        enabled: !!activeWorkspaceId
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/intelligence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    workspaceId: activeWorkspaceId,
                    title: "Strategic Overview" 
                }),
            });
            return res.json();
        },
        onSuccess: (newDoc) => {
            toast.success("Intelligence node initialized");
            router.push(`/intelligence/${newDoc.id}`);
        }
    });

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center animate-pulse">
                    <Zap className="h-8 w-8 text-indigo-500" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Synchronizing Cortex...</span>
            </div>
        </div>
    );

    const pinnedDocs = (documents || []).filter((d: any) => d.isPinned);
    const recentDocs = (documents || []).slice(0, 6);

    return (
        <div className="flex-1 overflow-y-auto bg-background/50 backdrop-blur-3xl scrollbar-none">
            <div className="max-w-7xl mx-auto px-8 py-12 space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Library className="h-5 w-5 text-white" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase">Intelligence</h1>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground max-w-lg">
                            The centralized knowledge cortex for your workspace. Manage strategic documentation, wiki nodes, and neural references.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Scan Neural Net..."
                                className="pl-12 h-14 rounded-2xl bg-white dark:bg-slate-900 border-none shadow-sm text-xs font-bold tracking-tight"
                            />
                        </div>
                        <Button 
                            onClick={() => createMutation.mutate()}
                            className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <PlusCircle className="h-5 w-5 mr-2" />
                            Initialize Node
                        </Button>
                    </div>
                </div>

                {/* Hero Section / Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="group p-8 rounded-[3rem] bg-indigo-600 shadow-2xl shadow-indigo-500/20 text-white overflow-hidden relative">
                         <div className="relative z-10 space-y-4">
                             <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                 <FileText className="h-6 w-6" />
                             </div>
                             <h3 className="text-xl font-black uppercase tracking-tight">Create Document</h3>
                             <p className="text-white/60 text-xs font-bold leading-relaxed uppercase tracking-widest">
                                 Start a new strategic intelligence node from scratch.
                             </p>
                             <Button onClick={() => createMutation.mutate()} className="bg-white text-indigo-600 hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest text-[10px] h-10 px-6 mt-4">
                                 Begin Now
                             </Button>
                         </div>
                         <Zap className="absolute -bottom-8 -right-8 h-48 w-48 text-white/5 rotate-12" />
                    </div>

                    <div className="group p-8 rounded-[3rem] bg-slate-900 dark:bg-slate-900 text-white overflow-hidden relative">
                         <div className="relative z-10 space-y-4">
                             <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                 <Library className="h-6 w-6" />
                             </div>
                             <h3 className="text-xl font-black uppercase tracking-tight">Browse Templates</h3>
                             <p className="text-white/60 text-xs font-bold leading-relaxed uppercase tracking-widest">
                                 Use pre-built neural patterns for fast deployment.
                             </p>
                             <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] h-10 px-6 mt-4">
                                 View Gallery
                             </Button>
                         </div>
                         <SearchCheck className="absolute -bottom-8 -right-8 h-48 w-48 text-white/5 rotate-12" />
                    </div>

                    <div className="group p-8 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden relative">
                         <div className="relative z-10 space-y-4">
                             <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                 <Star className="h-6 w-6" />
                             </div>
                             <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Pinned Intel</h3>
                             <p className="text-muted-foreground text-xs font-bold leading-relaxed uppercase tracking-widest">
                                 Access your most critical neural references instantly.
                             </p>
                             <div className="flex -space-x-3 mt-4">
                                 {pinnedDocs.slice(0, 4).map((d: any) => (
                                     <div key={d.id} className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-lg shadow-sm">
                                         {d.emoji || "📄"}
                                     </div>
                                 ))}
                                 {pinnedDocs.length > 4 && (
                                     <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500">
                                         +{pinnedDocs.length - 4}
                                     </div>
                                 )}
                             </div>
                         </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Column: Recent & All */}
                    <div className="lg:col-span-8 space-y-12">
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 text-indigo-500" />
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em]">Recent Intelligence</h2>
                                </div>
                                <Link href="#" className="text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:text-indigo-600 transition-colors">See All</Link>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recentDocs.map((doc: any) => (
                                    <Link key={doc.id} href={`/intelligence/${doc.id}`}>
                                        <div className="group p-5 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500 shadow-sm">
                                                    {doc.emoji || "📄"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 truncate">{doc.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                                                            {formatDistanceToNow(new Date(doc.updatedAt))} ago
                                                        </span>
                                                        <span className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500/60">
                                                            {doc.user?.name?.split(" ")[0] || "Unknown"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <LayoutGrid className="h-4 w-4 text-indigo-500" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em]">Knowledge Categories</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {["Onboarding", "Technical", "Operations", "Legal", "Marketing", "Research", "Strategy", "HR"].map((cat) => (
                                    <div key={cat} className="group p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer transition-all">
                                        <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                            <FileText className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">{cat}</h4>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">12 Nodes</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Meta Info & Help */}
                    <div className="lg:col-span-4 space-y-8">
                         <div className="p-8 rounded-[3rem] bg-indigo-500/5 border border-indigo-500/10 space-y-6">
                             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Workspace Health</h3>
                             <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                     <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Intelligence Nodes</span>
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">{documents?.length || 0}</span>
                                 </div>
                                 <div className="flex items-center justify-between">
                                     <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Verified Articles</span>
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">85%</span>
                                 </div>
                                 <div className="flex items-center justify-between">
                                     <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Neural Uptime</span>
                                     <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">99.9%</span>
                                 </div>
                             </div>
                             <div className="pt-4 border-t border-indigo-500/10">
                                 <p className="text-[9px] font-bold leading-relaxed text-indigo-900/60 dark:text-indigo-300/60 uppercase tracking-tight">
                                     Your workspace intelligence is growing. Keep updating nodes to maintain neural consistency.
                                 </p>
                             </div>
                         </div>

                         <div className="p-8 rounded-[3rem] bg-slate-900 text-white space-y-6 relative overflow-hidden">
                             <div className="relative z-10 space-y-4">
                                 <h3 className="text-xl font-black uppercase tracking-tight">Need Help?</h3>
                                 <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                     Our AI guide can help you find neural connections and summarize document clusters.
                                 </p>
                                 <Button className="w-full bg-white text-slate-900 hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 shadow-xl shadow-white/5">
                                     Ask AI Assistant
                                     <ArrowRight className="h-4 w-4 ml-2" />
                                 </Button>
                             </div>
                             <Zap className="absolute -top-12 -right-12 h-40 w-40 text-white/5 -rotate-12" />
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
