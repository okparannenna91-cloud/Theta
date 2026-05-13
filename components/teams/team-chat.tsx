"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import * as Ably from "ably";
import { useUser } from "@clerk/nextjs";
import { 
  Hash, 
  Pin, 
  PinOff, 
  MoreVertical, 
  MessageSquare, 
  Reply, 
  Image as ImageIcon, 
  FileText, 
  Paperclip, 
  Lock, 
  Send, 
  Sparkles, 
  X, 
  Loader2,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { usePopups } from "@/components/popups/popup-manager";
import { MotionWrapper, FadeIn } from "@/components/common/motion-wrapper";
import { FileUpload } from "@/components/common/file-upload";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

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

    const fetchMessages = useCallback(async (cursorParam?: string | null) => {
        try {
            if (!workspaceId || !teamId || workspaceId === "undefined" || teamId === "undefined") return;
            
            if (!cursorParam) setIsLoading(true);
            const url = `/api/chat?workspaceId=${workspaceId}&teamId=${teamId}${
                cursorParam ? `&cursor=${cursorParam}` : ""
            }`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to load messages");
            const data = await res.json();
            if (data.messages && Array.isArray(data.messages)) {
                    if (cursorParam) {
                        const scrollNode = scrollRef.current;
                        const oldScrollHeight = scrollNode ? scrollNode.scrollHeight : 0;
                        isPrependingRef.current = true;
                        setMessages(prev => [...data.messages, ...prev]);
                        requestAnimationFrame(() => {
                            if (scrollNode) scrollNode.scrollTop = scrollNode.scrollHeight - oldScrollHeight;
                        });
                    } else {
                        setMessages(prev => data.messages);
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
            if (ablyRef.current) ablyRef.current.close();

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
                    const exists = prev.some(m => m.id === incoming.id || (incoming.tempId && m.tempId === incoming.tempId));
                    if (exists) return prev.map(m => (incoming.tempId && m.tempId === incoming.tempId) ? incoming : m);
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
                setTypingUsers(prev => ({ ...prev, [msg.data.userId]: { name: msg.data.name, timestamp: Date.now() } }));
                setTimeout(() => {
                    setTypingUsers(prev => {
                        const now = Date.now();
                        const next = { ...prev };
                        let changed = false;
                        for (const id in next) {
                            if (now - next[id].timestamp > 2500) { delete next[id]; changed = true; }
                        }
                        return changed ? next : prev;
                    });
                }, 3000);
            });

            channel.subscribe("read:updated", (msg) => {
                const { userId, timestamp } = msg.data;
                if (userId !== user.id) setReadReceipts(prev => ({ ...prev, [userId]: timestamp }));
            });

            channel.presence.enter({ id: user.id, name: user.fullName || user.firstName || "User", imageUrl: user.imageUrl });
            channel.presence.subscribe(['enter', 'leave', 'update'], () => {
                channel.presence.get().then((members) => { if (members) setOnlineUsers(members.map(m => m.data)); }).catch(console.error);
            });

            ablyRef.current = ably;
            channelRef.current = channel;

            ably.connection.once("connected", () => {
                setMessages(prev => { if (prev.length === 0) fetchMessages(); return prev; });
            });

        } catch (error) {
            console.error("[Chat] Ably setup error:", error);
            setIsLoading(false);
        }
    }, [teamId, user?.id, user?.fullName, user?.firstName, user?.imageUrl, fetchMessages]);

    useEffect(() => { if (teamId && workspaceId) fetchMessages(); }, [teamId, workspaceId, fetchMessages]);
    useEffect(() => {
        if (user?.id && teamId) connectAbly();
        return () => { if (ablyRef.current) { ablyRef.current.close(); ablyRef.current = null; } };
    }, [connectAbly, user?.id, teamId]);

    useEffect(() => {
        if (scrollRef.current && !isPrependingRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        isPrependingRef.current = false;
    }, [messages]);

    const handleScroll = () => { if (scrollRef.current?.scrollTop === 0 && hasMore && !isFetchingMore) fetchMessages(cursor); };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(e.target.value);
        if (!channelRef.current || !user?.id) return;
        const now = Date.now();
        if (now - lastTypedRef.current > 2000) {
            channelRef.current.publish("typing", { userId: user.id, name: user.fullName || user.firstName || "Someone" });
            lastTypedRef.current = now;
        }
    };

    const isLimitReached = limits.max !== -1 && limits.current >= limits.max;

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!message.trim() && !attachment) || !teamId || !workspaceId) return;
        if (isLimitReached) { showUpgradePrompt("chat"); return; }

        const tempId = Date.now().toString();
        const optimisticMsg = {
            id: tempId, tempId, content: message, userId: user?.id, attachment, replyTo, createdAt: new Date().toISOString(),
            user: { name: user?.fullName || user?.firstName || "You", imageUrl: user?.imageUrl }
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setMessage(""); setAttachment(null); setReplyTo(null);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: optimisticMsg.content || "Sent an attachment", workspaceId, teamId, attachment: optimisticMsg.attachment, tempId, replyToId: optimisticMsg.replyTo?.id }),
            });
            if (!res.ok) {
                setMessages(prev => prev.filter(m => m.tempId !== tempId));
                if (res.status === 403) showUpgradePrompt("chat");
            } else {
                const savedMsg = await res.json();
                setMessages(prev => prev.map(m => m.tempId === tempId ? { ...savedMsg, user: m.user } : m));
                markAsRead();
            }
        } catch (error) { setMessages(prev => prev.filter(m => m.tempId !== tempId)); }
    };

    const togglePin = async (msg: any) => {
        try {
            await fetch(`/api/chat?id=${msg.id}&workspaceId=${workspaceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPinned: !msg.isPinned }) });
            toast.success(msg.isPinned ? "Unpinned" : "Pinned");
        } catch (err) { toast.error("Failed to update pin"); }
    };

    const pinnedMessages = messages.filter(m => m.isPinned && !m.deletedAt);
    const latestSeenMessageMap: Record<string, string[]> = {};
    Object.entries(readReceipts).forEach(([uid, t]) => {
        let lastSeenMsgId = null;
        for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].createdAt <= t) { lastSeenMsgId = messages[i].id; break; } }
        if (lastSeenMsgId) { if (!latestSeenMessageMap[lastSeenMsgId]) latestSeenMessageMap[lastSeenMsgId] = []; latestSeenMessageMap[lastSeenMsgId].push(uid); }
    });

    return (
        <MotionWrapper className="flex flex-col h-full bg-transparent relative overflow-hidden">
             {/* Neural Background Elements */}
            <div className="absolute top-0 left-0 -z-10 w-full h-full bg-slate-50/5 dark:bg-slate-950/5 pointer-events-none" />
            <div className="absolute -top-40 -right-40 -z-10 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />

            {/* Chat Header */}
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl z-20">
                <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-600/5 flex items-center justify-center border border-indigo-500/10 shadow-lg">
                        <Hash className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">Collective Stream</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <div className={cn("h-2 w-2 rounded-full animate-pulse", isConnected ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500")} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                {isConnected ? `${onlineUsers.length} Synchronization Active` : "Connecting to Grid..."}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {pinnedMessages.length > 0 && (
                         <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
                            <Pin className="h-3 w-3 mr-2" /> {pinnedMessages.length} Pinned
                         </Badge>
                    )}
                    <div className="h-10 w-10 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 flex items-center justify-center border border-white/20">
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                    </div>
                </div>
            </div>

            {/* Pinned Bar */}
            <AnimatePresence>
                {pinnedMessages.length > 0 && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="bg-amber-500/5 border-b border-amber-500/10 backdrop-blur-xl z-10"
                    >
                        {pinnedMessages.slice(0, 1).map(msg => (
                            <div key={msg.id} className="p-4 px-8 flex items-center justify-between gap-6">
                                <div className="flex items-center gap-4 min-w-0">
                                    <Pin className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span className="text-[11px] font-black uppercase tracking-tight text-amber-600/80 truncate">
                                        Pinned Intel: {msg.content}
                                    </span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 rounded-lg" onClick={() => togglePin(msg)}>
                                    <PinOff className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar" ref={scrollRef} onScroll={handleScroll}>
                {isLoading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-20">
                        <Loader2 className="h-20 w-20 animate-spin mb-6" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Initializing Stream...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-10">
                        <MessageSquare className="h-32 w-32 mb-6" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">No collective data established.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.userId === dbUser?.id || msg.userId === user?.id;
                        const prevMsg = messages[idx - 1];
                        const isSameSender = prevMsg?.userId === msg.userId;
                        
                        return (
                            <FadeIn key={msg.id} delay={0.05} className={cn("flex group", isMe ? "justify-end" : "justify-start", isSameSender ? "mt-[-2rem]" : "mt-0")}>
                                <div className={cn("flex gap-4 max-w-[75%]", isMe ? "flex-row-reverse" : "flex-row")}>
                                    {!isSameSender ? (
                                        <div className={cn("h-12 w-12 rounded-2xl shrink-0 flex items-center justify-center text-[10px] font-black border border-white/20 shadow-2xl transition-all duration-500 hover:scale-110", isMe ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800")}>
                                            {msg.user?.name?.slice(0, 2).toUpperCase() || "U"}
                                        </div>
                                    ) : (
                                        <div className="w-12 shrink-0" />
                                    )}
                                    <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                        {!isSameSender && (
                                            <div className="flex items-center gap-3 mb-2 px-2">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{msg.user?.name || "Anonymous Node"}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{format(new Date(msg.createdAt), "HH:mm")}</span>
                                                {msg.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                                            </div>
                                        )}

                                        <div className="relative group/bubble">
                                            <div className={cn(
                                                "rounded-[2rem] px-6 py-4 text-sm backdrop-blur-3xl shadow-xl border border-white/10 transition-all duration-500",
                                                isMe 
                                                    ? "bg-indigo-600 text-white rounded-tr-none" 
                                                    : "bg-white/40 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 rounded-tl-none"
                                            )}>
                                                {msg.replyTo && (
                                                    <div className={cn("mb-3 p-3 rounded-2xl text-[10px] border-l-4", isMe ? "bg-black/10 border-white/30 text-white/70" : "bg-slate-900/10 dark:bg-slate-100/5 border-indigo-500 text-slate-500")}>
                                                        <div className="font-black uppercase tracking-tighter mb-1 flex items-center gap-2">
                                                            <Reply className="h-3 w-3" /> Replying to {msg.replyTo.userId === user?.id ? "YOU" : "NODE"}
                                                        </div>
                                                        <span className="line-clamp-2 italic">{msg.replyTo.content}</span>
                                                    </div>
                                                )}
                                                {msg.attachment && (
                                                    <div className="mb-4">
                                                        {msg.attachment.category === "image" ? (
                                                            <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block relative h-60 w-80 overflow-hidden rounded-[1.5rem] border border-white/10 hover:scale-105 transition-transform duration-700">
                                                                <Image src={msg.attachment.url} alt="Intel" fill className="object-cover" />
                                                            </a>
                                                        ) : (
                                                            <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-black/10 rounded-[1.5rem] hover:bg-black/20 transition-all">
                                                                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center"><FileText className="h-5 w-5" /></div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black truncate max-w-[150px] uppercase tracking-tighter">{msg.attachment.originalName}</span>
                                                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Secure Document</span>
                                                                </div>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</div>
                                            </div>

                                            {/* Read Receipts */}
                                            {latestSeenMessageMap[msg.id] && (
                                                <div className={cn("flex items-center gap-2 mt-2 px-2 opacity-40 hover:opacity-100 transition-opacity", isMe ? "justify-end" : "justify-start")}>
                                                    <div className="flex -space-x-1">
                                                        {latestSeenMessageMap[msg.id].map(uid => (
                                                            <div key={uid} className="h-3.5 w-3.5 rounded-full border border-white dark:border-slate-900 bg-slate-300 overflow-hidden scale-100 hover:scale-125 transition-transform">
                                                                <Image src={onlineUsers.find(u => u.id === uid)?.imageUrl || ""} fill className="object-cover" alt="seen" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className={cn("absolute top-2 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300", isMe ? "-left-12" : "-right-12")}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md hover:scale-110" onClick={() => setReplyTo(msg)}>
                                                    <Reply className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </FadeIn>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-8 border-t border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl z-20">
                {Object.keys(typingUsers).length > 0 && (
                    <div className="absolute -top-8 left-12 text-[9px] text-indigo-500 font-black uppercase tracking-[0.3em] flex items-center gap-3">
                        <div className="flex gap-1">
                            <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce" />
                            <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                        {Object.values(typingUsers)[0].name} Synchronizing...
                    </div>
                )}

                <AnimatePresence>
                    {(replyTo || attachment) && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="mb-6 flex flex-col gap-3">
                            {replyTo && (
                                <div className="flex items-center justify-between p-4 bg-indigo-600/5 border border-indigo-500/10 rounded-2xl backdrop-blur-xl">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <Reply className="h-5 w-5 text-indigo-500" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Sync Target: {replyTo.user?.name}</span>
                                            <span className="text-xs text-slate-500 truncate">{replyTo.content}</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setReplyTo(null)}><X className="h-4 w-4" /></Button>
                                </div>
                            )}
                            {attachment && (
                                <div className="flex items-center justify-between p-4 bg-purple-600/5 border border-purple-500/10 rounded-2xl backdrop-blur-xl">
                                    <div className="flex items-center gap-4">
                                        {attachment.category === "image" ? <ImageIcon className="h-5 w-5 text-purple-500" /> : <FileText className="h-5 w-5 text-purple-500" />}
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase tracking-tighter text-purple-600">{attachment.originalName}</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Assets Encrypted</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setAttachment(null)}><X className="h-4 w-4" /></Button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={sendMessage} className="flex gap-4">
                    <div className="flex-1 flex gap-3 p-2 bg-white/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-white/20 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-inner backdrop-blur-2xl">
                        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                            <DialogTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 shrink-0 h-12 w-12 rounded-full transition-colors hover:bg-indigo-600/5" disabled={!isConnected}>
                                    <Paperclip className="h-6 w-6" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[3rem] border-none bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl p-12 shadow-3xl max-w-lg">
                                <DialogHeader className="mb-8">
                                    <DialogTitle className="text-4xl font-black uppercase tracking-tighter">Inject <span className="text-indigo-600">Assets</span></DialogTitle>
                                </DialogHeader>
                                <FileUpload workspaceId={workspaceId} onUploadComplete={(data) => { setAttachment({ url: data.url || data.secure_url, originalName: data.originalName || "Intel", category: (data.url || data.secure_url).match(/\.(jpeg|jpg|gif|png|webp)$/i) ? "image" : "document" }); setIsUploadOpen(false); }} />
                            </DialogContent>
                        </Dialog>
                        <Input 
                            placeholder={isLimitReached ? "SYSTEM OVERLOAD: UPGRADE REQUIRED" : "SYNCHRONIZE WITH COLLECTIVE..."} 
                            value={message} onChange={handleInputChange} 
                            className="border-none bg-transparent shadow-none focus-visible:ring-0 text-base font-black uppercase tracking-tighter placeholder:text-[11px] placeholder:tracking-[0.3em] placeholder:opacity-30" 
                            disabled={!isConnected || isLimitReached} 
                        />
                        <Button type="submit" size="icon" disabled={!isConnected || isLimitReached || (!message.trim() && !attachment)} className="bg-indigo-600 hover:bg-indigo-700 shrink-0 h-12 w-12 rounded-full shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all">
                            {isLimitReached ? <Lock className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </div>
                </form>

                {isLimitReached && (
                    <FadeIn delay={0.1} className="mt-6 flex items-center justify-between p-6 rounded-[2rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 group overflow-hidden relative">
                         <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />
                         <div className="flex items-center gap-6">
                             <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xl shadow-lg shadow-black/20 animate-pulse">
                                <Sparkles className="h-6 w-6 text-white" />
                             </div>
                             <div className="space-y-1">
                                <h4 className="text-sm font-black uppercase tracking-[0.2em]">Enterprise Communications</h4>
                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Unlock unlimited synchronization with Theta+</p>
                             </div>
                         </div>
                         <Button variant="outline" className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-white text-indigo-600 border-none hover:scale-105 transition-all shadow-xl" onClick={() => showUpgradePrompt("chat")}>Initialize Upgrade</Button>
                    </FadeIn>
                )}
            </div>
        </MotionWrapper>
    );
}
