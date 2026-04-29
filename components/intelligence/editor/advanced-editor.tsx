"use client";

import { useState, useCallback, useRef } from "react";
import { 
    Plus, 
    GripVertical, 
    Trash2, 
    Type, 
    Heading1, 
    Heading2, 
    Heading3, 
    List, 
    ListOrdered, 
    CheckSquare, 
    Quote, 
    Code, 
    Image as ImageIcon, 
    Video, 
    File as FileIcon, 
    Table as TableIcon,
    Minus,
    ChevronRight,
    ChevronDown,
    AlertCircle,
    Info,
    CheckCircle2,
    Database,
    Share2,
    Columns,
    Bot,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface Block {
    id: string;
    type: string;
    content: string;
    metadata?: any;
    isExpanded?: boolean;
}

interface AdvancedEditorProps {
    blocks: Block[];
    onChange: (blocks: Block[]) => void;
    workspaceId?: string;
}

export function AdvancedEditor({ blocks, onChange, workspaceId }: AdvancedEditorProps) {
    const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

    const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
        onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
    }, [blocks, onChange]);

    const addBlock = useCallback((type: string = "text", afterId?: string) => {
        const newBlock: Block = {
            id: crypto.randomUUID(),
            type,
            content: "",
            metadata: {}
        };
        
        if (afterId) {
            const index = blocks.findIndex(b => b.id === afterId);
            const newBlocks = [...blocks];
            newBlocks.splice(index + 1, 0, newBlock);
            onChange(newBlocks);
        } else {
            onChange([...blocks, newBlock]);
        }
        setFocusedBlockId(newBlock.id);
    }, [blocks, onChange]);

    const removeBlock = useCallback((id: string) => {
        if (blocks.length <= 1) {
            updateBlock(id, { type: "text", content: "", metadata: {} });
            return;
        }
        onChange(blocks.filter(b => b.id !== id));
    }, [blocks, onChange, updateBlock]);

    const handleKeyDown = (e: React.KeyboardEvent, id: string, content: string) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            addBlock("text", id);
        }
        if (e.key === "Backspace" && content === "") {
            e.preventDefault();
            removeBlock(id);
        }
    };

    if (blocks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                    <Plus className="h-6 w-6" />
                </div>
                <div className="text-center">
                    <h3 className="text-sm font-black uppercase tracking-tight">Empty Neural Node</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Start typing or add a block to begin synchronization.</p>
                </div>
                <Button onClick={() => addBlock()} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px] h-10 px-6">
                    Initialize Cortex
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <Reorder.Group axis="y" values={blocks} onReorder={onChange} className="space-y-1">
                {blocks.map((block) => (
                    <Reorder.Item 
                        key={block.id} 
                        value={block}
                        className="group relative"
                    >
                        <div className={cn(
                            "flex items-start gap-2 p-1 rounded-xl transition-all",
                            focusedBlockId === block.id ? "bg-indigo-500/5" : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                        )}>
                            {/* Block Controls */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 w-12 shrink-0">
                                <div className="cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800">
                                    <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                                </div>
                                <BlockMenu onSelect={(type) => updateBlock(block.id, { type })} />
                            </div>

                            {/* Block Content */}
                            <div className="flex-1 min-w-0">
                                <BlockRenderer 
                                    block={block} 
                                    onUpdate={(updates) => updateBlock(block.id, updates)}
                                    onKeyDown={(e) => handleKeyDown(e, block.id, block.content)}
                                    onFocus={() => setFocusedBlockId(block.id)}
                                    workspaceId={workspaceId}
                                />
                            </div>

                            {/* Delete Button */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1.5">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-500/10"
                                    onClick={() => removeBlock(block.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            <div className="pt-4 flex justify-center">
                <Button 
                    variant="ghost" 
                    className="rounded-2xl h-10 px-6 border border-dashed border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-indigo-500/30 transition-all text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-indigo-600"
                    onClick={() => addBlock()}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Block
                </Button>
            </div>
        </div>
    );
}

function BlockMenu({ onSelect }: { onSelect: (type: string) => void }) {
    const blocks = [
        { type: "text", label: "Text", icon: Type },
        { type: "h1", label: "Heading 1", icon: Heading1 },
        { type: "h2", label: "Heading 2", icon: Heading2 },
        { type: "h3", label: "Heading 3", icon: Heading3 },
        { type: "bullet", label: "Bullet List", icon: List },
        { type: "numbered", label: "Numbered List", icon: ListOrdered },
        { type: "todo", label: "Checklist", icon: CheckSquare },
        { type: "quote", label: "Quote", icon: Quote },
        { type: "callout", label: "Callout", icon: AlertCircle },
        { type: "code", label: "Code Block", icon: Code },
        { type: "divider", label: "Divider", icon: Minus },
        { type: "image", label: "Image", icon: ImageIcon },
        { type: "video", label: "Video", icon: Video },
        { type: "table", label: "Table", icon: TableIcon },
        { type: "tasks", label: "Task View", icon: Database },
        { type: "toggle", label: "Toggle", icon: ChevronRight },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer">
                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-3xl p-2 border-slate-200 dark:border-slate-800 shadow-2xl">
                <div className="px-4 py-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Block Types</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                    {blocks.map((b) => (
                        <DropdownMenuItem 
                            key={b.type}
                            onClick={() => onSelect(b.type)}
                            className="rounded-2xl py-2 px-3 flex flex-col items-center gap-2 text-center hover:bg-indigo-500/10 hover:text-indigo-600 transition-all"
                        >
                            <b.icon className="h-4 w-4 opacity-70" />
                            <span className="text-[8px] font-black uppercase tracking-tight leading-none">{b.label}</span>
                        </DropdownMenuItem>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function BlockRenderer({ block, onUpdate, onKeyDown, onFocus, workspaceId }: { 
    block: Block; 
    onUpdate: (updates: Partial<Block>) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: () => void;
    workspaceId?: string;
}) {
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [showMentionMenu, setShowMentionMenu] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState<string | null>(null);

    const generateAIContent = async (id: string, prompt: string) => {
        setIsGeneratingAI(id);
        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, workspaceId })
            });
            const data = await res.json();
            if (data.text) {
                onUpdate({ content: data.text });
            } else {
                onUpdate({ content: "AI generation failed." });
            }
        } catch (e) {
            onUpdate({ content: "AI generation error." });
        } finally {
            setIsGeneratingAI(null);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const val = e.target.value;
        const lastChar = val[val.length - 1];

        // Slash command detection
        if (lastChar === "/") {
            const rect = e.target.getBoundingClientRect();
            setCursorPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
            setShowSlashMenu(true);
            setShowMentionMenu(false);
        } else {
            setShowSlashMenu(false);
        }

        // Mention detection
        const lastWord = val.split(" ").pop();
        if (lastWord?.startsWith("@")) {
            const rect = e.target.getBoundingClientRect();
            setCursorPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
            setShowMentionMenu(true);
            setMentionQuery(lastWord.slice(1));
            setShowSlashMenu(false);
        } else {
            setShowMentionMenu(false);
        }

        // Markdown shortcut detection
        if (val.endsWith("# ")) {
            onUpdate({ type: "h1", content: val.slice(0, -2) });
            return;
        }
        if (val.endsWith("## ")) {
            onUpdate({ type: "h2", content: val.slice(0, -3) });
            return;
        }
        if (val.endsWith("### ")) {
            onUpdate({ type: "h3", content: val.slice(0, -4) });
            return;
        }
        if (val.endsWith("- ") || val.endsWith("* ")) {
            onUpdate({ type: "bullet", content: val.slice(0, -2) });
            return;
        }
        if (val.endsWith("> ")) {
            onUpdate({ type: "quote", content: val.slice(0, -2) });
            return;
        }
        if (val.endsWith("[] ")) {
            onUpdate({ type: "todo", content: val.slice(0, -3), metadata: { checked: false } });
            return;
        }

        onUpdate({ content: val });
    };

    const renderEditor = () => {
        switch (block.type) {
            case "h1":
                return (
                    <input 
                        value={block.content}
                        onChange={handleInput}
                        onKeyDown={onKeyDown}
                        onFocus={onFocus}
                        placeholder="Heading 1"
                        className="w-full bg-transparent border-none text-4xl font-black tracking-tighter uppercase focus:ring-0 p-0 placeholder:text-slate-200 dark:placeholder:text-slate-800"
                    />
                );
            case "h2":
                return (
                    <input 
                        value={block.content}
                        onChange={handleInput}
                        onKeyDown={onKeyDown}
                        onFocus={onFocus}
                        placeholder="Heading 2"
                        className="w-full bg-transparent border-none text-2xl font-black tracking-tight uppercase focus:ring-0 p-0 placeholder:text-slate-200 dark:placeholder:text-slate-800"
                    />
                );
            case "h3":
                return (
                    <input 
                        value={block.content}
                        onChange={handleInput}
                        onKeyDown={onKeyDown}
                        onFocus={onFocus}
                        placeholder="Heading 3"
                        className="w-full bg-transparent border-none text-lg font-black tracking-tight uppercase focus:ring-0 p-0 placeholder:text-slate-200 dark:placeholder:text-slate-800"
                    />
                );
            case "bullet":
                return (
                    <div className="flex items-start gap-3">
                        <div className="h-6 w-6 flex items-center justify-center shrink-0">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        </div>
                        <textarea 
                            ref={textareaRef}
                            value={block.content}
                            onChange={handleInput}
                            onKeyDown={onKeyDown}
                            onFocus={onFocus}
                            placeholder="Neural point..."
                            className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 p-0 placeholder:text-slate-200 dark:placeholder:text-slate-800 resize-none min-h-[24px]"
                            rows={1}
                        />
                    </div>
                );
            case "quote":
                return (
                    <div className="pl-6 border-l-4 border-indigo-500/50 py-2">
                        <textarea 
                            ref={textareaRef}
                            value={block.content}
                            onChange={handleInput}
                            onKeyDown={onKeyDown}
                            onFocus={onFocus}
                            placeholder="Neural Citation..."
                            className="w-full bg-transparent border-none text-lg italic font-medium text-slate-600 dark:text-slate-400 focus:ring-0 p-0 placeholder:text-slate-200 dark:placeholder:text-slate-800 resize-none"
                            rows={1}
                        />
                    </div>
                );
            case "callout":
                return (
                    <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <Info className="h-5 w-5 text-indigo-500" />
                        </div>
                        <textarea 
                            ref={textareaRef}
                            value={block.content}
                            onChange={handleInput}
                            onKeyDown={onKeyDown}
                            onFocus={onFocus}
                            placeholder="Neural Briefing..."
                            className="w-full bg-transparent border-none text-sm font-bold leading-relaxed text-indigo-900/70 dark:text-indigo-100/70 focus:ring-0 p-0 placeholder:text-indigo-500/20 resize-none mt-2 uppercase tracking-tight"
                            rows={1}
                        />
                    </div>
                );
            case "divider":
                return (
                    <div className="py-4">
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                    </div>
                );
            case "todo":
                return (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => onUpdate({ metadata: { ...block.metadata, checked: !block.metadata?.checked } })}
                            className={cn(
                                "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                block.metadata?.checked 
                                    ? "bg-indigo-600 border-indigo-600 text-white" 
                                    : "border-slate-300 dark:border-slate-700 hover:border-indigo-500"
                            )}
                        >
                            {block.metadata?.checked && <CheckCircle2 className="h-4 w-4" />}
                        </button>
                        <input 
                            value={block.content}
                            onChange={handleInput}
                            onKeyDown={onKeyDown}
                            onFocus={onFocus}
                            placeholder="Mission Objective..."
                            className={cn(
                                "w-full bg-transparent border-none text-sm font-black uppercase tracking-widest focus:ring-0 p-0 placeholder:text-slate-200 dark:placeholder:text-slate-800",
                                block.metadata?.checked && "line-through text-muted-foreground opacity-50"
                            )}
                        />
                    </div>
                );
            case "image":
                return (
                    <div className="space-y-4">
                        {block.content ? (
                            <div className="relative group rounded-[3rem] overflow-hidden border-4 border-slate-100 dark:border-slate-800">
                                 <img src={block.content} alt="Block Content" className="w-full h-auto max-h-[600px] object-cover" />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                     <Button variant="outline" className="bg-white text-black border-none rounded-2xl font-black uppercase tracking-widest text-[10px]" onClick={() => onUpdate({ content: "" })}>Change Image</Button>
                                 </div>
                            </div>
                        ) : (
                            <div className="p-12 rounded-[3rem] bg-slate-50 dark:bg-slate-900 border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-4">
                                 <div className="h-16 w-16 rounded-3xl bg-white dark:bg-slate-950 flex items-center justify-center shadow-sm">
                                     <ImageIcon className="h-8 w-8 text-slate-300" />
                                 </div>
                                 <Input 
                                    placeholder="Paste Neural URL (Image)..." 
                                    value={block.content}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ content: e.target.value })}
                                    className="max-w-md bg-white dark:bg-slate-950 rounded-2xl border-none font-bold text-xs text-center"
                                 />
                            </div>
                        )}
                    </div>
                );
            case "code":
                return (
                    <div className="rounded-[2.5rem] bg-slate-900 dark:bg-black p-8 overflow-hidden relative">
                        <div className="absolute top-6 right-6 px-3 py-1 rounded-lg bg-white/5 text-[8px] font-black uppercase tracking-widest text-white/40">
                            {block.metadata?.language || "plain text"}
                        </div>
                        <textarea 
                            value={block.content}
                            onChange={handleInput}
                            onKeyDown={onKeyDown}
                            onFocus={onFocus}
                            placeholder="// Enter Neural Algorithm..."
                            className="w-full bg-transparent border-none text-sm font-mono text-indigo-300 focus:ring-0 p-0 placeholder:text-white/10 resize-none min-h-[100px]"
                            rows={4}
                        />
                    </div>
                );
            case "tasks":
                 return (
                     <div className="p-8 rounded-[3rem] bg-emerald-500/5 border-2 border-emerald-500/10 space-y-6">
                         <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <div className="h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white">
                                     <Database className="h-5 w-5" />
                                 </div>
                                 <div className="flex flex-col">
                                     <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600">Dynamic Task Stream</span>
                                     <h4 className="text-sm font-black uppercase tracking-tight">Active Sprint Tasks</h4>
                                 </div>
                             </div>
                             <Button variant="outline" className="rounded-xl border-emerald-500/20 text-emerald-600 font-black uppercase tracking-widest text-[8px] h-8">
                                 Configure Query
                             </Button>
                         </div>
                         <div className="p-8 border-2 border-dashed border-emerald-500/20 rounded-2xl text-center flex flex-col items-center justify-center">
                              <Database className="h-6 w-6 text-emerald-500/40 mb-2" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">No tasks linked</span>
                              <p className="text-[8px] font-bold text-emerald-600/40 uppercase mt-1">Configure this block to pull real-time tasks.</p>
                         </div>
                     </div>
                 );
            case "ai":
                return (
                    <div className="p-4 rounded-[2rem] bg-indigo-600/5 border-2 border-indigo-600/10 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        {isGeneratingAI === block.id ? (
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 animate-pulse flex-1">
                                Neural synthesis in progress...
                            </span>
                        ) : (
                            <input 
                                autoFocus
                                placeholder="Tell the neural net what to write..."
                                className="w-full bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 p-0 placeholder:text-indigo-600/40 text-indigo-900 dark:text-indigo-200"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && e.currentTarget.value) {
                                        e.preventDefault();
                                        generateAIContent(block.id, e.currentTarget.value);
                                    }
                                }}
                            />
                        )}
                    </div>
                );
            default:
                return (
                    <textarea 
                        ref={textareaRef}
                        value={block.content}
                        onChange={handleInput}
                        onKeyDown={onKeyDown}
                        onFocus={onFocus}
                        placeholder="Enter Neural Input... (Type / for commands)"
                        className="w-full bg-transparent border-none text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200 focus:ring-0 p-0 placeholder:text-slate-200 dark:placeholder:text-slate-800 resize-none min-h-[24px]"
                        rows={1}
                    />
                );
        }
    };

    return (
        <div className="relative">
            {renderEditor()}
            {showSlashMenu && (
                <div 
                    className="fixed z-[100] w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-2"
                    style={{ top: cursorPos.top, left: cursorPos.left }}
                >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Neural Commands</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-[300px] overflow-y-auto scrollbar-none">
                        {[
                            { type: "ai", label: "AI Writer", icon: Bot },
                            { type: "h1", label: "Heading 1", icon: Heading1 },
                            { type: "h2", label: "Heading 2", icon: Heading2 },
                            { type: "h3", label: "Heading 3", icon: Heading3 },
                            { type: "bullet", label: "Bullet", icon: List },
                            { type: "todo", label: "Task", icon: CheckSquare },
                            { type: "image", label: "Image", icon: ImageIcon },
                            { type: "code", label: "Code", icon: Code },
                            { type: "quote", label: "Quote", icon: Quote },
                            { type: "callout", label: "Callout", icon: AlertCircle },
                            { type: "table", label: "Table", icon: TableIcon },
                        ].map((cmd) => (
                            <button
                                key={cmd.type}
                                onClick={() => {
                                    onUpdate({ type: cmd.type, content: block.content.replace("/", "") });
                                    setShowSlashMenu(false);
                                }}
                                className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-indigo-500/10 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-all"
                            >
                                <cmd.icon className="h-4 w-4" />
                                <span className="text-[8px] font-black uppercase tracking-tight">{cmd.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {showMentionMenu && (
                <div 
                    className="fixed z-[100] w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-2"
                    style={{ top: cursorPos.top, left: cursorPos.left }}
                >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-2 flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Mention Reference</span>
                        <span className="text-[8px] font-bold text-indigo-500 bg-indigo-500/10 px-2 rounded-full">@{mentionQuery}</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto scrollbar-none space-y-1">
                        <div className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400">Users</div>
                        {["Alice", "Bob", "Charlie"].filter(n => n.toLowerCase().includes(mentionQuery.toLowerCase())).map(name => (
                            <button
                                key={name}
                                onClick={() => {
                                    const words = block.content.split(" ");
                                    words.pop();
                                    onUpdate({ content: [...words, `@${name} `].join(" ") });
                                    setShowMentionMenu(false);
                                }}
                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-indigo-500/10 text-slate-600 dark:text-slate-400 transition-all"
                            >
                                <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                    {name[0]}
                                </div>
                                <span className="text-xs font-bold">{name}</span>
                            </button>
                        ))}
                        
                        <div className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">Projects & Tasks</div>
                        {["Project Alpha", "Task-124"].filter(n => n.toLowerCase().includes(mentionQuery.toLowerCase())).map(name => (
                            <button
                                key={name}
                                onClick={() => {
                                    const words = block.content.split(" ");
                                    words.pop();
                                    onUpdate({ content: [...words, `[[${name}]] `].join(" ") });
                                    setShowMentionMenu(false);
                                }}
                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-indigo-500/10 text-slate-600 dark:text-slate-400 transition-all"
                            >
                                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <Database className="h-3 w-3" />
                                </div>
                                <span className="text-xs font-bold">{name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
