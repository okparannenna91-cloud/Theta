"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as Ably from "ably";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Send, 
    Loader2, 
    Hash, 
    MessageSquare, 
    Paperclip, 
    X, 
    FileText, 
    ImageIcon,
    MoreVertical,
    Reply,
    Pin,
    Trash2,
    PinOff
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { FileUpload } from "@/components/common/file-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePopups } from "@/components/popups/popup-manager";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles } from "lucide-react";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

interface TeamChatProps {
    teamId: string;
    workspaceId: string;
}

export function TeamChat({ teamId, workspaceId }: TeamChatProps) {
    const { user } = useUser();
    const { showUpgradePrompt } = usePopups();
    const [message, setMessage] = useState("");
    const [attachment, setAttachment] = useState<any>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [lastReadAt, setLastReadAt] = useState<string | null>(null);
    const [limits, setLimits] = useState({ current: 0, max: -1 });
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [dbUser, setDbUser] = useState<any>(null);
    const [replyTo, setReplyTo] = useState<any>(null);
    
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [typingUsers, setTypingUsers] = useState<Record<string, {name: string, timestamp: number}>>({});
    const [readReceipts, setReadReceipts] = useState<Record<string, string>>({});
    
    const ablyRef = useRef<Ably.Realtime | null>(null);
    const channelRef = useRef<Ably.RealtimeChannel | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastReadRef = useRef<string | null>(null);
    const lastTypedRef = useRef<number>(0);
    const isPrependingRef = useRef(false);

    useEffect(() => {
        fetch("/api/auth/me")
            .then(res => res.json())
            .then(data => setDbUser(data))
            .catch(err => console.error("Failed to fetch DB user profile:", err));
    }, []);

    const markAsRead = useCallback(async () => {
        if (!teamId || !workspaceId) return;
        try {
            await fetch("/api/chat/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId, workspaceId })
            });
            const now = new Date().toISOString();
            setLastReadAt(now);
            lastReadRef.current = now;
        } catch (err) {
            console.error("Failed to mark chat as read", err);
        }
    }, [teamId, workspaceId]);

    // ─── Standalone history fetch (always runs on mount, independent of Ably) ───
    const fetchMessages = useCallback(async (cursorParam?: string | null) => {
        try {
            if (!cursorParam) setIsLoading(true);
            const url = `/api/chat?workspaceId=${workspaceId}&teamId=${teamId}${
                cursorParam ? `&cursor=${cursorParam}` : ""
            }`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to load messages");
            const data = await res.json();
            if (data.messages && Array.isArray(data.messages)) {
                if (cursorParam) {
                    // Prepending older messages
                    const scrollNode = scrollRef.current;
                    const oldScrollHeight = scrollNode ? scrollNode.scrollHeight : 0;
                    isPrependingRef.current = true;
                    setMessages(prev => [...data.messages, ...prev]);
                    requestAnimationFrame(() => {
                        if (scrollNode) scrollNode.scrollTop = scrollNode.scrollHeight - oldScrollHeight;
                    });
                } else {
                    setMessages(data.messages);
                }
                setCursor(data.nextCursor);
                setHasMore(!!data.nextCursor);
                if (data.limits) setLimits(data.limits);
                if (data.lastReadAt && !cursorParam) {
                    setLastReadAt(data.lastReadAt);
                    lastReadRef.current = data.lastReadAt;
                }
                if (!cursorParam) markAsRead();
            }
        } catch (err) {
            console.error("[Chat] Failed to fetch messages:", err);
        } finally {
            if (!cursorParam) setIsLoading(false);
        }
    }, [teamId, workspaceId, markAsRead]);

    const connectAbly = useCallback(async () => {
        if (!user?.id || !teamId) return;

        try {
            setIsLoading(true);
            setIsConnected(false);
            
            if (ablyRef.current) {
                ablyRef.current.close();
            }

            const ably = new Ably.Realtime({
                authUrl: "/api/ably/token",
                clientId: user.id
            });

            const channelName = `team:${teamId}:chat`;
            const channel = ably.channels.get(channelName);

            ably.connection.on("connected", () => {
                setIsConnected(true);
                setIsLoading(false);
            });

            channel.subscribe("message", (msg) => {
                setMessages((prev) => {
                    const incoming = msg.data;
                    const exists = prev.some(m => 
                        m.id === incoming.id || 
                        (incoming.tempId && m.tempId === incoming.tempId)
                    );
                    
                    if (exists) {
                        return prev.map(m => 
                            (incoming.tempId && m.tempId === incoming.tempId) ? incoming : m
                        );
                    }
                    return [...prev, incoming];
                });
            });

            channel.subscribe("message:updated", (msg) => {
                setMessages((prev) => prev.map(m => m.id === msg.data.id ? { ...m, ...msg.data } : m));
            });

            channel.subscribe("message:deleted", (msg) => {
                setMessages((prev) => prev.map(m => m.id === msg.data.id ? { ...m, deletedAt: new Date().toISOString() } : m));
            });

            channel.subscribe("typing", (msg) => {
                if (msg.data.userId === user.id) return;
                setTypingUsers(prev => ({
                    ...prev,
                    [msg.data.userId]: { name: msg.data.name, timestamp: Date.now() }
                }));
                setTimeout(() => {
                    setTypingUsers(prev => {
                        const now = Date.now();
                        const next = { ...prev };
                        let changed = false;
                        for (const id in next) {
                            if (now - next[id].timestamp > 2500) {
                                delete next[id];
                                changed = true;
                            }
                        }
                        return changed ? next : prev;
                    });
                }, 3000);
            });

            channel.subscribe("read:updated", (msg) => {
                const { userId, timestamp } = msg.data;
                if (userId !== user.id) {
                    setReadReceipts(prev => ({ ...prev, [userId]: timestamp }));
                }
            });

            channel.presence.enter({
                id: user.id,
                name: user.fullName || user.firstName || "User",
                imageUrl: user.imageUrl
            });

            channel.presence.subscribe(['enter', 'leave', 'update'], () => {
                channel.presence.get().then((members) => {
                    if (members) {
                        setOnlineUsers(members.map(m => m.data));
                    }
                }).catch(console.error);
            });

            channel.presence.get().then((members) => {
                if (members) {
                    setOnlineUsers(members.map(m => m.data));
                }
            }).catch(console.error);

            ablyRef.current = ably;
            channelRef.current = channel;

            // Ably connected — if messages haven't loaded yet, trigger a fetch
            ably.connection.once("connected", () => {
                if (messages.length === 0) fetchMessages();
            });

        } catch (error) {
            console.error("[Chat] Ably setup error:", error);
            setIsLoading(false);
        }
    }, [teamId, user?.id, user?.fullName, user?.firstName, user?.imageUrl, workspaceId, markAsRead, fetchMessages]);

    // Fetch messages independently on mount/teamId change
    useEffect(() => {
        if (teamId && workspaceId) {
            fetchMessages();
        }
    }, [teamId, workspaceId, fetchMessages]);

    useEffect(() => {
        if (user?.id && teamId) {
            connectAbly();
        }
        return () => {
            if (ablyRef.current) {
                ablyRef.current.close();
                ablyRef.current = null;
            }
        };
    }, [connectAbly, user?.id, teamId]);

    useEffect(() => {
        if (scrollRef.current && !isPrependingRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        isPrependingRef.current = false;
    }, [messages]);

    const fetchOlderMessages = async () => {
        if (!hasMore || isFetchingMore || !cursor) return;
        setIsFetchingMore(true);
        try {
            await fetchMessages(cursor);
        } finally {
            setIsFetchingMore(false);
        }
    };

    const handleScroll = () => {
        if (!scrollRef.current) return;
        if (scrollRef.current.scrollTop === 0 && hasMore && !isFetchingMore) {
            fetchOlderMessages();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(e.target.value);
        if (!channelRef.current || !user?.id) return;
        const now = Date.now();
        if (now - lastTypedRef.current > 2000) {
            channelRef.current.publish("typing", {
                userId: user.id,
                name: user.fullName || user.firstName || "Someone"
            });
            lastTypedRef.current = now;
        }
    };

    const isLimitReached = limits.max !== -1 && limits.current >= limits.max;

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!message.trim() && !attachment) || !teamId || !workspaceId) return;

        if (isLimitReached) {
            showUpgradePrompt("chat");
            return;
        }

        const content = message;
        const currentAttachment = attachment;
        const currentReplyTo = replyTo;
        const tempId = Date.now().toString();

        const optimisticMsg = {
            id: tempId,
            tempId,
            content,
            userId: user?.id,
            attachment: currentAttachment,
            replyTo: currentReplyTo,
            createdAt: new Date().toISOString(),
            user: {
                name: user?.fullName || user?.firstName || "You",
                imageUrl: user?.imageUrl
            }
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setMessage("");
        setAttachment(null);
        setReplyTo(null);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: content || (currentAttachment ? "Sent an attachment" : ""),
                    workspaceId,
                    teamId,
                    attachment: currentAttachment,
                    tempId,
                    replyToId: currentReplyTo?.id
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                setMessages(prev => prev.filter(m => m.tempId !== tempId));
                if (res.status === 403 && error.error?.includes("limit")) {
                    showUpgradePrompt("chat");
                } else {
                    toast.error(`Failed to send: ${error.error || "Unknown error"}`);
                }
            } else {
                const savedMsg = await res.json();
                setMessages(prev => prev.map(m => m.tempId === tempId ? { ...savedMsg, user: m.user } : m));
                markAsRead();
            }
        } catch (error) {
            setMessages(prev => prev.filter(m => m.tempId !== tempId));
            toast.error("Failed to send message");
        }
    };

    const togglePin = async (msg: any) => {
        try {
            const res = await fetch(`/api/chat?id=${msg.id}&workspaceId=${workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPinned: !msg.isPinned })
            });
            if (!res.ok) throw new Error("Failed to pin message");
            toast.success(msg.isPinned ? "Message unpinned" : "Message pinned");
        } catch (err) {
            toast.error("Failed to update pin status");
        }
    };

    const deleteMessage = async (msgId: string) => {
        try {
            const res = await fetch(`/api/chat?id=${msgId}&workspaceId=${workspaceId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete message");
            toast.success("Message deleted");
        } catch (err) {
            toast.error("Failed to delete message");
        }
    };

    const pinnedMessages = messages.filter(m => m.isPinned && !m.deletedAt);

    const latestSeenMessageMap: Record<string, string[]> = {};
    Object.entries(readReceipts).forEach(([uid, t]) => {
        let lastSeenMsgId = null;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].createdAt <= t) {
                lastSeenMsgId = messages[i].id;
                break;
            }
        }
        if (lastSeenMsgId) {
            if (!latestSeenMessageMap[lastSeenMsgId]) latestSeenMessageMap[lastSeenMsgId] = [];
            latestSeenMessageMap[lastSeenMsgId].push(uid);
        }
    });

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 relative">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-lg">
                        <Hash className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold">Team Discussion</h3>
                        <div className="flex items-center gap-1">
                            <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                {isConnected ? `${onlineUsers.length} Online` : "Connecting..."}
                            </span>
                        </div>
                    </div>
                </div>

                {pinnedMessages.length > 0 && (
                    <div className="flex items-center gap-2">
                         <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800 text-[9px] font-black uppercase">
                            <Pin className="h-3 w-3 mr-1" /> {pinnedMessages.length} Pinned
                         </Badge>
                    </div>
                )}
            </div>

            {/* Pinned Messages Bar */}
            <AnimatePresence>
                {pinnedMessages.length > 0 && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/30 overflow-hidden"
                    >
                        {pinnedMessages.slice(0, 1).map(msg => (
                            <div key={msg.id} className="p-2 px-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Pin className="h-3 w-3 text-amber-600 shrink-0" />
                                    <span className="text-[10px] font-medium text-amber-800 dark:text-amber-400 truncate">
                                        Pinned: {msg.content}
                                    </span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-600" onClick={() => togglePin(msg)}>
                                    <PinOff className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef} onScroll={handleScroll}>
                {isFetchingMore && (
                    <div className="flex justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
                {isLoading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        <p className="text-sm">Loading messages...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                        <MessageSquare className="h-12 w-12 mb-2" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.userId === dbUser?.id || msg.userId === user?.id;
                        const isNew = lastReadAt && msg.createdAt > lastReadAt && !isMe;
                        const prevMsg = messages[idx - 1];
                        const showUnreadDivider = isNew && (!prevMsg || prevMsg.createdAt <= lastReadAt!);
                        
                        return (
                            <div key={msg.id}>
                                {showUnreadDivider && (
                                    <div className="flex items-center gap-2 my-6">
                                        <div className="h-[1px] flex-1 bg-rose-200 dark:bg-rose-900/30" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500">New Messages</span>
                                        <div className="h-[1px] flex-1 bg-rose-200 dark:bg-rose-900/30" />
                                    </div>
                                )}

                                <div className={`flex group ${isMe ? "justify-end" : "justify-start"}`}>
                                    <div className={`flex gap-3 max-w-[80%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                        <div className={`h-8 w-8 rounded-xl shrink-0 flex items-center justify-center text-[10px] font-black ${isMe ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-200 dark:bg-slate-800"}`}>
                                            {msg.user?.name?.slice(0, 2).toUpperCase() || "U"}
                                        </div>
                                        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                {!isMe && <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{msg.user?.name || "User"}</span>}
                                                <span className="text-[8px] font-medium text-slate-400 uppercase tracking-tighter">
                                                    {format(new Date(msg.createdAt), "HH:mm")}
                                                </span>
                                                {msg.isPinned && <Pin className="h-2.5 w-2.5 text-amber-500" />}
                                            </div>

                                            <div className="relative">
                                                <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all ${
                                                    msg.deletedAt 
                                                    ? "bg-slate-100 dark:bg-slate-900 text-slate-400 italic border border-slate-200 dark:border-slate-800" 
                                                    : isMe 
                                                        ? "bg-indigo-600 text-white rounded-tr-none" 
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/50 dark:border-slate-700/50"
                                                }`}>
                                                    {msg.deletedAt ? (
                                                        <div className="flex items-center gap-2">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            This message was deleted
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {msg.replyTo && (
                                                                <div className={`mb-2 p-2 rounded-lg text-[10px] border-l-2 ${isMe ? "bg-black/10 border-white/30 text-white/70" : "bg-slate-200/50 dark:bg-slate-700/50 border-indigo-500 text-slate-500"}`}>
                                                                    <div className="font-black uppercase tracking-tighter mb-0.5 flex items-center gap-1">
                                                                        <Reply className="h-2.5 w-2.5" />
                                                                        Replying to {msg.replyTo.userId === user?.id ? "you" : "someone"}
                                                                    </div>
                                                                    <span className="line-clamp-1">{msg.replyTo.content}</span>
                                                                </div>
                                                            )}
                                                            {msg.attachment && (
                                                                <div className="mb-2">
                                                                    {msg.attachment.category === "image" ? (
                                                                        <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block relative h-48 w-64 overflow-hidden rounded-xl border border-white/10">
                                                                            <Image src={msg.attachment.url} alt="Attachment" fill className="object-cover" />
                                                                        </a>
                                                                    ) : (
                                                                        <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-black/10 rounded-xl hover:bg-black/20 transition-colors">
                                                                            <FileText className="h-5 w-5" />
                                                                            <div className="flex flex-col">
                                                                                <span className="text-xs font-bold truncate max-w-[120px]">{msg.attachment.originalName}</span>
                                                                                <span className="text-[8px] font-black uppercase opacity-60">Document</span>
                                                                            </div>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Message Menu Trigger */}
                                                {!msg.deletedAt && (
                                                    <div className={`absolute top-0 ${isMe ? "-left-10" : "-right-10"} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                    <MoreVertical className="h-4 w-4 text-slate-400" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align={isMe ? "end" : "start"} className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                                                                <DropdownMenuItem onClick={() => setReplyTo(msg)} className="text-[10px] font-black uppercase tracking-widest gap-2">
                                                                    <Reply className="h-3.5 w-3.5" /> Reply
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => togglePin(msg)} className="text-[10px] font-black uppercase tracking-widest gap-2">
                                                                    <Pin className="h-3.5 w-3.5" /> {msg.isPinned ? "Unpin" : "Pin"}
                                                                </DropdownMenuItem>
                                                                {isMe && (
                                                                    <DropdownMenuItem onClick={() => deleteMessage(msg.id)} className="text-[10px] font-black uppercase tracking-widest gap-2 text-rose-500">
                                                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                )}
                                                {/* Read Receipts */}
                                                {latestSeenMessageMap[msg.id] && (
                                                    <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Seen by</span>
                                                        <div className="flex -space-x-1">
                                                            {latestSeenMessageMap[msg.id].map(uid => {
                                                                const oUser = onlineUsers.find(u => u.id === uid);
                                                                if (oUser && oUser.imageUrl) {
                                                                    return (
                                                                        <div key={uid} className="relative h-3 w-3 rounded-full border border-white overflow-hidden">
                                                                            <Image src={oUser.imageUrl} fill className="object-cover" alt="seen" sizes="12px" />
                                                                        </div>
                                                                    );
                                                                }
                                                                return <div key={uid} className="h-3 w-3 rounded-full bg-slate-300 border border-white" />
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t bg-slate-50/50 dark:bg-slate-900/50 relative">
                {Object.keys(typingUsers).length > 0 && (
                    <div className="absolute -top-6 left-6 text-[10px] text-indigo-500 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {Object.values(typingUsers).map(u => u.name).join(", ")} {Object.keys(typingUsers).length === 1 ? "is" : "are"} typing...
                    </div>
                )}
                {/* Reply Context */}
                {replyTo && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mb-3 flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Reply className="h-4 w-4 text-indigo-500 shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Replying to {replyTo.user?.name}</span>
                                <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{replyTo.content}</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyTo(null)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </motion.div>
                )}

                {/* Attachment Context */}
                {attachment && (
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mb-3 flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/50"
                    >
                        <div className="flex items-center gap-3">
                            {attachment.category === "image" ? <ImageIcon className="h-5 w-5 text-purple-500" /> : <FileText className="h-5 w-5 text-purple-500" />}
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 truncate max-w-[200px]">{attachment.originalName}</span>
                                <span className="text-[8px] font-black uppercase text-purple-400">Ready to send</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setAttachment(null)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </motion.div>
                )}

                <form onSubmit={sendMessage} className="flex gap-3">
                    <div className="flex-1 flex gap-2 p-1 bg-white dark:bg-slate-950 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner">
                        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-indigo-600 shrink-0 h-10 w-10 rounded-full"
                                    disabled={!isConnected}
                                >
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2rem] border-slate-200 dark:border-slate-800 max-w-sm">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Attach Assets</DialogTitle>
                                </DialogHeader>
                                <FileUpload
                                    workspaceId={workspaceId}
                                    onUploadComplete={(data) => {
                                        setAttachment({
                                            url: data.url || data.secure_url,
                                            originalName: data.originalName || "Attachment",
                                            category: (data.url || data.secure_url).match(/\.(jpeg|jpg|gif|png|webp)$/i) ? "image" : "document"
                                        });
                                        setIsUploadOpen(false);
                                    }}
                                />
                            </DialogContent>
                        </Dialog>
                        <Input
                            placeholder={isLimitReached ? "LIMIT REACHED" : "MESSAGE #TEAM..."}
                            value={message}
                            onChange={handleInputChange}
                            className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-medium placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-[0.2em]"
                            disabled={!isConnected || isLimitReached}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!isConnected || isLimitReached || (!message.trim() && !attachment)}
                            className="bg-indigo-600 hover:bg-indigo-700 shrink-0 h-10 w-10 rounded-full shadow-lg shadow-indigo-500/30"
                        >
                            {isLimitReached ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </form>
                
                {isLimitReached && (
                    <div className="mt-4 flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 backdrop-blur-sm">
                         <div className="flex items-center gap-3">
                             <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20">
                                <Sparkles className="h-4 w-4 text-white" />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Enterprise Chat Unlocked with Theta+</span>
                         </div>
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-4"
                            onClick={() => showUpgradePrompt("chat")}
                         >
                             Upgrade
                         </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
