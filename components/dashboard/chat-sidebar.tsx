"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as Ably from "ably";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Loader2, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";

interface ChatMessage {
    id: string;
    content: string;
    userId: string;
    user?: { name?: string; imageUrl?: string };
    createdAt: string;
}

export function ChatSidebar({ workspaceId }: { workspaceId?: string }) {
    const { user } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const ablyRef = useRef<Ably.Realtime | null>(null);
    const channelRef = useRef<Ably.RealtimeChannel | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const ablyFetchToken = useCallback(async () => {
        if (!workspaceId) throw new Error("No workspace selected");
        const res = await fetch(`/api/ably/token?workspaceId=${encodeURIComponent(workspaceId)}`);
        if (!res.ok) throw new Error("Failed to fetch Ably token");
        return res.json();
    }, [workspaceId]);

    const connectAbly = useCallback(async () => {
        try {
            setIsLoading(true);
            setConnectionError(null);

            const ably = new Ably.Realtime({
                authCallback: async (_data, callback) => {
                    try {
                        const freshToken = await ablyFetchToken();
                        callback(null, freshToken);
                    } catch (err) {
                        callback(String(err), null);
                    }
                }
            });

            ably.connection.on("connected", () => {
                setIsConnected(true);
                setIsLoading(false);
            });

            ably.connection.on("failed", () => {
                setConnectionError("Connection failed. Check your network and try again.");
                setIsLoading(false);
            });

            ably.connection.on("disconnected", () => {
                setConnectionError("Connection lost. Attempting to reconnect...");
            });

            const channelName = `workspace:${workspaceId}:chat`;
            const channel = ably.channels.get(channelName);

            channel.subscribe("message", (msg) => {
                setMessages((prev) => [...prev, msg.data]);
            });

            ablyRef.current = ably;
            channelRef.current = channel;

            // Fetch history
            const historyRes = await fetch(`/api/chat?workspaceId=${workspaceId}`);
            const history = await historyRes.json();
            if (Array.isArray(history)) {
                setMessages(history);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Failed to connect to chat";
            setConnectionError(msg);
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        if (isOpen && workspaceId && !ablyRef.current) {
            setConnectionError(null);
            connectAbly();
        }
        return () => {
            if (ablyRef.current) {
                ablyRef.current.close();
                ablyRef.current = null;
            }
        };
    }, [isOpen, workspaceId, connectAbly]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !workspaceId) return;

        const content = message;

        if (content.startsWith("/nova ")) {
            const novaPrompt = content.slice(6);
            setMessage("");
            window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: novaPrompt } }));
            return;
        }

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    workspaceId,
                }),
            });
            if (res.ok) {
                setMessage("");
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    return (
        <>
            <Button
                className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-2xl z-50 bg-indigo-600 hover:bg-indigo-700"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
            >
                <MessageSquare className="h-6 w-6" />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] z-50"
                    >
                        <Card className="h-full flex flex-col shadow-2xl border-indigo-100">
                            <CardHeader className="flex flex-row items-center justify-between py-4 border-b bg-indigo-50/50">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-900">
                                        Workspace Chat
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-indigo-600 hover:text-indigo-800"
                                        onClick={() => window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "" } }))}
                                        title="Ask Nova"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                                {connectionError && (
                                    <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                                        <p className="text-xs text-red-600 flex items-center gap-1">
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                                            {connectionError}
                                        </p>
                                    </div>
                                )}
                                <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
                                    <div className="space-y-4">
                                        {messages.map((msg, i) => {
                                            const isMe = msg.userId === user?.id;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe
                                                            ? "bg-indigo-600 text-white rounded-tr-none"
                                                            : "bg-slate-100 text-slate-900 rounded-tl-none"
                                                            }`}
                                                    >
                                                        {!isMe && (
                                                            <p className="text-[10px] font-bold mb-1 opacity-70 uppercase">
                                                                {msg.user?.name || "User"}
                                                            </p>
                                                        )}
                                                        <p>{msg.content}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="p-4 border-t bg-white">
                                    <form onSubmit={sendMessage} className="flex gap-2">
                                        <Input
                                            placeholder="Type a message... (/nova to ask AI)"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            className="bg-slate-50 border-none focus-visible:ring-indigo-500"
                                        />
                                        <Button type="submit" size="icon" disabled={!isConnected} className="bg-indigo-600 hover:bg-indigo-700">
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
