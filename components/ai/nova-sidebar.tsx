"use client";

import React, { useState, useEffect } from "react";
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

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchConversations();
        }
    }, [activeWorkspaceId]);

    const fetchConversations = async () => {
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
    };

    const filteredConversations = conversations.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinned = filteredConversations.filter(c => c.isPinned);
    const recent = filteredConversations.filter(c => !c.isPinned);

    return (
        <div className="w-80 h-full bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-6 space-y-4">
                <Button 
                    onClick={onNewChat}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group"
                >
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    New Chat
                </Button>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-6">
                {pinned.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pinned</h3>
                        {pinned.map(c => (
                            <ChatButton 
                                key={c.id} 
                                conversation={c} 
                                isActive={activeConversationId === c.id}
                                onClick={() => onSelectConversation(c.id)}
                            />
                        ))}
                    </div>
                )}

                <div className="space-y-2">
                    <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recent Chats</h3>
                    {loading ? (
                        <div className="space-y-2 px-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : recent.length > 0 ? (
                        recent.map(c => (
                            <ChatButton 
                                key={c.id} 
                                conversation={c} 
                                isActive={activeConversationId === c.id}
                                onClick={() => onSelectConversation(c.id)}
                            />
                        ))
                    ) : (
                        <p className="px-3 text-xs font-bold text-slate-400 italic">No conversations found</p>
                    )}
                </div>
            </div>
            <div className="p-6 mt-auto border-t border-slate-200 dark:border-slate-800">
                <Button 
                    variant="outline"
                    className="w-full h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    onClick={() => {
                        // For now, let's just trigger a toast or a placeholder for settings
                        toast.info("Nova Brain Neural Settings", {
                            description: "Configure your AI's writing style, tone, and long-term memory. (Phase 3 Feature)"
                        });
                    }}
                >
                    <BrainCircuit className="w-4 h-4 text-indigo-500" />
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
                "w-full flex flex-col items-start p-4 rounded-2xl transition-all duration-300 group relative",
                isActive 
                    ? "bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
        >
            <div className="flex items-center justify-between w-full mb-1">
                <span className={cn(
                    "text-sm font-black truncate max-w-[180px] tracking-tight",
                    isActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                )}>
                    {conversation.title}
                </span>
                {conversation.isPinned && <Pin className="w-3 h-3 text-indigo-500 fill-indigo-500" />}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
            </span>
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
                    <MoreVertical className="w-4 h-4" />
                </Button>
            </div>
        </button>
    );
}
