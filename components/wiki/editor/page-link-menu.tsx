"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Link as LinkIcon, MoveUpRight, FolderKanban, CheckSquare, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLinkMenuProps {
    workspaceId: string;
    position: { x: number, y: number };
    onSelect: (item: any) => void;
    onClose: () => void;
}

export function PageLinkMenu({ workspaceId, position, onSelect, onClose }: PageLinkMenuProps) {
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const { data: results, isLoading } = useQuery({
        queryKey: ["wiki-mention-search", workspaceId, search],
        queryFn: async () => {
            const [docsRes, projectsRes, tasksRes] = await Promise.all([
                fetch(`/api/docs?workspaceId=${workspaceId}`),
                fetch(`/api/projects?workspaceId=${workspaceId}`),
                fetch(`/api/tasks?workspaceId=${workspaceId}`)
            ]);

            const docs = docsRes.ok ? await docsRes.json() : [];
            const projects = projectsRes.ok ? (await projectsRes.json()).projects || [] : [];
            const tasks = tasksRes.ok ? (await tasksRes.json()).tasks || [] : [];

            const filteredDocs = docs.filter((d: any) => (d.title || "").toLowerCase().includes(search.toLowerCase())).map((d: any) => ({ ...d, mentionType: "doc" })).slice(0, 5);
            const filteredProjects = projects.filter((p: any) => (p.name || "").toLowerCase().includes(search.toLowerCase())).map((p: any) => ({ ...p, title: p.name, emoji: "📁", mentionType: "project" })).slice(0, 3);
            const filteredTasks = tasks.filter((t: any) => (t.title || "").toLowerCase().includes(search.toLowerCase())).map((t: any) => ({ ...t, emoji: "✅", mentionType: "task" })).slice(0, 3);

            return [...filteredDocs, ...filteredProjects, ...filteredTasks];
        },
        enabled: !!workspaceId,
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % (results?.length || 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + (results?.length || 1)) % (results?.length || 1));
            } else if (e.key === "Enter" && results && results[selectedIndex]) {
                e.preventDefault();
                onSelect(results[selectedIndex]);
            } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex, onSelect, onClose, results]);

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
                 <Hash className="h-4 w-4 text-indigo-600" />
                 <input 
                    autoFocus
                    placeholder="Reference Entity (@)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[10px] font-black uppercase tracking-widest placeholder:opacity-40"
                 />
            </div>

            <div className="flex-1 max-h-80 overflow-y-auto p-2 space-y-1">
                {results?.map((item: any, i: number) => (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all",
                            selectedIndex === i ? "bg-indigo-600 text-white" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-sm shrink-0">
                                {item.mentionType === "project" ? <FolderKanban className="h-4 w-4" /> : 
                                 item.mentionType === "task" ? <CheckSquare className="h-4 w-4" /> : 
                                 (item.emoji || "📄")}
                            </span>
                            <div className="text-left overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-tight truncate">{item.title || "Untitled"}</p>
                                <p className={cn(
                                    "text-[8px] font-bold uppercase tracking-widest mt-0.5 opacity-50",
                                    selectedIndex === i ? "text-white" : "text-muted-foreground"
                                )}>
                                    {item.mentionType.toUpperCase()} • {item.id.slice(0, 8)}
                                </p>
                            </div>
                        </div>
                        <MoveUpRight className="h-3 w-3 opacity-40 shrink-0" />
                    </button>
                ))}
                {results?.length === 0 && (
                    <div className="p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30">No results found</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
                 <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Cross-Entity Intelligence Linker v2.0</p>
            </div>
        </div>
    );
}
