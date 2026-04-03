"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Link as LinkIcon, MoveUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLinkMenuProps {
    workspaceId: string;
    position: { x: number, y: number };
    onSelect: (doc: any) => void;
    onClose: () => void;
}

export function PageLinkMenu({ workspaceId, position, onSelect, onClose }: PageLinkMenuProps) {
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const { data: documents, isLoading } = useQuery({
        queryKey: ["wiki-link-search", workspaceId, search],
        queryFn: async () => {
            const res = await fetch(`/api/docs?workspaceId=${workspaceId}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.filter((d: any) => 
                (d.title || "").toLowerCase().includes(search.toLowerCase())
            ).slice(0, 10);
        },
        enabled: !!workspaceId,
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % (documents?.length || 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + (documents?.length || 1)) % (documents?.length || 1));
            } else if (e.key === "Enter" && documents && documents[selectedIndex]) {
                e.preventDefault();
                onSelect(documents[selectedIndex]);
            } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex, onSelect, onClose, documents]);

    return (
        <div 
            ref={menuRef}
            className="fixed z-[200] w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col backdrop-blur-3xl animate-in slide-in-from-top-1"
            style={{ 
                top: position.y + 20, 
                left: Math.min(position.x, window.innerWidth - 320) 
            }}
        >
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                 <LinkIcon className="h-4 w-4 text-indigo-600" />
                 <input 
                    autoFocus
                    placeholder="Reference Intelligence Node..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[10px] font-black uppercase tracking-widest placeholder:opacity-40"
                 />
            </div>

            <div className="flex-1 max-h-80 overflow-y-auto p-2 space-y-1">
                {documents?.map((doc: any, i: number) => (
                    <button
                        key={doc.id}
                        onClick={() => onSelect(doc)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all",
                            selectedIndex === i ? "bg-indigo-600 text-white" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-sm shrink-0">{doc.emoji || "📄"}</span>
                            <div className="text-left overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-tight truncate">{doc.title || "Untitled"}</p>
                                <p className={cn(
                                    "text-[8px] font-bold uppercase tracking-widest mt-0.5 opacity-50",
                                    selectedIndex === i ? "text-white" : "text-muted-foreground"
                                )}>Neural Hash: {doc.id.slice(0, 8)}</p>
                            </div>
                        </div>
                        <MoveUpRight className="h-3 w-3 opacity-40 shrink-0" />
                    </button>
                ))}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
                 <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Internal Bi-directional Linking Engine v1.0</p>
            </div>
        </div>
    );
}
