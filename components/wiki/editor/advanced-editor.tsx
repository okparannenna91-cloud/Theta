"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
    Plus, 
    GripVertical, 
    Trash2, 
    Type, 
    Heading1, 
    Heading2, 
    Heading3, 
    List, 
    Code, 
    Quote, 
    CheckSquare,
    Image as ImageIcon,
    MoreHorizontal,
    MoreVertical,
    Sparkles,
    FolderKanban,
    ArrowUpRight,
    ChevronRight,
    ChevronDown,
    ListTree,
    Database,
    Video,
    File,
    Play,
    Loader2,
    Copy
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SlashMenu } from "./slash-menu";
import { PageLinkMenu } from "./page-link-menu";
import mermaid from "mermaid";

mermaid.initialize({
    startOnLoad: true,
    theme: "neutral",
    securityLevel: "loose",
});

export type BlockType = "paragraph" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "bullet" | "number" | "todo" | "code" | "quote" | "callout" | "divider" | "image" | "video" | "file" | "columns" | "table" | "mermaid" | "toggle" | "task-view" | "database";

const highlightCode = (code: string, lang: string) => {
    if (!code) return "";
    let highlighted = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Basic regex-based highlighting
    const patterns = {
        keyword: /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|new|this|await|async|try|catch|finally|switch|case|default|break|continue|type|interface|enum|public|private|protected|static|readonly|void|any|string|number|boolean|null|undefined)\b/g,
        string: /(['"`])(.*?)\1/g,
        comment: /(\/\/.*|\/\*[\s\S]*?\*\/)/g,
        number: /\b(\d+)\b/g,
        bracket: /([{}()[\]])/g,
    };

    highlighted = highlighted
        .replace(patterns.comment, '<span class="text-slate-500 italic">$1</span>')
        .replace(patterns.keyword, '<span class="text-indigo-500 font-black">$1</span>')
        .replace(patterns.string, '<span class="text-emerald-500 font-bold">$1$2$1</span>')
        .replace(patterns.number, '<span class="text-amber-500">$1</span>')
        .replace(patterns.bracket, '<span class="text-slate-400">$1</span>');

    return highlighted;
};

export interface EditorBlock {
    id: string;
    type: BlockType;
    content: string;
    metadata?: any;
    children?: EditorBlock[];
}

interface EditorProps {
    blocks: EditorBlock[];
    workspaceId: string;
    projectId?: string;
    onChange: (blocks: EditorBlock[]) => void;
    onSave?: () => void;
    placeholder?: string;
    readOnly?: boolean;
}

export function AdvancedEditor({ blocks, workspaceId, projectId, onChange, onSave, placeholder, readOnly = false }: EditorProps) {
    const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
    const [slashMenu, setSlashMenu] = useState<{ id: string, position: { x: number, y: number } } | null>(null);
    const [linkMenu, setLinkMenu] = useState<{ id: string, position: { x: number, y: number } } | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const updateBlock = (id: string, updates: Partial<EditorBlock>) => {
        const newBlocks = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
        onChange(newBlocks);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string, block: EditorBlock) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (slashMenu || linkMenu) return; 
            addBlock(id, "paragraph", "");
            // Inherit indentation
            const index = blocks.findIndex(b => b.id === id);
            if (index !== -1) {
                const nextBlockId = blocks[index + 1]?.id; // This might be wrong because onChange is async
                // We'll handle inheritance in addBlock actually
            }
        } else if (e.key === "Backspace" && !block.content && blocks.length > 1) {
            e.preventDefault();
            removeBlock(id);
        } else if (e.key === "Tab") {
            e.preventDefault();
            const indent = block.metadata?.indent || 0;
            if (e.shiftKey) {
                if (indent > 0) updateBlock(id, { metadata: { ...block.metadata, indent: indent - 1 } });
            } else {
                if (indent < 8) updateBlock(id, { metadata: { ...block.metadata, indent: indent + 1 } });
            }
        }
    };

    const addBlock = (afterId?: string, type: BlockType = "paragraph", content: string = "") => {
        const afterBlock = blocks.find(b => b.id === afterId);
        const newBlock: EditorBlock = {
            id: crypto.randomUUID(),
            type,
            content,
            metadata: afterBlock ? { ...afterBlock.metadata } : {}
        };
        
        let newBlocks: EditorBlock[];
        if (afterId) {
            const index = blocks.findIndex(b => b.id === afterId);
            newBlocks = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
        } else {
            newBlocks = [...blocks, newBlock];
        }
        
        onChange(newBlocks);
        setFocusedBlockId(newBlock.id);
    };

    const removeBlock = (id: string) => {
        if (blocks.length <= 1) return;
        const index = blocks.findIndex(b => b.id === id);
        const newBlocks = blocks.filter(b => b.id !== id);
        onChange(newBlocks);
        
        // Focus previous block
        if (index > 0) {
            setFocusedBlockId(blocks[index - 1].id);
        } else if (newBlocks.length > 0) {
            setFocusedBlockId(newBlocks[0].id);
        }
    };

    const handleSlashCommand = (id: string, type: any) => {
        const block = blocks.find(b => b.id === id);
        if (!block) return;
        const newContent = block.content.endsWith("/") ? block.content.slice(0, -1) : block.content;
        updateBlock(id, { type: type as BlockType, content: newContent });
        setSlashMenu(null);
    };

    const handleLinkSelect = (id: string, item: any) => {
        const block = blocks.find(b => b.id === id);
        if (!block) return;
        const newContent = block.content.endsWith("@") ? block.content.slice(0, -1) : block.content;
        
        let linkStr = "";
        if (item.mentionType === "project") {
            linkStr = `[[project:${item.id}|${item.name}]]`;
        } else if (item.mentionType === "task") {
            linkStr = `[[task:${item.id}|${item.title}]]`;
        } else {
            linkStr = `[[${item.id}|${item.title}|${item.emoji || "📄"}]]`;
        }

        updateBlock(id, { content: newContent + linkStr + " " });
        setLinkMenu(null);
    };

    const handleConvertToTask = async (block: EditorBlock) => {
        if (!projectId || !workspaceId) return;
        
        const loadingToast = toast.loading("Creating task...");
        
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: block.content || "New task from doc",
                    description: `Converted from document block: ${block.content}`,
                    workspaceId,
                    projectId,
                    status: "todo",
                    priority: "medium"
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to create task");
            }

            const task = await res.json();
            toast.success("Task created successfully", { id: loadingToast });
            
            // Convert block to a todo and link it to the task
            updateBlock(block.id, { 
                type: "todo", 
                content: block.content,
                metadata: { ...block.metadata, taskId: task.id, checked: false } 
            });
        } catch (error: any) {
            toast.error(error.message, { id: loadingToast });
        }
    };

    return (
        <div ref={editorRef} className="space-y-1 w-full max-w-full relative group/editor pb-32">
            <Reorder.Group axis="y" values={blocks} onReorder={onChange} className="space-y-1">
                {(() => {
                    let hiddenBelowIndent: number | null = null;
                    
                    return blocks.map((block) => {
                        const indent = block.metadata?.indent || 0;
                        const isCollapsed = block.metadata?.collapsed ?? false;
                        
                        // Visibility logic for toggles
                        if (hiddenBelowIndent !== null) {
                            if (indent > hiddenBelowIndent) {
                                return null; // Hide this block
                            } else {
                                hiddenBelowIndent = null; // We've reached a sibling or parent
                            }
                        }
                        
                        if (block.type === "toggle" && isCollapsed) {
                            hiddenBelowIndent = indent;
                        }

                        return (
                            <Reorder.Item 
                                key={block.id} 
                                value={block}
                                id={`block-${block.id}`}
                                className="group/block relative flex items-start gap-1"
                                style={{ 
                                    paddingLeft: `${indent * 32}px`,
                                    transition: "padding-left 0.2s ease-in-out"
                                }}
                            >
                                {/* Drag Handle & Plus Menu */}
                                {!readOnly && (
                                    <div className="absolute -left-12 top-2 flex items-center opacity-0 group-hover/block:opacity-100 transition-opacity z-50">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md cursor-grab active:cursor-grabbing">
                                            <GripVertical className="h-4 w-4" />
                                        </Button>
                                        
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="rounded-2xl shadow-xl p-2 border border-slate-200 dark:border-white/10 dark:bg-slate-900/90 backdrop-blur-xl">
                                                <DropdownMenuItem onClick={() => addBlock(block.id, "paragraph")} className="rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest cursor-pointer">
                                                    Insert Paragraph
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addBlock(block.id, "image")} className="rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest cursor-pointer">
                                                    Insert Image
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addBlock(block.id, "code")} className="rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest cursor-pointer">
                                                    Insert Code Block
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => {
                                                        if (!projectId) {
                                                            toast.error("Attach document to a project to create tasks");
                                                            return;
                                                        }
                                                        handleConvertToTask(block);
                                                    }} 
                                                    className="rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest cursor-pointer"
                                                >
                                                    <CheckSquare className="h-4 w-4 mr-2" />
                                                    Convert to Task
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => removeBlock(block.id)} className="rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest text-red-500 cursor-pointer">
                                                    Delete Block
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}

                                {/* Content Area */}
                                <div className="flex-1 min-h-[32px] w-full">
                                    <BlockRenderer 
                                        block={block} 
                                        isFocused={focusedBlockId === block.id && !readOnly}
                                        onFocus={() => !readOnly && setFocusedBlockId(block.id)}
                                        onChange={(content: string) => {
                                            if (readOnly) return;
                                            updateBlock(block.id, { content });
                                            
                                            if (content.endsWith("/")) {
                                                const selection = window.getSelection();
                                                if (selection && selection.rangeCount > 0) {
                                                    const range = selection.getRangeAt(0);
                                                    const rect = range.getBoundingClientRect();
                                                    setSlashMenu({ id: block.id, position: { x: rect.left, y: rect.top } });
                                                }
                                            } else if (content.endsWith("@")) {
                                                const selection = window.getSelection();
                                                if (selection && selection.rangeCount > 0) {
                                                    const range = selection.getRangeAt(0);
                                                    const rect = range.getBoundingClientRect();
                                                    setLinkMenu({ id: block.id, position: { x: rect.left, y: rect.top } });
                                                }
                                            } else {
                                                setSlashMenu(null);
                                                setLinkMenu(null);
                                            }
                                        }}
                                        onTypeChange={(type: string, metadata: any) => !readOnly && updateBlock(block.id, { type: type as BlockType, metadata })}
                                        onKeyDown={(e: any) => !readOnly && handleKeyDown(e, block.id, block)}
                                        placeholder={blocks.indexOf(block) === 0 && !readOnly ? placeholder : ""}
                                        router={router}
                                        readOnly={readOnly}
                                        updateBlock={updateBlock}
                                        projectId={projectId}
                                    />

                                    {/* Menus */}
                                    {slashMenu?.id === block.id && (
                                        <SlashMenu 
                                            position={slashMenu.position}
                                            onSelect={(type) => handleSlashCommand(block.id, type)}
                                            onClose={() => setSlashMenu(null)}
                                        />
                                    )}

                                    {linkMenu?.id === block.id && (
                                        <PageLinkMenu 
                                            workspaceId={workspaceId}
                                            position={linkMenu.position}
                                            onSelect={(doc) => handleLinkSelect(block.id, doc)}
                                            onClose={() => setLinkMenu(null)}
                                        />
                                    )}
                                </div>
                            </Reorder.Item>
                        );
                    });
                })()}
            </Reorder.Group>
        </div>
    );
}

function BlockRenderer({ block, isFocused, onFocus, onChange, onTypeChange, onKeyDown, placeholder, router, readOnly, updateBlock, projectId }: any) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: tasks, isLoading: tasksLoading } = useQuery({
        queryKey: ["project-tasks", projectId],
        queryFn: async () => {
            if (!projectId) return [];
            const res = await fetch(`/api/tasks?projectId=${projectId}`);
            if (!res.ok) throw new Error("Failed to fetch tasks");
            return res.json();
        },
        enabled: !!projectId && block.type === "task-view"
    });

    const { data: members, isLoading: membersLoading } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: async () => {
            if (!projectId) return [];
            const res = await fetch(`/api/projects/${projectId}/members`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!projectId && block.type === "database"
    });

    useEffect(() => {
        if (isFocused && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isFocused]);

    const handleChange = (e: any) => {
        const val = e.target.value;
        onChange(val);

        // Markdown-like auto-transformations
        if (val === "# ") onTypeChange("h1");
        else if (val === "## ") onTypeChange("h2");
        else if (val === "### ") onTypeChange("h3");
        else if (val === "#### ") onTypeChange("h4");
        else if (val === "##### ") onTypeChange("h5");
        else if (val === "###### ") onTypeChange("h6");
        else if (val === "- ") onTypeChange("bullet");
        else if (val === "1. ") onTypeChange("number");
        else if (val === "[] ") onTypeChange("todo");
        else if (val === "> ") onTypeChange("quote");
        else if (val === "``` ") onTypeChange("code");
        else if (val === "--- ") onTypeChange("divider");
        else if (val === "!! ") onTypeChange("callout");
        else if (val === ">> ") onTypeChange("toggle");
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    }, [block.content, block.type, isFocused]);

    const styles: Record<BlockType, string> = {
        paragraph: "text-lg font-medium leading-relaxed opacity-80",
        h1: "text-5xl font-black tracking-tight mt-12 mb-6 text-slate-900 dark:text-slate-100",
        h2: "text-4xl font-black tracking-tight mt-10 mb-4 text-slate-800 dark:text-slate-200",
        h3: "text-2xl font-black mt-8 mb-3 text-slate-700 dark:text-slate-300",
        h4: "text-xl font-bold mt-6 mb-2 text-slate-700 dark:text-slate-300",
        h5: "text-lg font-bold mt-4 mb-2 text-slate-700 dark:text-slate-300 uppercase tracking-wide",
        h6: "text-base font-bold mt-4 mb-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest",
        bullet: "list-disc ml-8 text-lg font-medium leading-relaxed opacity-80",
        number: "list-decimal ml-8 text-lg font-medium leading-relaxed opacity-80",
        todo: "text-lg font-bold opacity-90",
        code: "font-mono bg-slate-100 dark:bg-slate-950 text-indigo-600 dark:text-indigo-300 p-8 rounded-3xl text-sm border border-slate-200 dark:border-white/5 my-8 relative overflow-x-auto selection:bg-indigo-500/30",
        quote: "border-l-[6px] border-indigo-500 pl-8 italic text-2xl font-black text-slate-500 dark:text-slate-400 my-10 bg-slate-50 dark:bg-slate-900/40 py-6 rounded-r-3xl",
        callout: "bg-indigo-600/5 dark:bg-indigo-500/10 p-8 rounded-[2.5rem] border-2 border-indigo-500/20 text-lg font-bold my-10 text-indigo-600 dark:text-indigo-400 shadow-2xl shadow-indigo-500/5 flex items-center gap-4",
        divider: "h-[2px] bg-slate-100 dark:bg-slate-800/50 my-16 w-full prose-none shadow-none rounded-full",
        image: "my-10",
        video: "my-10",
        file: "my-6",
        columns: "grid grid-cols-2 gap-8 my-10",
        table: "my-10 overflow-hidden rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-950/20 backdrop-blur-3xl",
        mermaid: "my-10",
        toggle: "my-2 group/toggle",
        "task-view": "my-10 p-10 rounded-[3rem] bg-indigo-600/5 dark:bg-indigo-500/10 border-2 border-indigo-500/20 shadow-2xl",
        database: "my-10 overflow-hidden rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-950/20 backdrop-blur-3xl"
    };


    const renderContent = (content: string) => {
        if (!content) return null;
        const parts = content.split(/(\[\[.*?\]\])/g);
        return parts.map((part, i) => {
            if (part.startsWith("[[") && part.endsWith("]]")) {
                const inner = part.slice(2, -2);
                if (inner.startsWith("project:")) {
                    const [idPart, title] = inner.split("|");
                    const id = idPart.replace("project:", "");
                    return (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/projects/${id}`);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-600/10 text-emerald-600 border border-emerald-600/20 hover:bg-emerald-600 hover:text-white transition-all font-black uppercase text-[10px] tracking-tight mx-0.5 align-middle"
                        >
                            <FolderKanban className="h-2.5 w-2.5" />
                            {title}
                            <ArrowUpRight className="h-2.5 w-2.5" />
                        </button>
                    );
                } else if (inner.startsWith("task:")) {
                    const [idPart, title] = inner.split("|");
                    const id = idPart.replace("task:", "");
                    return (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/tasks/${id}`);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-600/10 text-amber-600 border border-amber-600/20 hover:bg-amber-600 hover:text-white transition-all font-black uppercase text-[10px] tracking-tight mx-0.5 align-middle"
                        >
                            <CheckSquare className="h-2.5 w-2.5" />
                            {title}
                            <ArrowUpRight className="h-2.5 w-2.5" />
                        </button>
                    );
                } else {
                    const [id, title, emoji] = inner.split("|");
                    return (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/wiki/${id}`);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-600/10 text-indigo-600 border border-indigo-600/20 hover:bg-indigo-600 hover:text-white transition-all font-black uppercase text-[10px] tracking-tight mx-0.5 align-middle"
                        >
                            <span className="text-xs">{emoji}</span>
                            {title}
                            <ArrowUpRight className="h-2.5 w-2.5" />
                        </button>
                    );
                }
            }
            return part;
        });
    };

    const contentArea = (
        <div className="relative w-full">
            {(isFocused && !readOnly) ? (
                <textarea
                    ref={textareaRef}
                    value={block.content}
                    onChange={handleChange}
                    onFocus={onFocus}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder || (isFocused ? "Draft internal intelligence..." : "")}
                    rows={1}
                    className={cn(
                        "w-full bg-transparent outline-none resize-none overflow-hidden transition-all duration-300 placeholder:text-slate-200 dark:placeholder:text-slate-800",
                        styles[block.type as BlockType] || styles.paragraph,
                        "text-slate-900 dark:text-slate-50"
                    )}
                />
            ) : (
                <div 
                    onClick={!readOnly ? onFocus : undefined}
                    className={cn(
                        "w-full min-h-[1.5em] whitespace-pre-wrap transition-all",
                        !readOnly ? "cursor-text" : "cursor-default",
                        styles[block.type as BlockType] || styles.paragraph,
                        (!block.content && !readOnly) && "opacity-20"
                    )}
                >
                    {(block.content || readOnly) ? renderContent(block.content) : placeholder || "..."}
                </div>
            )}
        </div>
    );

    if (block.type === "divider") {
        return <div className={styles.divider} />;
    }

    if (block.type === "image") {
        return (
            <div className={cn("relative group/image", styles.image)}>
                {block.content ? (
                    <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <img src={block.content} alt="Block content" className="w-full h-auto" />
                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/image:opacity-100">
                            <Button onClick={() => onChange("")} variant="destructive" className="rounded-xl font-black uppercase text-[10px] tracking-widest">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Image
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="h-64 rounded-[2.5rem] border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900/50 transition-all hover:border-indigo-500/50">
                        <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-indigo-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Secure Visual Payload</p>
                            {!readOnly && (
                                <Input 
                                    placeholder="Enter image URL..." 
                                    className="mt-4 h-10 rounded-xl bg-white dark:bg-slate-900 border-none shadow-sm text-xs font-bold w-64"
                                    onKeyDown={(e: any) => {
                                        if (e.key === "Enter") onChange(e.target.value);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    if (block.type === "video") {
        return (
            <div className={cn("relative group/video", styles.video)}>
                {block.content ? (
                    <div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl bg-black">
                        <iframe 
                            src={block.content.includes("youtube.com") ? block.content.replace("watch?v=", "embed/") : block.content} 
                            className="absolute inset-0 w-full h-full border-none"
                            allowFullScreen
                        />
                        {!readOnly && (
                             <div className="absolute inset-0 bg-black/0 group-hover/video:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/video:opacity-100">
                                <Button onClick={() => onChange("")} variant="destructive" className="rounded-xl font-black uppercase text-[10px] tracking-widest">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove Video
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-64 rounded-[2.5rem] border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900/50 transition-all hover:border-indigo-500/50">
                        <div className="h-16 w-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                            <Play className="h-8 w-8 text-rose-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Video Integration Module</p>
                            {!readOnly && (
                                <Input 
                                    placeholder="Enter video URL (YouTube/Vimeo)..." 
                                    className="mt-4 h-10 rounded-xl bg-white dark:bg-slate-900 border-none shadow-sm text-xs font-bold w-64"
                                    onKeyDown={(e: any) => {
                                        if (e.key === "Enter") onChange(e.target.value);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    if (block.type === "file") {
        return (
            <div className={cn("group/file", styles.file)}>
                <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-between hover:border-indigo-500/50 hover:shadow-2xl transition-all">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <File className="h-6 w-6 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attached Resource</p>
                            <p className="text-xs font-bold truncate max-w-[200px]">{block.content || "unnamed_resource.bin"}</p>
                        </div>
                    </div>
                    <Button variant="outline" className="rounded-xl border-none bg-slate-100 dark:bg-slate-800 font-black uppercase text-[9px] tracking-widest px-6 h-9">
                        Download
                    </Button>
                </div>
            </div>
        );
    }

    if (block.type === "code") {
        const language = block.metadata?.language || "javascript";
        return (
            <div className={cn("relative group/code", styles.code)}>
                {!readOnly && (
                    <div className="absolute right-4 top-4 flex items-center gap-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-50">
                        <select 
                            value={language}
                            onChange={(e) => onTypeChange("code", { ...block.metadata, language: e.target.value })}
                            className="bg-white/50 dark:bg-slate-900/50 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-none outline-none backdrop-blur-sm"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="json">JSON</option>
                        </select>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => {
                                navigator.clipboard.writeText(block.content);
                                toast.success("Copied to clipboard");
                            }}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                {isFocused && !readOnly ? (
                    <textarea
                        ref={textareaRef}
                        value={block.content}
                        onChange={handleChange}
                        onFocus={onFocus}
                        onKeyDown={onKeyDown}
                        placeholder="Write source code..."
                        rows={1}
                        className="w-full bg-transparent outline-none resize-none overflow-hidden font-mono text-sm leading-relaxed"
                    />
                ) : (
                    <pre className="w-full min-h-[1.5em] whitespace-pre-wrap font-mono text-sm leading-relaxed" onClick={!readOnly ? onFocus : undefined}>
                        {block.content ? (
                            <code dangerouslySetInnerHTML={{ 
                                __html: highlightCode(block.content, language) 
                            }} />
                        ) : (
                            <span className="opacity-30 italic">No code logic detected...</span>
                        )}
                    </pre>
                )}
            </div>
        );
    }
    if (block.type === "mermaid") {
        return (
            <div className="my-10 space-y-6">
                {!readOnly ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-6 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Flow Definition</span>
                            <div className="flex items-center gap-4">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-[10px] font-black uppercase tracking-widest"
                                    onClick={() => updateBlock(block.id, { content: "graph TD\n  A[Start] --> B(Process)\n  B --> C{Decision}\n  C -->|Yes| D[End]\n  C -->|No| B" })}
                                >
                                    Load Template
                                </Button>
                            </div>
                        </div>
                        <textarea
                            value={block.content}
                            onChange={(e) => onChange(e.target.value)}
                            onFocus={onFocus}
                            className="w-full h-48 p-8 bg-slate-50 dark:bg-slate-950/50 rounded-3xl border-2 border-slate-100 dark:border-white/5 font-mono text-xs focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
                            placeholder="graph TD..."
                        />
                    </div>
                ) : null}
                <div className="p-10 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-2xl flex items-center justify-center overflow-hidden">
                    <MermaidRenderer content={block.content || "graph TD\n  Empty[Empty Diagram]"} />
                </div>
            </div>
        );
    }

    if (block.type === "columns") {
        const leftContent = block.metadata?.leftContent || "";
        const rightContent = block.metadata?.rightContent || "";
        
        const updateLeft = (val: string) => {
            updateBlock(block.id, { metadata: { ...block.metadata, leftContent: val } });
        };
        const updateRight = (val: string) => {
            updateBlock(block.id, { metadata: { ...block.metadata, rightContent: val } });
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-10">
                <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-xl transition-all hover:shadow-2xl hover:border-indigo-500/30">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6 opacity-50 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                        L-Node 01
                    </p>
                    <textarea
                        value={leftContent}
                        disabled={readOnly}
                        onChange={(e) => updateLeft(e.target.value)}
                        placeholder="Primary stream..."
                        className="w-full bg-transparent outline-none resize-none overflow-hidden text-sm font-medium leading-relaxed min-h-[100px]"
                        onInput={(e: any) => {
                            e.target.style.height = "auto";
                            e.target.style.height = e.target.scrollHeight + "px";
                        }}
                    />
                </div>
                <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-xl transition-all hover:shadow-2xl hover:border-emerald-500/30">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-6 opacity-50 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        R-Node 02
                    </p>
                    <textarea
                        value={rightContent}
                        disabled={readOnly}
                        onChange={(e) => updateRight(e.target.value)}
                        placeholder="Secondary stream..."
                        className="w-full bg-transparent outline-none resize-none overflow-hidden text-sm font-medium leading-relaxed min-h-[100px]"
                        onInput={(e: any) => {
                            e.target.style.height = "auto";
                            e.target.style.height = e.target.scrollHeight + "px";
                        }}
                    />
                </div>
            </div>
        );
    }



    if (block.type === "task-view") {

        return (
            <div className="my-10 p-10 rounded-[3rem] bg-indigo-600/5 dark:bg-indigo-500/10 border-2 border-indigo-500/20 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <ListTree className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-tighter">Embedded Project Pulse</h4>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest opacity-60">Live Task Stream</p>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-3">
                    {tasksLoading ? (
                        <div className="h-20 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                        </div>
                    ) : tasks?.length === 0 ? (
                        <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest opacity-30">No tasks in this node</div>
                    ) : (
                        tasks?.slice(0, 5).map((task: any) => (
                            <div key={task.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center justify-between group/task cursor-pointer hover:border-indigo-500/50 transition-all">
                                 <div className="flex items-center gap-4">
                                      <div className={cn("h-2 w-2 rounded-full", task.status === "todo" ? "bg-slate-400" : "bg-indigo-500")} />
                                      <span className="text-xs font-bold uppercase tracking-tight">{task.title}</span>
                                 </div>
                                 <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 opacity-50">{task.status}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    if (block.type === "database") {

        return (
            <div className="my-10 overflow-hidden rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-950/20 backdrop-blur-3xl">
                <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
                            <Database className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Team Intelligence Registry</span>
                    </div>
                </div>
                <div className="p-0 overflow-x-auto">
                     <table className="w-full text-left">
                          <thead>
                               <tr className="border-b border-slate-100 dark:border-white/5">
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identity</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Role</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                               </tr>
                          </thead>
                          <tbody>
                               {membersLoading ? (
                                    <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600" /></td></tr>
                               ) : members?.length === 0 ? (
                                    <tr><td colSpan={3} className="p-20 text-center text-[10px] font-black uppercase tracking-widest opacity-30">No members detected</td></tr>
                               ) : (
                                    members?.map((member: any) => (
                                        <tr key={member.id} className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                             <td className="p-6 flex items-center gap-3">
                                                  <Avatar className="h-8 w-8 rounded-lg">
                                                       <AvatarImage src={member.user.image} />
                                                       <AvatarFallback>{member.user.name?.[0]}</AvatarFallback>
                                                  </Avatar>
                                                  <span className="text-xs font-bold">{member.user.name}</span>
                                             </td>
                                             <td className="p-6"><span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase">{member.role}</span></td>
                                             <td className="p-6 text-xs font-black uppercase tracking-widest opacity-50">Authorized</td>
                                        </tr>
                                    ))
                               )}
                          </tbody>
                     </table>
                </div>
            </div>
        );
    }

    if (block.type === "table") {
        const data = block.metadata?.data || [["", ""], ["", ""]];
        const updateCell = (r: number, c: number, val: string) => {
            const newData = [...data];
            newData[r] = [...newData[r]];
            newData[r][c] = val;
            updateBlock(block.id, { metadata: { ...block.metadata, data: newData } });
        };
        const addRow = () => {
            const newData = [...data, new Array(data[0].length).fill("")];
            updateBlock(block.id, { metadata: { ...block.metadata, data: newData } });
        };
        const addCol = () => {
            const newData = data.map((row: string[]) => [...row, ""]);
            updateBlock(block.id, { metadata: { ...block.metadata, data: newData } });
        };

        return (
            <div className="my-10 overflow-x-auto selection:bg-indigo-500/10">
                <table className="w-full border-collapse rounded-[2rem] overflow-hidden border-2 border-slate-100 dark:border-white/5 bg-white/50 dark:bg-slate-950/20 backdrop-blur-3xl shadow-2xl">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b-2 border-slate-100 dark:border-white/5">
                            {data[0].map((_: any, i: number) => (
                                <th key={i} className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Column {i + 1}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row: string[], ri: number) => (
                            <tr key={ri} className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                {row.map((cell: string, ci: number) => (
                                    <td key={ci} className="p-0 border-r border-slate-100 dark:border-white/5 last:border-0">
                                        <textarea
                                            value={cell}
                                            disabled={readOnly}
                                            onChange={(e) => updateCell(ri, ci, e.target.value)}
                                            className="w-full h-full p-6 bg-transparent border-none focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium leading-relaxed resize-none overflow-hidden min-h-[80px]"
                                            onInput={(e: any) => {
                                                e.target.style.height = "auto";
                                                e.target.style.height = e.target.scrollHeight + "px";
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!readOnly && (
                    <div className="flex items-center gap-3 mt-6">
                        <Button onClick={addRow} variant="outline" className="rounded-xl border-2 font-black uppercase text-[9px] tracking-widest h-9 px-6 bg-white dark:bg-slate-900 shadow-sm transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600">
                            <Plus className="h-3 w-3 mr-2" />
                            Add Row
                        </Button>
                        <Button onClick={addCol} variant="outline" className="rounded-xl border-2 font-black uppercase text-[9px] tracking-widest h-9 px-6 bg-white dark:bg-slate-900 shadow-sm transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600">
                            <Plus className="h-3 w-3 mr-2" />
                            Add Column
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    if (block.type === "todo") {
        const isChecked = block.metadata?.checked || false;
        return (
            <div className="flex items-start gap-4 group/todo">
                <div 
                    onClick={() => !readOnly && onTypeChange("todo", { checked: !isChecked })}
                    className={cn(
                        "mt-1.5 h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all",
                        !readOnly ? "cursor-pointer hover:border-indigo-500" : "cursor-default",
                        isChecked ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-500/20" : "border-slate-300 dark:border-slate-700"
                    )}
                >
                    {isChecked && <div className="h-2 w-2 bg-white rounded-full animate-in zoom-in" />}
                </div>
                <div className={cn("flex-1", isChecked && "line-through opacity-40 grayscale")}>
                    {contentArea}
                </div>
            </div>
        );
    }

    if (block.type === "toggle") {
        const isCollapsed = block.metadata?.collapsed || false;
        return (
            <div className="flex flex-col">
                <div className="flex items-center gap-2 group/toggle">
                    <button 
                        onClick={() => updateBlock(block.id, { metadata: { ...block.metadata, collapsed: !isCollapsed } })}
                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:bg-indigo-600 hover:text-white transition-all shadow-sm group-hover/toggle:scale-110"
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 font-black uppercase text-xs tracking-widest text-slate-900 dark:text-slate-100">
                        {contentArea}
                    </div>
                </div>
            </div>
        );
    }

    if (block.type === "callout") {
        return (
            <div className={styles.callout}>
                <div className="h-10 w-10 shrink-0 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    {contentArea}
                </div>
            </div>
        );
    }

    return contentArea;
}

function MermaidRenderer({ content }: { content: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && content) {
            containerRef.current.innerHTML = "";
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            try {
                mermaid.render(id, content).then(({ svg }) => {
                    if (containerRef.current) containerRef.current.innerHTML = svg;
                });
            } catch (error) {
                console.error("Mermaid render error:", error);
            }
        }
    }, [content]);

    return <div ref={containerRef} className="w-full h-full flex justify-center" />;
}
