"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { 
    ChevronLeft, 
    Save, 
    Trash2, 
    MoreVertical, 
    Share2, 
    History, 
    Eye,
    MessageSquare,
    Zap,
    Download,
    FileJson,
    FileText as FileIcon,
    Loader2,
    Lock,
    Globe,
    User as UserIcon,
    Clock,
    Star,
    Printer,
    FileCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdvancedEditor } from "@/components/intelligence/editor/advanced-editor";
import { LiveCursors } from "@/components/intelligence/presence/live-cursors";
import { CommentSheet } from "@/components/intelligence/comment-sheet";
import Link from "next/link";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function IntelligenceNodePage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = params.id as string;

    const [title, setTitle] = useState("");
    const [blocks, setBlocks] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const lastSavedContent = useRef<string>("");

    const handleExportMarkdown = () => {
        if (!blocks.length) return;
        let md = `# ${title}\n\n`;
        blocks.forEach(block => {
            switch (block.type) {
                case "h1": md += `# ${block.content}\n\n`; break;
                case "h2": md += `## ${block.content}\n\n`; break;
                case "h3": md += `### ${block.content}\n\n`; break;
                case "bullet": md += `- ${block.content}\n`; break;
                case "todo": md += `- [${block.metadata?.checked ? "x" : " "}] ${block.content}\n`; break;
                case "quote": md += `> ${block.content}\n\n`; break;
                case "code": md += `\`\`\`\n${block.content}\n\`\`\`\n\n`; break;
                default: md += `${block.content}\n\n`; break;
            }
        });
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title || "Intelligence-Node"}.md`;
        a.click();
        toast.success("Markdown exported successfully");
    };

    const handleTogglePublic = async () => {
        const newVisibility = document?.visibility === "PUBLIC" ? "INTERNAL" : "PUBLIC";
        try {
            await updateMutation.mutateAsync({ visibility: newVisibility });
            toast.success(`Access level updated to ${newVisibility}`);
        } catch (e) {
            toast.error("Failed to update access level");
        }
    };

    const { data: document, isLoading, error } = useQuery({
        queryKey: ["intelligence-node", id],
        queryFn: async () => {
            const res = await fetch(`/api/intelligence/${id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("Intelligence node not found");
                throw new Error("Failed to scan intelligence");
            }
            const data = await res.json();
            
            setTitle(data.title);
            try {
                const parsedContent = JSON.parse(data.content);
                setBlocks(Array.isArray(parsedContent) ? parsedContent : []);
                lastSavedContent.current = data.content;
            } catch (e) {
                setBlocks([]);
                lastSavedContent.current = "[]";
            }
            
            return data;
        },
        enabled: !!id,
        retry: 3,
        retryDelay: 1000
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch(`/api/intelligence/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to synchronize");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["intelligence-node", id] });
            queryClient.invalidateQueries({ queryKey: ["intelligence-tree"] });
        },
    });

    const handleSave = useCallback(async (isSilent = false) => {
        const currentContent = JSON.stringify(blocks);
        if (title === document?.title && currentContent === lastSavedContent.current) return;

        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({ 
                title, 
                content: currentContent 
            });
            lastSavedContent.current = currentContent;
            if (!isSilent) toast.success("Intelligence synchronized");
        } catch (err) {
            toast.error("Failed to synchronize intelligence");
        } finally {
            setIsSaving(false);
        }
    }, [title, blocks, document?.title, updateMutation]);

    // Auto-save logic
    useEffect(() => {
        const timer = setTimeout(() => {
            const currentContent = JSON.stringify(blocks);
            if (title !== document?.title || currentContent !== lastSavedContent.current) {
                handleSave(true);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [title, blocks, handleSave]);

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Decoding Neural Node...</span>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-[2.5rem] bg-rose-500/10 flex items-center justify-center mx-auto">
                    <Trash2 className="h-10 w-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Intelligence Lost</h2>
                <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">{error.message}</p>
                <Button onClick={() => router.push("/intelligence")} variant="outline" className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px]">
                    Return to Library
                </Button>
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            {/* Toolbar */}
            <header className="h-20 border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl px-8 flex items-center justify-between z-20 shrink-0">
                <div className="flex items-center gap-6">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.back()}
                        className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                             <div className="h-6 w-6 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600 text-sm">
                                 {document?.emoji || "📄"}
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Neural Node</span>
                             <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                                 {document?.status || "PUBLISHED"}
                             </span>
                        </div>
                        <input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Unnamed Intelligence..."
                            className="bg-transparent border-none text-xl font-black tracking-tight focus:ring-0 p-0 placeholder:text-slate-300 dark:placeholder:text-slate-700 w-[400px]"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 mr-4">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{document?.views || 0}</span>
                    </div>

                    <LiveCursors nodeId={id} />

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl relative"
                        onClick={() => setIsCommentsOpen(true)}
                    >
                        <MessageSquare className="h-4 w-4" />
                        <div className="absolute top-1 right-1 h-2 w-2 bg-indigo-600 rounded-full animate-pulse" />
                    </Button>

                    <Button 
                        onClick={() => handleSave(false)} 
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        {isSaving ? "Syncing..." : "Sync Intel"}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 rounded-3xl p-2 border-slate-200 dark:border-slate-800 shadow-2xl">
                             <div className="px-4 py-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                                 <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Neural Settings</span>
                             </div>
                             <DropdownMenuItem 
                                 className="rounded-2xl py-3 px-4 flex items-center gap-3 group cursor-pointer"
                                 onClick={handleTogglePublic}
                             >
                                 <Share2 className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
                                 <span className="text-[10px] font-black uppercase tracking-widest flex-1">Public Access</span>
                                 {document?.visibility === "PUBLIC" ? (
                                     <Globe className="h-3 w-3 text-emerald-500" />
                                 ) : (
                                     <Lock className="h-3 w-3 text-slate-300" />
                                 )}
                             </DropdownMenuItem>
                             <DropdownMenuItem className="rounded-2xl py-3 px-4 flex items-center gap-3 group cursor-pointer">
                                 <History className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Version History</span>
                             </DropdownMenuItem>
                             <DropdownMenuSeparator className="my-2 bg-slate-100 dark:bg-slate-800" />
                             <DropdownMenuItem 
                                 className="rounded-2xl py-3 px-4 flex items-center gap-3 group cursor-pointer"
                                 onClick={() => window.print()}
                             >
                                 <Printer className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Export PDF</span>
                             </DropdownMenuItem>
                             <DropdownMenuItem 
                                 className="rounded-2xl py-3 px-4 flex items-center gap-3 group cursor-pointer"
                                 onClick={handleExportMarkdown}
                             >
                                 <FileCode className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Export Markdown</span>
                             </DropdownMenuItem>
                             <DropdownMenuSeparator className="my-2 bg-slate-100 dark:bg-slate-800" />
                             <DropdownMenuItem className="rounded-2xl py-3 px-4 flex items-center gap-3 group text-rose-500 hover:text-rose-600 cursor-pointer">
                                 <Trash2 className="h-4 w-4" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Archive Node</span>
                             </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto scrollbar-none pb-40">
                <div className="max-w-4xl mx-auto px-8 pt-12 space-y-12">
                    {/* Page Header Metadata */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <UserIcon className="h-4 w-4 text-slate-500" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Maintainer</span>
                                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">{document?.user?.name || "Neural Ghost"}</span>
                                </div>
                            </div>

                            <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />

                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Last Synced</span>
                                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                                        {format(new Date(document?.updatedAt), "MMM dd, yyyy HH:mm")}
                                    </span>
                                </div>
                            </div>
                            
                            <Button variant="ghost" size="sm" className="ml-auto rounded-xl hover:bg-amber-500/10 hover:text-amber-500 group">
                                <Star className={cn("h-4 w-4 mr-2 transition-transform group-hover:scale-125", document?.isPinned && "fill-amber-500 text-amber-500")} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Pin Intel</span>
                            </Button>
                        </div>

                        {/* Backlinks */}
                        {document?.backlinks?.length > 0 && (
                            <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500">Linked References</span>
                                <div className="flex flex-wrap gap-2">
                                    {document.backlinks.map((link: any) => (
                                        <Link key={link.id} href={`/intelligence/${link.id}`}>
                                            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-all shadow-sm flex items-center gap-2 group">
                                                <span className="text-xs">{link.emoji || "📄"}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">{link.title}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <AdvancedEditor 
                        blocks={blocks}
                        onChange={setBlocks}
                        workspaceId={document?.workspaceId}
                    />
                </div>
            </div>

            <CommentSheet 
                nodeId={id} 
                isOpen={isCommentsOpen} 
                onClose={() => setIsCommentsOpen(false)} 
            />
        </div>
    );
}
