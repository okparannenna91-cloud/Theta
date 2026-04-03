"use client";

import { useEffect, useState, useRef } from "react";
import { 
    Heading1, 
    Heading2, 
    Heading3, 
    List, 
    Code, 
    Quote, 
    Type, 
    CheckSquare,
    Image as ImageIcon,
    Minus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashMenuProps {
    position: { x: number, y: number };
    onSelect: (type: string) => void;
    onClose: () => void;
}

const COMMANDS = [
    { id: "h1", label: "Heading 1", icon: Heading1, shortcut: "#" },
    { id: "h2", label: "Heading 2", icon: Heading2, shortcut: "##" },
    { id: "h3", label: "Heading 3", icon: Heading3, shortcut: "###" },
    { id: "paragraph", label: "Text", icon: Type, shortcut: "" },
    { id: "bullet", label: "Bullet List", icon: List, shortcut: "-" },
    { id: "number", label: "Numbered List", icon: List, shortcut: "1." },
    { id: "todo", label: "To-do List", icon: CheckSquare, shortcut: "[]" },
    { id: "code", label: "Code Block", icon: Code, shortcut: "```" },
    { id: "quote", label: "Quote", icon: Quote, shortcut: ">" },
    { id: "divider", label: "Divider", icon: Minus, shortcut: "---" },
];

export function SlashMenu({ position, onSelect, onClose }: SlashMenuProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % COMMANDS.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + COMMANDS.length) % COMMANDS.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                onSelect(COMMANDS[selectedIndex].id);
            } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex, onSelect, onClose]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div 
            ref={menuRef}
            className="fixed z-[100] w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden p-2 backdrop-blur-xl"
            style={{ 
                top: position.y + 20, 
                left: Math.min(position.x, window.innerWidth - 300) 
            }}
        >
            <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Basic Blocks</p>
            <div className="space-y-1">
                {COMMANDS.map((cmd, i) => (
                    <button
                        key={cmd.id}
                        onClick={() => onSelect(cmd.id)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
                            selectedIndex === i ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-1.5 rounded-lg",
                                selectedIndex === i ? "bg-white/20" : "bg-slate-50 dark:bg-slate-800"
                            )}>
                                <cmd.icon className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-tight">{cmd.label}</span>
                        </div>
                        {cmd.shortcut && (
                            <span className={cn(
                                "text-[10px] font-bold opacity-60",
                                selectedIndex === i ? "text-white" : "text-muted-foreground"
                            )}>{cmd.shortcut}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
