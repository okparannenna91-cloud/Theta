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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mic, Paperclip, FileIcon, Volume2, MessageSquare, History, Zap, ClipboardList, FileEdit, Calculator } from "lucide-react";
import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';

const novaAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(createAvatar(notionists, {
    seed: 'Aneka',
    backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9'],
}).toString())}`;

const userAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(createAvatar(notionists, {
    seed: 'Felix',
    backgroundColor: ['f1f5f9'],
}).toString())}`;

interface Message {
    role: "user" | "nova";
    content: string;
    timestamp: Date;
    attachments?: Array<{ name: string; type: string; url: string }>;
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
    const [isListening, setIsListening] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            toast.error("Speech recognition not supported in this browser.");
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };

        recognition.start();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setAttachedFiles(prev => [...prev, ...files]);
            toast.success(`Attached ${files.length} file(s)`);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

        const userMessage: Message = {
            role: "user",
            content: input,
            timestamp: new Date(),
            attachments: attachedFiles.map(f => ({ name: f.name, type: f.type, url: "" })) // Placeholder
        };

        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input;
        setInput("");
        setAttachedFiles([]);
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
                    prompt: currentInput,
                    workspaceId: activeWorkspaceId,
                    // We'll handle file uploads properly in a later phase (Phase 2 Action Engine)
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
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            height: isMinimized ? "72px" : "600px",
                            width: isMinimized ? "280px" : "450px"
                        }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "mb-4 overflow-hidden rounded-lg shadow-lg border border-white/20 backdrop-blur-2xl bg-white/90 dark:bg-slate-950/90 flex flex-col",
                            isMinimized ? "h-18" : "h-[600px] w-[95vw] sm:w-[450px]"
                        )}
                    >
                        {/* Header */}
                        <div className="p-5 bg-primary text-white flex items-center justify-between shrink-0 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                                    <Sparkles className="h-5 w-5 text-white animate-pulse" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-extrabold text-base tracking-tight leading-tight">Nova Intelligence</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[10px] text-white/80 font-medium">AI Connected</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-md text-white hover:bg-white/20 transition-all"
                                    onClick={() => setIsMinimized(!isMinimized)}
                                >
                                    {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-md text-white hover:bg-rose-500 transition-all"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
                                <div className="px-6 pt-5 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-transparent">
                                    <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg p-1.5 border border-slate-200/50 dark:border-slate-800/50">
                                        <TabsTrigger value="chat" className="rounded-lg text-xs font-medium py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                                            Chat
                                        </TabsTrigger>
                                        <TabsTrigger value="history" className="rounded-lg text-xs font-medium py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                                            Recall
                                        </TabsTrigger>
                                        <TabsTrigger value="workflows" className="rounded-lg text-xs font-medium py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                                            Actions
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=active]:flex">
                                    {/* Messages with Professional Styling */}
                                    <div
                                        ref={scrollRef}
                                        className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/30 scrollbar-hide"
                                    >
                                    {messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "flex w-full animate-in fade-in slide-in-from-bottom-3 duration-500",
                                                msg.role === "user" ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex gap-3 max-w-[88%]",
                                                msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                            )}>
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg shrink-0 flex items-center justify-center overflow-hidden shadow-md border-2",
                                                    msg.role === "nova" ? "border-primary/10 bg-white" : "border-slate-100 bg-slate-50"
                                                )}>
                                                    <Image 
                                                        src={msg.role === "nova" ? novaAvatar : userAvatar} 
                                                        alt={msg.role} 
                                                        width={40} 
                                                        height={40}
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className={cn(
                                                        "rounded-lg px-5 py-3.5 text-[14px] leading-relaxed shadow-sm",
                                                        msg.role === "nova"
                                                            ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none prose prose-slate dark:prose-invert max-w-none shadow-[0_4px_15px_rgba(0,0,0,0.03)]"
                                                            : "bg-primary text-white rounded-tr-none shadow-sm"
                                                    )}>
                                                        {msg.role === "nova" ? (
                                                            <ReactMarkdown 
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    table: ({ children }) => (
                                                                        <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                                                                            <table className="w-full text-[12px] border-collapse bg-white dark:bg-slate-900">
                                                                                {children}
                                                                            </table>
                                                                        </div>
                                                                    ),
                                                                    th: ({ children }) => <th className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-left border-b border-slate-200 dark:border-slate-700">{children}</th>,
                                                                    td: ({ children }) => <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">{children}</td>,
                                                                    a: ({ children, href }) => <a href={href} className="text-primary font-medium hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                                                                    strong: ({ children }) => <strong className="font-semibold text-primary bg-primary/10 px-1 rounded">{children}</strong>
                                                                }}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        ) : (
                                                            msg.content
                                                        )}

                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                                                                {msg.attachments.map((file, idx) => (
                                                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                                                                        <FileIcon className="w-3.5 h-3.5 text-primary" />
                                                                        <span>{file.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "text-[10px] px-2 opacity-40 font-medium",
                                                        msg.role === "user" ? "text-right" : "text-left"
                                                    )}>
                                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start animate-pulse">
                                            <div className="flex gap-3 items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg rounded-tl-none px-5 py-3 shadow-sm">
                                                <div className="flex gap-1">
                                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce"></span>
                                                </div>
                                                <span className="text-xs font-medium text-muted-foreground">Analyzing...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Modern Footer */}
                                <CardFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 flex flex-col gap-4">
                                    {attachedFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-2 w-full animate-in slide-in-from-bottom-2">
                                            {attachedFiles.map((file, i) => (
                                                <div key={i} className="group relative flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg text-xs font-medium text-primary">
                                                    <Paperclip className="w-3.5 h-3.5" />
                                                    <span className="truncate max-w-[120px]">{file.name}</span>
                                                    <button 
                                                        onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <form onSubmit={handleSend} className="flex w-full items-center gap-3">
                                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg">
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                onChange={handleFileUpload}
                                                multiple
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-lg text-slate-400 hover:text-primary hover:bg-white transition-all"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Paperclip className="h-5 w-5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "h-10 w-10 rounded-lg transition-all",
                                                    isListening ? "text-rose-500 bg-rose-500/10 animate-pulse" : "text-slate-400 hover:text-primary hover:bg-white"
                                                )}
                                                onClick={startListening}
                                            >
                                                <Mic className="h-5 w-5" />
                                            </Button>
                                        </div>
                                        <div className="relative flex-1 group">
                                            <Input
                                                placeholder={isLimitReached ? "Limit reached" : "Ask Nova..."}
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                className="pr-10 bg-slate-100/50 dark:bg-slate-900/50 border-transparent focus-visible:ring-primary h-12 rounded-lg text-sm font-medium transition-all group-hover:bg-slate-100"
                                                disabled={isLoading || isLimitReached}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 pointer-events-none group-focus-within:border-primary transition-colors">
                                                <ArrowUpCircle className={cn("h-3.5 w-3.5 transition-colors", input.trim() ? "text-primary" : "text-slate-300")} />
                                            </div>
                                        </div>
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || isLimitReached}
                                            className="h-12 w-12 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm transition-all active:scale-95 shrink-0"
                                        >
                                            <Send className="h-5 w-5" />
                                        </Button>
                                    </form>
                                </CardFooter>
                            </TabsContent>

                            <TabsContent value="history" className="flex-1 overflow-y-auto p-6 m-0 bg-slate-50/30">
                                <div className="space-y-4">
                                    {[
                                        { title: "Sprint Planning", date: "2 hours ago", icon: ClipboardList, color: "text-blue-500" },
                                        { title: "Task Deconstruction", date: "Yesterday", icon: Zap, color: "text-rose-500" },
                                        { title: "Project Spec Draft", date: "2 days ago", icon: FileEdit, color: "text-amber-500" },
                                    ].map((item, i) => (
                                        <div key={i} className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-primary/5 transition-colors">
                                                        <item.icon className={cn("w-5 h-5", item.color)} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{item.title}</span>
                                                        <span className="text-[11px] text-muted-foreground font-medium">{item.date}</span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="rounded-lg hover:bg-primary/5">
                                                    <Maximize2 className="w-4 h-4 text-slate-300" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="workflows" className="flex-1 overflow-y-auto p-6 m-0 bg-slate-50/30">
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: "Summarize", icon: ClipboardList, color: "bg-primary/10 text-primary", prompt: "Summarize my active tasks." },
                                        { label: "Daily Standup", icon: MessageSquare, color: "bg-emerald-500/10 text-emerald-500", prompt: "Prepare a daily standup for me." },
                                        { label: "Draft Spec", icon: FileEdit, color: "bg-amber-500/10 text-amber-500", prompt: "Draft a technical spec for..." },
                                        { label: "Calc Velocity", icon: Calculator, color: "bg-purple-500/10 text-purple-500", prompt: "Calculate the team velocity." },
                                    ].map((action, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setInput(action.prompt)}
                                            className="p-5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-4 hover:border-primary/50 hover:shadow-md transition-all active:scale-95 group"
                                        >
                                            <div className={cn("h-14 w-14 rounded-lg flex items-center justify-center shadow-sm", action.color)}>
                                                <action.icon className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{action.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8">
                                    <div className="flex items-center justify-between mb-5 px-2">
                                        <h4 className="text-xs font-medium text-muted-foreground">Blueprints</h4>
                                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-4" />
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { name: "Bug Report Architect", desc: "Structured bug reproduction steps", icon: Bot },
                                            { name: "Sprint Planner", desc: "Generate milestones and tasks", icon: Zap },
                                            { name: "PRD Drafter", desc: "Draft a full product requirement doc", icon: FileEdit },
                                        ].map((t, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => setInput(`${t.name}: `)}
                                                className="w-full p-4 text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-primary/5 dark:hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center gap-4"
                                            >
                                                <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                    <t.icon className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-extrabold text-slate-900 dark:text-white leading-none mb-1">{t.name}</p>
                                                    <p className="text-[11px] text-slate-400 font-medium">{t.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </motion.div>
            )}
        </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-3 h-16 px-7 rounded-lg shadow-sm transition-all z-50 border-2 border-white/20 backdrop-blur-md",
                    isOpen
                        ? "bg-slate-900 text-white"
                        : "bg-primary text-white"
                )}
            >
                <div className="relative">
                    <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-lg flex items-center justify-center border border-white/30">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    {!isOpen && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white"></span>
                        </span>
                    )}
                </div>
                                {!isOpen && <span className="font-semibold text-sm">Nova AI</span>}
                {isOpen && <X className="h-6 w-6" />}
            </motion.button>
        </div>
    );
}
