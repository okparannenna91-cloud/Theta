"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { 
    ChevronLeft, 
    Save, 
    Trash2, 
    MoreVertical, 
    Clock, 
    Globe, 
    Lock,
    Maximize2,
    Settings,
    FileText,
    Sparkles,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function DocumentPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = params.id as string;

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const { data: document, isLoading } = useQuery({
        queryKey: ["document", id],
        queryFn: async () => {
            const res = await fetch(`/api/docs/${id}`);
            if (!res.ok) throw new Error("Failed to fetch document");
            const data = await res.json();
            setTitle(data.title);
            setContent(data.content || "");
            return data;
        },
        enabled: !!id,
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch(`/api/docs/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to save");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["document", id] });
            toast.success("Changes saved");
        },
    });

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({ title, content });
        } catch (err) {
            toast.error("Failed to save document");
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save logic (optional, let's keep it manual for now but add a shortcut)
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener("keydown", down);
        return () => window.removeEventListener("keydown", down);
    }, [title, content]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Intelligence...</p>
            </div>
        );
    }

    if (!document) return <div>Document not found</div>;

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#020617] flex flex-col">
            {/* Toolbar */}
            <header className="h-16 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/wiki">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{document.emoji || "📄"}</span>
                        <Input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="border-none bg-transparent text-lg font-black focus-visible:ring-0 w-64 sm:w-96 p-0 shadow-none"
                            placeholder="Document Title"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-4">
                        <Clock className="h-3 w-3" />
                        <span>Saved {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}</span>
                    </div>
                    
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        {isSaving ? "Saving..." : "Save Intel"}
                    </Button>

                    <Button variant="ghost" size="icon" className="rounded-xl">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Editor Area */}
            <main className="flex-1 max-w-5xl mx-auto w-full p-8 md:p-16">
                <div className="bg-white dark:bg-slate-900 min-h-[70vh] rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 border border-slate-200/50 dark:border-white/5 overflow-hidden flex flex-col">
                    <div className="p-4 border-b bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                         <div className="flex items-center gap-4 ml-2">
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                   <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                   <span className="text-[10px] font-black uppercase tracking-widest">Live Node</span>
                              </div>
                              {document.isPublic ? (
                                   <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Globe className="h-3.5 w-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-tight">Public Access</span>
                                   </div>
                              ) : (
                                   <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Lock className="h-3.5 w-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-tight">Private Encrypted</span>
                                   </div>
                              )}
                         </div>
                         <div className="flex items-center gap-2">
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground">
                                 <Maximize2 className="h-4 w-4" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground">
                                 <Sparkles className="h-4 w-4" />
                             </Button>
                         </div>
                    </div>

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Start typing your strategic documentation..."
                        className="flex-1 w-full p-10 md:p-16 resize-none bg-transparent outline-none text-slate-700 dark:text-slate-300 leading-relaxed text-lg font-medium placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    />
                </div>

                <div className="mt-8 flex items-center justify-between text-muted-foreground">
                     <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                               <FileText className="h-4 w-4" />
                               <span className="text-xs font-bold">{content.split(/\s+/).filter(Boolean).length} Words</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                               <Settings className="h-3.5 w-3.5" />
                               <span>Intel Configuration</span>
                          </div>
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Theta Intelligence System v1.0</p>
                </div>
            </main>
        </div>
    );
}
