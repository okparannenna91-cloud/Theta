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
    Loader2,
    Link as LinkIcon,
    ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { AdvancedEditor, EditorBlock } from "@/components/wiki/editor/advanced-editor";

import { WikiPresence } from "@/components/wiki/wiki-presence";

export default function DocumentPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = params.id as string;

    const [title, setTitle] = useState("");
    const [blocks, setBlocks] = useState<EditorBlock[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const { data: document, isLoading } = useQuery({
        queryKey: ["document", id],
        queryFn: async () => {
            const res = await fetch(`/api/docs/${id}`);
            if (!res.ok) throw new Error("Failed to fetch document");
            const data = await res.json();
            setTitle(data.title);
            
            // Try to parse blocks from content
            try {
                if (data.content && (data.content.startsWith("[") || data.content.startsWith("{"))) {
                    setBlocks(JSON.parse(data.content));
                } else {
                    // Fallback for legacy plain text content
                    setBlocks([{
                        id: crypto.randomUUID(),
                        type: "paragraph",
                        content: data.content || ""
                    }]);
                }
            } catch (e) {
                setBlocks([{
                    id: crypto.randomUUID(),
                    type: "paragraph",
                    content: data.content || ""
                }]);
            }
            
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
            await updateMutation.mutateAsync({ 
                title, 
                content: JSON.stringify(blocks) 
            });
        } catch (err) {
            toast.error("Failed to save document");
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save logic
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener("keydown", down);
        return () => window.removeEventListener("keydown", down);
    }, [title, blocks]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Intelligence...</p>
            </div>
        );
    }

    if (!document) return <div>Document not found</div>;

    const wordCount = blocks.reduce((acc, b) => acc + b.content.split(/\s+/).filter(Boolean).length, 0);

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
                            className="border-none bg-transparent text-lg font-black focus-visible:ring-0 w-64 sm:w-96 p-0 shadow-none text-slate-900 dark:text-slate-100"
                            placeholder="Document Title"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <WikiPresence documentId={id} />
                    
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

                    {/* Editor Engine */}
                    <div className="flex-1 p-10 md:p-16 overflow-y-auto custom-scrollbar">
                        <AdvancedEditor 
                            blocks={blocks} 
                            workspaceId={document.workspaceId}
                            onChange={setBlocks}
                            onSave={handleSave}
                            placeholder="Begin your strategic documentation..."
                        />
                    </div>

                    {/* Backlinks Section */}
                    {document.backlinks && document.backlinks.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-32 p-16 pt-20 border-t border-slate-100 dark:border-white/5 space-y-10"
                        >
                            <div className="flex items-center gap-4">
                                <LinkIcon className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Bi-directional Nodes (Backlinks)</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {document.backlinks.map((link: any) => (
                                    <Link key={link.id} href={`/wiki/${link.id}`}>
                                        <div className="group p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                        {link.emoji || "📄"}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">{link.title || "Untitled Node"}</h4>
                                                        <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground opacity-50 mt-1">Mentioned {formatDistanceToNow(new Date(link.updatedAt), { addSuffix: true })}</p>
                                                    </div>
                                                </div>
                                                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="mt-8 flex items-center justify-between text-muted-foreground">
                     <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                               <FileText className="h-4 w-4" />
                               <span className="text-xs font-bold">{wordCount} Words</span>
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
