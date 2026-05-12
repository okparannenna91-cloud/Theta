"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Loader2, Bot, User, Trash2, Maximize2, Minimize2, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Zap, MessageSquare, ClipboardList, FileEdit, Calculator } from "lucide-react";

interface Message {
    role: "user" | "nova";
    content: string;
    timestamp: Date;
}

export function NovaAssistant() {
    const { activeWorkspaceId } = useWorkspace();
    const { showUpgradePrompt } = usePopups();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "nova",
            content: "Hi! I'm Nova, your project assistant. How can I help you get work done today?",
            timestamp: new Date(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [usage, setUsage] = useState<{ current: number; max: number } | null>(null);
    const isLimitReached = usage ? (usage.max !== -1 && usage.current >= usage.max) : false;
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchUsage = useCallback(async () => {
        try {
            const res = await fetch(`/api/billing/usage?workspaceId=${activeWorkspaceId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.nova) {
                    setUsage({
                        current: data.nova.current,
                        max: data.nova.max
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch usage:", error);
        }
    }, [activeWorkspaceId]);

    useEffect(() => {
        if (activeWorkspaceId && isOpen) {
            fetchUsage();
        }
    }, [activeWorkspaceId, isOpen, fetchUsage]);

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
            if (isLimitReached) {
                showUpgradePrompt("nova");
                return;
            }

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
                // Specific check for limit error from server
                if (res.status === 403 && (error.error?.includes("limit") || error.error?.includes("plan"))) {
                    showUpgradePrompt("nova");
                    return;
                }
                throw new Error(error.error || "Failed to get response");
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = "";
            const assistantId = "nova-" + Date.now();

            // Initial assistant message
            setMessages((prev) => [...prev, {
                role: "nova",
                content: "",
                timestamp: new Date(),
            }]);

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    accumulatedResponse += chunk;
                    
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === "nova") {
                            lastMessage.content = accumulatedResponse;
                        }
                        return newMessages;
                    });
                }
            }

            // Re-fetch usage to show updated count
            fetchUsage();
        } catch (error: any) {
            toast.error(error.message || "Nova is having trouble connecting.");
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([
            {
                role: "nova",
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
                                    <span className="font-bold text-sm tracking-tight leading-none text-white">Nova Sidebar</span>
                                    <span className="text-[10px] text-white/70 font-medium tracking-tight">V2 Neural Core Active</span>
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
                            <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
                                <div className="px-4 pt-4 border-b bg-white dark:bg-slate-900">
                                    <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                                        <TabsTrigger value="chat" className="rounded-lg text-[10px] font-black uppercase tracking-widest py-2">
                                            <MessageSquare className="w-3 h-3 mr-1.5" />
                                            Chat
                                        </TabsTrigger>
                                        <TabsTrigger value="history" className="rounded-lg text-[10px] font-black uppercase tracking-widest py-2">
                                            <History className="w-3 h-3 mr-1.5" />
                                            History
                                        </TabsTrigger>
                                        <TabsTrigger value="workflows" className="rounded-lg text-[10px] font-black uppercase tracking-widest py-2">
                                            <Zap className="w-3 h-3 mr-1.5" />
                                            Actions
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=active]:flex">
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
                                                    msg.role === "nova" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600"
                                                )}>
                                                    {msg.role === "nova" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                                </div>
                                                <div className={cn(
                                                    "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                                    msg.role === "nova"
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
                                                <span className="text-slate-500">Nova is thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <CardFooter className="p-4 border-t bg-white dark:bg-slate-900 shrink-0">
                                    <form onSubmit={handleSend} className="flex w-full items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                placeholder={isLimitReached ? "Request limit reached" : "Write anything to Nova..."}
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                className="pr-10 bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-indigo-500 h-11 rounded-xl"
                                                disabled={isLoading || isLimitReached}
                                            />
                                            <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500/50 pointer-events-none" />
                                        </div>
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={!input.trim() || isLoading || isLimitReached}
                                            className="h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none shrink-0"
                                        >
                                            <Send className="h-5 w-5" />
                                        </Button>
                                    </form>
                                </CardFooter>
                            </TabsContent>

                            <TabsContent value="history" className="flex-1 overflow-y-auto p-4 m-0">
                                <div className="space-y-4">
                                    {[
                                        { title: "Sprint Planning", date: "2 hours ago", icon: ClipboardList },
                                        { title: "Task Deconstruction", date: "Yesterday", icon: Zap },
                                        { title: "Project Spec Draft", date: "2 days ago", icon: FileEdit },
                                    ].map((item, i) => (
                                        <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm group-hover:text-indigo-500">
                                                    <item.icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{item.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="workflows" className="flex-1 overflow-y-auto p-4 m-0">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: "Summarize", icon: ClipboardList, color: "bg-blue-500", prompt: "Summarize my active tasks." },
                                        { label: "Daily Standup", icon: MessageSquare, color: "bg-emerald-500", prompt: "Prepare a daily standup for me." },
                                        { label: "Draft Spec", icon: FileEdit, color: "bg-amber-500", prompt: "Draft a technical spec for..." },
                                        { label: "Calc Velocity", icon: Calculator, color: "bg-indigo-500", prompt: "Calculate the team velocity." },
                                    ].map((action, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => {
                                                setInput(action.prompt);
                                                // We don't have a direct way to trigger send from here without refactoring
                                                // but setting input is a good start
                                            }}
                                            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-3 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
                                        >
                                            <div className={cn("p-2 rounded-xl text-white shadow-lg", action.color)}>
                                                <action.icon className="w-5 h-5" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{action.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
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
                {!isOpen && <span className="font-bold text-sm tracking-tight uppercase">Ask Nova</span>}
                {isOpen && <X className="h-6 w-6" />}
            </motion.button>
        </div>
    );
}
