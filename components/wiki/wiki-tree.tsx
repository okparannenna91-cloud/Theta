"use client";

import { useState } from "react";
import { 
    ChevronRight, 
    ChevronDown, 
    Plus, 
    MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface WikiTreeProps {
    documents: any[];
    activeId?: string;
    onCreatePage: (parentId?: string) => void;
    basePath?: string;
}

export function WikiTree({ documents, activeId, onCreatePage, basePath = "/wiki" }: WikiTreeProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const buildTree = (docs: any[]) => {
        const tree: any[] = [];
        const map: any = {};
        
        docs.forEach(doc => {
            map[doc.id] = { ...doc, children: [] };
        });

        docs.forEach(doc => {
            if (doc.parentId && map[doc.parentId]) {
                map[doc.parentId].children.push(map[doc.id]);
            } else {
                tree.push(map[doc.id]);
            }
        });

        return tree;
    };

    const tree = buildTree(documents);

    return (
        <div className="space-y-0.5">
            {tree.map((doc) => (
                <TreeItem 
                    key={doc.id}
                    doc={doc}
                    level={0}
                    expandedIds={expandedIds}
                    onToggle={toggleExpand}
                    activeId={activeId}
                    onCreateChild={onCreatePage}
                    basePath={basePath}
                />
            ))}
        </div>
    );
}

function TreeItem({ doc, level, expandedIds, onToggle, activeId, onCreateChild, basePath }: any) {
    const isExpanded = expandedIds.has(doc.id);
    const isActive = activeId === doc.id;
    const hasChildren = doc.children && doc.children.length > 0;

    return (
        <div className="space-y-0.5">
            <div 
                className={cn(
                    "group flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer border border-transparent",
                    isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "hover:bg-slate-100 dark:hover:bg-slate-900/60"
                )}
                style={{ marginLeft: `${level * 12}px` }}
            >
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(doc.id); }}
                    className={cn(
                        "h-5 w-5 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors",
                        !hasChildren && "opacity-0 cursor-default"
                    )}
                >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>

                <Link href={`${basePath}/${doc.id}`} className="flex-1 flex items-center gap-3 overflow-hidden">
                    <span className="text-sm shrink-0">{doc.emoji || "📄"}</span>
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-tight truncate",
                        isActive ? "text-white" : "text-slate-600 dark:text-slate-400 group-hover:text-foreground"
                    )}>
                        {doc.title || "Untitled Page"}
                    </span>
                </Link>

                <div className={cn(
                    "opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity",
                    isActive ? "text-white" : "text-muted-foreground"
                )}>
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCreateChild(doc.id); }}
                        className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all active:scale-95">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {isExpanded && hasChildren && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        {doc.children.map((child: any) => (
                            <TreeItem 
                                key={child.id}
                                doc={child}
                                level={level + 1}
                                expandedIds={expandedIds}
                                onToggle={onToggle}
                                activeId={activeId}
                                onCreateChild={onCreateChild}
                                basePath={basePath}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
