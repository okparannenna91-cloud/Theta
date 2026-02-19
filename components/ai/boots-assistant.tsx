"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Loader2, Bot, User, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

interface Message {
    role: "user" | "boots";
    content: string;
    timestamp: Date;
}

export function BootsAssistant() {
    const { activeWorkspaceId } = useWorkspace();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "boots",
            content: "Hi! I'm Boots, your project assistant. How can I help you get work done today?",
            timestamp: new Date(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isMinimized]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: "user",
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: input,
                    workspaceId: activeWorkspaceId,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to get response");
            }

            const data = await res.json();

            const bootsMessage: Message = {
                role: "boots",
                content: data.text,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, bootsMessage]);
        } catch (error: any) {
            toast.error(error.message || "Boots is having trouble connecting.");
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([
            {
                role: "boots",
                content: "Chat cleared. What's next on our list?",
                timestamp: new Date(),
            },
        ]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            height: isMinimized ? "64px" : "500px",
                            width: isMinimized ? "240px" : "400px"
                        }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "mb-4 overflow-hidden rounded-2xl shadow-2xl border border-indigo-100 bg-background flex flex-col",
                            isMinimized ? "h-16" : "h-[550px] w-[90vw] sm:w-[400px]"
                        )}
                    >
                        {/* Header */}
                        <div className="p-4 bg-indigo-600 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-lg">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm tracking-tight leading-none text-white">Boots AI</span>
                                    <span className="text-[10px] text-white/70 font-medium">Always here to help</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white hover:bg-white/20"
                                    onClick={() => setIsMinimized(!isMinimized)}
                                >
                                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                                </Button>
                                {!isMinimized && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:bg-white/20"
                                        onClick={clearChat}
                                        title="Clear conversation"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white hover:bg-white/20"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Messages */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50"
                                >
                                    {messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "flex w-full",
                                                msg.role === "user" ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex gap-2 max-w-[85%]",
                                                msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                            )}>
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full shrink-0 flex items-center justify-center",
                                                    msg.role === "boots" ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-600"
                                                )}>
                                                    {msg.role === "boots" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                                </div>
                                                <div className={cn(
                                                    "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                                    msg.role === "boots"
                                                        ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-indigo-50 dark:border-indigo-900/30 rounded-tl-none"
                                                        : "bg-indigo-600 text-white rounded-tr-none"
                                                )}>
                                                    {msg.content}
                                                    <div className={cn(
                                                        "text-[9px] mt-1 opacity-50 font-medium",
                                                        msg.role === "user" ? "text-right" : "text-left"
                                                    )}>
                                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="flex gap-2 items-center bg-white dark:bg-slate-800 border border-indigo-50 dark:border-indigo-900/30 rounded-2xl rounded-tl-none px-4 py-2 text-sm shadow-sm">
                                                <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                                                <span className="text-slate-500">Boots is thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <CardFooter className="p-4 border-t bg-white dark:bg-slate-900 shrink-0">
                                    <form onSubmit={handleSend} className="flex w-full items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                placeholder="Write anything to Boots..."
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                className="pr-10 bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-indigo-500 h-11 rounded-xl"
                                                disabled={isLoading}
                                            />
                                            <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500/50 pointer-events-none" />
                                        </div>
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={!input.trim() || isLoading}
                                            className="h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none shrink-0"
                                        >
                                            <Send className="h-5 w-5" />
                                        </Button>
                                    </form>
                                </CardFooter>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 h-14 px-5 rounded-full shadow-2xl transition-all z-50",
                    isOpen
                        ? "bg-slate-900 text-white"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                )}
            >
                <div className="relative">
                    <Sparkles className="h-6 w-6" />
                    {!isOpen && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                        </span>
                    )}
                </div>
                {!isOpen && <span className="font-bold text-sm tracking-tight uppercase">Ask Boots</span>}
                {isOpen && <X className="h-6 w-6" />}
            </motion.button>
        </div>
    );
}
