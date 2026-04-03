"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as Ably from "ably";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, User, Hash, MessageSquare, Paperclip, X, FileText, ImageIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { FileUpload } from "@/components/common/file-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePopups } from "@/components/popups/popup-manager";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles } from "lucide-react";

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
    const [limits, setLimits] = useState({ current: 0, max: -1 });
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [dbUser, setDbUser] = useState<any>(null);
    const ablyRef = useRef<Ably.Realtime | null>(null);
    const channelRef = useRef<Ably.RealtimeChannel | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch("/api/auth/me")
            .then(res => res.json())
            .then(data => setDbUser(data))
            .catch(err => console.error("Failed to fetch DB user profile:", err));
    }, []);

    const connectAbly = useCallback(async () => {
        if (!user?.id || !teamId) return;

        try {
            setIsLoading(true);
            setIsConnected(false);
            console.log(`[Chat] Connecting to Ably for team: ${teamId}, clientId: ${user.id}`);
            
            // Cleanup existing connection if any
            if (ablyRef.current) {
                console.log("[Chat] Closing existing Ably connection");
                ablyRef.current.close();
            }

            const ably = new Ably.Realtime({
                authUrl: "/api/ably/token",
                clientId: user.id
            });

            const channelName = `team:${teamId}:chat`;
            const channel = ably.channels.get(channelName);

            ably.connection.on("connected", () => {
                console.log("[Chat] Ably Connected Successfully");
                setIsConnected(true);
                setIsLoading(false);
            });

            ably.connection.on("disconnected", () => {
                console.warn("[Chat] Ably Disconnected");
                setIsConnected(false);
            });

            ably.connection.on("failed", (err) => {
                console.error("[Chat] Ably Connection Failed:", err);
                setIsConnected(false);
                setIsLoading(false);
            });

            channel.subscribe("message", (msg) => {
                console.log("[Chat] Received message via Ably:", msg.data);
                setMessages((prev) => {
                    const incoming = msg.data;
                    // Check if this message (or its optimistic counterpart) already exists
                    const exists = prev.some(m => 
                        m.id === incoming.id || 
                        (incoming.tempId && m.tempId === incoming.tempId)
                    );
                    
                    if (exists) {
                        // Replace optimistic message with actual server message
                        return prev.map(m => 
                            (incoming.tempId && m.tempId === incoming.tempId) ? incoming : m
                        );
                    }
                    return [...prev, incoming];
                });
            });

            ablyRef.current = ably;
            channelRef.current = channel;

            // Fetch history
            const historyRes = await fetch(`/api/chat?teamId=${teamId}`);
            if (historyRes.ok) {
                const data = await historyRes.json();
                if (data.messages && Array.isArray(data.messages)) {
                    setMessages(data.messages);
                    if (data.limits) setLimits(data.limits);
                }
            }
        } catch (error) {
            console.error("[Chat] Ably setup error:", error);
            setIsLoading(false);
        }
    }, [teamId, user?.id]);

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
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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
        const tempId = Date.now().toString();

        // Optimistic update
        const optimisticMsg = {
            id: tempId,
            tempId,
            content,
            userId: user?.id,
            attachment: currentAttachment,
            createdAt: new Date().toISOString(),
            user: {
                name: user?.fullName || user?.firstName || "You",
                imageUrl: user?.imageUrl
            }
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setMessage("");
        setAttachment(null);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: content || (currentAttachment ? "Sent an attachment" : ""),
                    workspaceId,
                    teamId,
                    attachment: currentAttachment,
                    tempId // Pass tempId to identify message back from Ably
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                // Rollback on error
                setMessages(prev => prev.filter(m => m.id !== tempId));
                
                if (res.status === 403 && error.error?.includes("limit")) {
                    showUpgradePrompt("chat");
                    return;
                }
                import("sonner").then(({ toast }) => toast.error("Failed to send message"));
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            import("sonner").then(({ toast }) => toast.error("Failed to send message"));
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
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
                                {isConnected ? "Live" : "Connecting..."}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
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
                    messages.map((msg) => {
                        const isMe = msg.userId === dbUser?.id || msg.userId === user?.id; // Fallback to Clerk ID just in case
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`flex gap-2 max-w-[80%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${isMe ? "bg-purple-600 text-white" : "bg-slate-200 dark:bg-slate-800"}`}>
                                        {msg.user?.name?.slice(0, 2).toUpperCase() || "U"}
                                    </div>
                                    <div>
                                        {!isMe && (
                                            <p className="text-[10px] font-bold mb-1 ml-1 text-muted-foreground">
                                                {msg.user?.name || "User"}
                                            </p>
                                        )}
                                        <div
                                            className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe
                                                ? "bg-purple-600 text-white rounded-tr-none"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none"
                                                }`}
                                        >
                                            {msg.attachment && (
                                                <div className="mb-2">
                                                    {msg.attachment.category === "image" ? (
                                                        <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block relative h-48 w-full overflow-hidden rounded-lg">
                                                            <Image
                                                                src={msg.attachment.url}
                                                                alt="Attachment"
                                                                fill
                                                                className="object-cover"
                                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                            />
                                                        </a>
                                                    ) : (
                                                        <a
                                                            href={msg.attachment.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition-colors"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                            <span className="truncate max-w-[150px]">{msg.attachment.originalName}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50">
                {attachment && (
                    <div className="mb-2 flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                        <div className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
                            {attachment.category === "image" ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            <span className="truncate">{attachment.originalName}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full" onClick={() => setAttachment(null)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}
                <form onSubmit={sendMessage} className="flex gap-2">
                    <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                        <DialogTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-slate-500 hover:text-purple-600 shrink-0"
                                disabled={!isConnected}
                            >
                                <Paperclip className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Upload Attachment</DialogTitle>
                            </DialogHeader>
                            <FileUpload
                                onChange={(url) => {
                                    setAttachment({
                                        url,
                                        originalName: "Attachment",
                                        category: url.match(/\.(jpeg|jpg|gif|png)$/) ? "image" : "document"
                                    });
                                    setIsUploadOpen(false);
                                }}
                                onRemove={() => setAttachment(null)}
                            />
                        </DialogContent>
                    </Dialog>
                    <Input
                        placeholder={isLimitReached ? "Chat limit reached. Upgrade to continue." : attachment ? "Add a comment..." : "Type a message to your team..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500"
                        disabled={!isConnected || isLimitReached}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!isConnected || isLimitReached || (!message.trim() && !attachment)}
                        className="bg-purple-600 hover:bg-purple-700 shrink-0"
                    >
                        {isLimitReached ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
                {isLimitReached && (
                    <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-bottom-2">
                         <div className="flex items-center gap-2">
                             <Sparkles className="h-3 w-3 text-indigo-600" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Upgrade to unlock more messages</span>
                         </div>
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[9px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg px-3"
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
