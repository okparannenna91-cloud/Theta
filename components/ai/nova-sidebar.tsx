"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Pin, Archive, Search, MoreVertical, Trash2, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
    id: string;
    title: string;
    lastMessageAt: string;
    isPinned: boolean;
}

interface NovaSidebarProps {
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
}

export function NovaSidebar({ activeConversationId, onSelectConversation, onNewChat }: NovaSidebarProps) {
    const { activeWorkspaceId } = useWorkspace();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch(`/api/ai/conversations?workspaceId=${activeWorkspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (error) {
            console.error("Failed to fetch conversations");
        } finally {
            setLoading(false);
        }
    }, [activeWorkspaceId]);

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchConversations();
        }
    }, [activeWorkspaceId, fetchConversations]);

    const filteredConversations = conversations.filter(c => 
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinned = filteredConversations.filter(c => c.isPinned);
    const recent = filteredConversations.filter(c => !c.isPinned);

    return (
        <div className="w-80 h-full bg-slate-50/50 dark:bg-slate-950/50 border-r border-slate-200 dark:border-slate-800 flex flex-col backdrop-blur-3xl relative z-30">
            <div className="p-8 space-y-6">
                <Button 
                    onClick={onNewChat}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-lg text-[10px] shadow-sm flex items-center justify-center gap-3 group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-95"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                    New Architecture
                </Button>

                <div className="relative group">
                    <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                    <input 
                        type="text"
                        placeholder="Search Intelligence..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all relative z-10 placeholder:text-slate-400 placeholder:text-xs"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-8 scrollbar-hide">
                {pinned.length > 0 && (
                    <div className="space-y-3">
                        <div className="px-4 flex items-center justify-between">
                            <h3 className="text-xs text-muted-foreground">Pinned</h3>
                            <Pin className="w-3 h-3 text-slate-300" />
                        </div>
                        <div className="space-y-1">
                            {pinned.map(c => (
                                <ChatButton 
                                    key={c.id} 
                                    conversation={c} 
                                    isActive={activeConversationId === c.id}
                                    onClick={() => onSelectConversation(c.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="px-4 flex items-center justify-between">
                        <h3 className="text-xs text-muted-foreground">Recent Threads</h3>
                        <MessageSquare className="w-3 h-3 text-slate-300" />
                    </div>
                    {loading ? (
                        <div className="space-y-3 px-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900/50 animate-pulse rounded-lg border border-slate-200 dark:border-slate-800" />
                            ))}
                        </div>
                    ) : recent.length > 0 ? (
                        <div className="space-y-1">
                            {recent.map(c => (
                                <ChatButton 
                                    key={c.id} 
                                    conversation={c} 
                                    isActive={activeConversationId === c.id}
                                    onClick={() => onSelectConversation(c.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-8 text-center space-y-3">
                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto opacity-50">
                                <Search className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-xs text-muted-foreground">No conversations found</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                <Button 
                    variant="outline"
                    className="w-full h-14 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-[9px] flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-primary/10 hover:border-primary/30 transition-all duration-500 shadow-sm group"
                    onClick={() => {
                        toast.info("Configuration", {
                            description: "Adjusting session configuration."
                        });
                    }}
                >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BrainCircuit className="w-4 h-4 text-primary" />
                    </div>
                    Nova Brain Settings
                </Button>
            </div>
        </div>
    );
}

function ChatButton({ conversation, isActive, onClick }: { conversation: Conversation, isActive: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex flex-col items-start p-4 rounded-lg transition-all duration-500 group relative overflow-hidden",
                isActive 
                    ? "bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800" 
                    : "hover:bg-white dark:hover:bg-slate-900/50 border border-transparent hover:border-slate-100 dark:hover:border-slate-800/50"
            )}
        >
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-sm" />
            )}
            <div className="flex items-center justify-between w-full mb-1.5">
                <span className={cn(
                    "text-[11px] font-semibold truncate max-w-[160px] tracking-tight",
                    isActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
                )}>
                    {conversation.title || "Untitled Intelligence"}
                </span>
                {conversation.isPinned && <Pin className="w-2.5 h-2.5 text-primary fill-primary animate-pulse" />}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-400 opacity-60">
                    {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                </span>
            </div>
            
            <div className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 transition-all duration-500",
                isActive ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0"
            )}>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                    <MoreVertical className="w-3.5 h-3.5" />
                </Button>
            </div>
        </button>
    );
}
