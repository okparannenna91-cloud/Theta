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
    ArrowUpRight,
    Network,
    Download,
    Timer,
    ListTree,
    Pin,
    PinOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { AdvancedEditor, EditorBlock } from "@/components/wiki/editor/advanced-editor";
import { WikiPresence } from "@/components/wiki/wiki-presence";
import { WikiGraph } from "@/components/wiki/wiki-graph";

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
            
            try {
                if (data.content && (data.content.startsWith("[") || data.content.startsWith("{"))) {
                    setBlocks(JSON.parse(data.content));
                } else {
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

    useEffect(() => {
        if (document) {
            const recent = JSON.parse(localStorage.getItem("recent-wiki-pages") || "[]");
            const newRecent = [
                { id: document.id, title: document.title, emoji: document.emoji },
                ...recent.filter((r: any) => r.id !== document.id)
            ].slice(0, 5);
            localStorage.setItem("recent-wiki-pages", JSON.stringify(newRecent));
        }
    }, [document]);

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

    useEffect(() => {
        const timer = setTimeout(() => {
            if (title !== document?.title || JSON.stringify(blocks) !== document?.content) {
                handleSave();
            }
        }, 3000); // 3 second debounce

        return () => clearTimeout(timer);
    }, [title, blocks]);

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
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const exportToMarkdown = () => {
        let md = `# ${title || "Untitled"}\n\n`;
        blocks.forEach(b => {
            if (b.type === "h1") md += `# ${b.content}\n\n`;
            else if (b.type === "h2") md += `## ${b.content}\n\n`;
            else if (b.type === "h3") md += `### ${b.content}\n\n`;
            else if (b.type === "h4") md += `#### ${b.content}\n\n`;
            else if (b.type === "h5") md += `##### ${b.content}\n\n`;
            else if (b.type === "h6") md += `###### ${b.content}\n\n`;
            else if (b.type === "bullet") md += `- ${b.content}\n`;
            else if (b.type === "number") md += `1. ${b.content}\n`;
            else if (b.type === "todo") md += `- [${b.metadata?.checked ? "x" : " "}] ${b.content}\n`;
            else if (b.type === "quote") md += `> ${b.content}\n\n`;
            else if (b.type === "code") md += `\`\`\`\n${b.content}\n\`\`\`\n\n`;
            else if (b.type === "divider") md += `---\n\n`;
            else md += `${b.content}\n\n`;
        });
        
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(title || "document").toLowerCase().replace(/\s+/g, '-')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Document exported to Markdown");
    };

    const toc = blocks.filter(b => ["h1", "h2", "h3"].includes(b.type));

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#020617] flex flex-col">
            <header className="h-16 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/wiki">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                            <Link href="/wiki" className="hover:text-indigo-600 transition-colors">Wiki</Link>
                            {document.parent && (
                                <>
                                    <span className="opacity-30">/</span>
                                    <Link href={`/wiki/${document.parent.id}`} className="hover:text-indigo-600 transition-colors truncate max-w-[100px]">
                                        {document.parent.title}
                                    </Link>
                                </>
                            )}
                            <span className="opacity-30">/</span>
                            <span className="text-indigo-600 truncate max-w-[150px]">{title || "New Intel"}</span>
                        </div>
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
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 transition-all hover:border-indigo-500/30 group cursor-default">
                        <Network className="h-3 w-3 text-indigo-600 group-hover:rotate-45 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                            {document.backlinks?.length || 0} Nodes Connected
                        </span>
                    </div>

                    <WikiPresence documentId={id} />
                    
                    <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-4">
                        <Clock className="h-3 w-3" />
                        <span>Saved {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}</span>
                    </div>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => updateMutation.mutate({ isPinned: !document.isPinned })}
                        className={cn("rounded-xl transition-all", document.isPinned ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" : "text-muted-foreground")}
                    >
                        {document.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </Button>

                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        {isSaving ? "Saving..." : "Save Intel"}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl shadow-xl p-2 border border-slate-200 dark:border-white/10 dark:bg-slate-900/90 backdrop-blur-xl">
                            <DropdownMenuItem onClick={exportToMarkdown} className="rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest cursor-pointer">
                                <Download className="h-4 w-4 mr-2" />
                                Export Markdown
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest text-red-500 cursor-pointer">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Archive Node
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-8 md:p-16 flex gap-8 items-start">
                <div className="flex-1 min-w-0 flex flex-col items-center">
                    <div className="bg-white dark:bg-slate-900 min-h-[70vh] rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 border border-slate-200/50 dark:border-white/5 overflow-hidden flex flex-col w-full max-w-5xl">
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

                        <div className="flex-1 p-10 md:p-16 overflow-y-auto custom-scrollbar">
                            <AdvancedEditor 
                                blocks={blocks} 
                                workspaceId={document.workspaceId}
                                projectId={document.projectId}
                                onChange={setBlocks}
                                onSave={handleSave}
                                placeholder="Begin your strategic documentation..."
                            />
                        </div>

                        {document.backlinks && document.backlinks.length > 0 && (
                            <div className="px-16 pb-16">
                                <WikiGraph currentDoc={document} backlinks={document.backlinks} />
                            </div>
                        )}

                        {document.backlinks && document.backlinks.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-20 p-16 pt-20 border-t border-slate-100 dark:border-white/5 space-y-10"
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

                    <div className="mt-8 flex w-full max-w-5xl items-center justify-between text-muted-foreground">
                         <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                   <FileText className="h-4 w-4" />
                                   <span className="text-xs font-bold">{wordCount} Words</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground/60">
                                   <Timer className="h-4 w-4" />
                                   <span className="text-xs font-bold">{readingTime} min read</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                   <Settings className="h-3.5 w-3.5" />
                                   <span>Intel Configuration</span>
                              </div>
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Theta Intelligence System v1.0</p>
                    </div>
                </div>

                {/* TOC SIDEBAR */}
                {toc.length > 0 && (
                    <div className="hidden xl:block w-64 shrink-0 sticky top-24">
                        <div className="flex items-center gap-2 mb-6">
                            <ListTree className="h-4 w-4 text-indigo-600" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Table of Contents</h3>
                        </div>
                        <div className="space-y-1 pl-2 border-l border-slate-200 dark:border-white/10 relative">
                            {toc.map((b, i) => (
                                <div 
                                    key={b.id} 
                                    onClick={() => {
                                        const el = document.getElementById(`block-${b.id}`);
                                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                    className={cn(
                                        "py-1.5 cursor-pointer hover:text-indigo-600 transition-colors text-sm font-medium truncate text-slate-600 dark:text-slate-400",
                                        b.type === "h2" && "pl-4 text-xs",
                                        b.type === "h3" && "pl-8 text-[10px] opacity-80"
                                    )}
                                >
                                    {b.content}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
