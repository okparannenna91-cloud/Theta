"use client";

import { useState } from "react";
import { 
    ChevronRight, 
    ChevronDown, 
    FileText, 
    Plus, 
    MoreHorizontal,
    GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface IntelligenceTreeProps {
    documents: any[];
    parentId?: string | null;
    activeId?: string;
    level?: number;
    onCreatePage: (parentId?: string) => void;
}

export function IntelligenceTree({ 
    documents, 
    parentId = null, 
    activeId, 
    level = 0,
    onCreatePage 
}: IntelligenceTreeProps) {
    const router = useRouter();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const onToggle = (id: string) => {
        setExpanded(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const currentLevelDocs = documents.filter(doc => doc.parentId === parentId);

    if (currentLevelDocs.length === 0 && level > 0) return null;

    return (
        <div className="space-y-1">
            {currentLevelDocs.map((doc) => {
                const isExpanded = expanded[doc.id];
                const isActive = activeId === doc.id;
                const hasChildren = documents.some(d => d.parentId === doc.id);

                return (
                    <div key={doc.id} className="space-y-1">
                        <div 
                            className={cn(
                                "group flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer relative",
                                isActive 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                                    : "hover:bg-indigo-500/10 text-slate-600 dark:text-slate-400"
                            )}
                            style={{ paddingLeft: `${(level * 16) + 12}px` }}
                            onClick={() => router.push(`/intelligence/${doc.id}`)}
                        >
                            <div 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(doc.id);
                                }}
                                className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-black/10 transition-colors"
                            >
                                {hasChildren ? (
                                    isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                                ) : (
                                    <FileText className="h-3 w-3 opacity-40" />
                                )}
                            </div>
                            
                            <span className="text-lg leading-none">{doc.emoji || "📄"}</span>
                            
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-tight truncate flex-1",
                                isActive ? "text-white" : "text-slate-900 dark:text-slate-100"
                            )}>
                                {doc.title}
                            </span>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-lg hover:bg-black/10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCreatePage(doc.id);
                                        if (!isExpanded) onToggle(doc.id);
                                    }}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-lg hover:bg-black/10"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl border-slate-200 dark:border-slate-800">
                                        <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest py-2.5">
                                            Rename Node
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest py-2.5">
                                            Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest py-2.5 text-rose-500">
                                            Archive Node
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {isExpanded && (
                            <IntelligenceTree 
                                documents={documents}
                                parentId={doc.id}
                                activeId={activeId}
                                level={level + 1}
                                onCreatePage={onCreatePage}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
