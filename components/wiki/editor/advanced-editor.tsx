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
    Columns,
    MessageSquare,
    MoreHorizontal,
    MoreVertical,
    Sparkles,
    ArrowUpRight
} from "lucide-react";
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
import { SlashMenu } from "./slash-menu";
import { PageLinkMenu } from "./page-link-menu";

export type BlockType = "paragraph" | "h1" | "h2" | "h3" | "bullet" | "number" | "todo" | "code" | "quote" | "callout" | "divider";

export interface EditorBlock {
    id: string;
    type: BlockType;
    content: string;
    metadata?: any;
}

interface EditorProps {
    blocks: EditorBlock[];
    workspaceId: string;
    onChange: (blocks: EditorBlock[]) => void;
    onSave?: () => void;
    placeholder?: string;
}

export function AdvancedEditor({ blocks, workspaceId, onChange, onSave, placeholder }: EditorProps) {
    const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
    const [slashMenu, setSlashMenu] = useState<{ id: string, position: { x: number, y: number } } | null>(null);
    const [linkMenu, setLinkMenu] = useState<{ id: string, position: { x: number, y: number } } | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const updateBlock = (id: string, updates: Partial<EditorBlock>) => {
        const newBlocks = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
        onChange(newBlocks);
    };

    const addBlock = (afterId?: string, type: BlockType = "paragraph", content: string = "") => {
        const newBlock: EditorBlock = {
            id: crypto.randomUUID(),
            type,
            content,
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

    const handleKeyDown = (e: React.KeyboardEvent, id: string, block: EditorBlock) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (slashMenu || linkMenu) return; 
            addBlock(id);
        } else if (e.key === "Backspace" && !block.content && blocks.length > 1) {
            e.preventDefault();
            removeBlock(id);
        }
    };

    const handleSlashCommand = (id: string, type: any) => {
        const block = blocks.find(b => b.id === id);
        if (!block) return;
        const newContent = block.content.endsWith("/") ? block.content.slice(0, -1) : block.content;
        updateBlock(id, { type: type as BlockType, content: newContent });
        setSlashMenu(null);
    };

    const handleLinkSelect = (id: string, doc: any) => {
        const block = blocks.find(b => b.id === id);
        if (!block) return;
        const newContent = block.content.endsWith("@") ? block.content.slice(0, -1) : block.content;
        // Internal Link format: [[id|title|emoji]]
        const linkStr = `[[${doc.id}|${doc.title}|${doc.emoji || "📄"}]]`;
        updateBlock(id, { content: newContent + linkStr + " " });
        setLinkMenu(null);
    };

    return (
        <div ref={editorRef} className="space-y-1 w-full max-w-full relative group/editor pb-32">
            <Reorder.Group axis="y" values={blocks} onReorder={onChange} className="space-y-1">
                {blocks.map((block) => (
                    <Reorder.Item 
                        key={block.id} 
                        value={block}
                        className="group/block relative flex items-start gap-1"
                    >
                        {/* Drag Handle & Plus Menu */}
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
                                    <DropdownMenuItem onClick={() => addBlock(block.id, "code")} className="rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest cursor-pointer">
                                        Insert Code Block
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => removeBlock(block.id)} className="rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest text-red-500 cursor-pointer">
                                        Delete Block
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-h-[32px] w-full">
                            <BlockRenderer 
                                block={block} 
                                isFocused={focusedBlockId === block.id}
                                onFocus={() => setFocusedBlockId(block.id)}
                                onChange={(content: string) => {
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
                                onTypeChange={(type: string, metadata: any) => updateBlock(block.id, { type: type as BlockType, metadata })}
                                onKeyDown={(e: any) => handleKeyDown(e, block.id, block)}
                                placeholder={blocks.indexOf(block) === 0 ? placeholder : ""}
                                router={router}
                            />
                        </div>

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
                    </Reorder.Item>
                ))}
            </Reorder.Group>
        </div>
    );
}

function BlockRenderer({ block, isFocused, onFocus, onChange, onTypeChange, onKeyDown, placeholder, router }: any) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        else if (val === "- ") onTypeChange("bullet");
        else if (val === "1. ") onTypeChange("number");
        else if (val === "[] ") onTypeChange("todo");
        else if (val === "> ") onTypeChange("quote");
        else if (val === "``` ") onTypeChange("code");
        else if (val === "--- ") onTypeChange("divider");
        else if (val === "!! ") onTypeChange("callout");
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
        bullet: "list-disc ml-8 text-lg font-medium leading-relaxed opacity-80",
        number: "list-decimal ml-8 text-lg font-medium leading-relaxed opacity-80",
        todo: "text-lg font-bold opacity-90",
        code: "font-mono bg-slate-100 dark:bg-slate-950 text-indigo-600 dark:text-indigo-300 p-8 rounded-3xl text-sm border border-slate-200 dark:border-white/5 my-8 relative overflow-x-auto selection:bg-indigo-500/30",
        quote: "border-l-[6px] border-indigo-500 pl-8 italic text-2xl font-black text-slate-500 dark:text-slate-400 my-10 bg-slate-50 dark:bg-slate-900/40 py-6 rounded-r-3xl",
        callout: "bg-indigo-600/5 dark:bg-indigo-500/10 p-8 rounded-[2.5rem] border-2 border-indigo-500/20 text-lg font-bold my-10 text-indigo-600 dark:text-indigo-400 shadow-2xl shadow-indigo-500/5 flex items-center gap-4",
        divider: "h-[2px] bg-slate-100 dark:bg-slate-800/50 my-16 w-full prose-none shadow-none rounded-full",
    };

    if (block.type === "divider") {
        return <div className={styles.divider} />;
    }

    const renderContent = (text: string) => {
        // Internal Link regex: [[id|title|emoji]]
        const parts = text.split(/(\[\[.*?\]\])/g);
        return parts.map((part, i) => {
            if (part.startsWith("[[") && part.endsWith("]]")) {
                const [id, title, emoji] = part.slice(2, -2).split("|");
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
            return part;
        });
    };

    const contentArea = (
        <div className="relative w-full">
            {isFocused ? (
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
                    onClick={onFocus}
                    className={cn(
                        "w-full min-h-[1.5em] whitespace-pre-wrap transition-all cursor-text",
                        styles[block.type as BlockType] || styles.paragraph,
                        !block.content && "opacity-20"
                    )}
                >
                    {block.content ? renderContent(block.content) : placeholder || "..."}
                </div>
            )}
        </div>
    );

    if (block.type === "todo") {
        const isChecked = block.metadata?.checked || false;
        return (
            <div className="flex items-start gap-4 group/todo">
                <div 
                    onClick={() => onTypeChange("todo", { checked: !isChecked })}
                    className={cn(
                        "mt-1.5 h-5 w-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all",
                        isChecked ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-500/20" : "border-slate-300 dark:border-slate-700 hover:border-indigo-500"
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
