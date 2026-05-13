"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, User, Loader2, Copy, RefreshCw, Trash2, CheckCircle2, FileText, ChevronRight, Paperclip, X, Target, Layout, Mic, MicOff, Terminal, Eraser, ListTodo, BookOpen } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark as syntaxStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, BarChart3, Settings2, PieChart, Zap as SprintIcon } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
}

interface NovaChatViewProps {
    conversationId: string | null;
    workspaceId: string;
}

export function NovaChatView({ conversationId, workspaceId }: NovaChatViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [attachment, setAttachment] = useState<{ url: string, type: string, name: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
    const [isListening, setIsListening] = useState(false);
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [activeTab, setActiveTab] = useState("chat");
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Speech recognition not supported in this browser");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            toast.info("Nova is listening...");
        };

        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result: any) => result.transcript)
                .join("");
            setInput(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                toast.error("Microphone access denied. Please check your browser settings.");
            } else {
                toast.error("Voice input error. Please try again.");
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const SLASH_COMMANDS = [
        { icon: ListTodo, label: "Create Task", command: "/task ", description: "Turn this thought into a task" },
        { icon: BookOpen, label: "Summarize", command: "/summarize", description: "Summarize the current view" },
        { icon: Eraser, label: "Clear Chat", command: "/clear", description: "Reset the conversation" },
        { icon: Terminal, label: "Debug", command: "/debug", description: "Show system diagnostics" },
    ];

    const fetchMessages = useCallback(async () => {
        try {
            const res = await fetch(`/api/ai/conversations/${conversationId}?workspaceId=${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error("Failed to fetch messages");
        }
    }, [conversationId, workspaceId]);

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects?workspaceId=${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects || []);
            }
        } catch (error) {
            console.error("Failed to fetch projects");
        }
    }, [workspaceId]);

    useEffect(() => {
        if (conversationId) {
            fetchMessages();
        } else {
            setMessages([]);
        }
        if (workspaceId) {
            fetchProjects();
        }

        // Handle prompt from URL for Command Palette AI
        const params = new URLSearchParams(window.location.search);
        const urlPrompt = params.get("prompt");
        if (urlPrompt && !isLoading) {
            setInput(urlPrompt);
            // Optional: auto-send
            // handleSend(urlPrompt); 
        }
    }, [conversationId, workspaceId, fetchMessages, fetchProjects, isLoading]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput("");
        setIsLoading(true);

        // Optimistic update
        const tempId = Date.now().toString();
        setMessages(prev => [...prev, { id: tempId, role: "user", content: userMessage, createdAt: new Date().toISOString() }]);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15s for actions

            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    prompt: userMessage,
                    workspaceId,
                    conversationId,
                    projectId: selectedProjectId !== "all" ? selectedProjectId : undefined,
                    imageUrl: attachment?.type.startsWith("image") ? attachment.url : undefined
                })
            });

            clearTimeout(timeoutId);
            setAttachment(null);

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || `Connection failed with status ${res.status}`);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = "";
            const assistantId = "nova-" + Date.now();

            // Initial assistant bubble with "Thinking" state
            setMessages(prev => [...prev, { 
                id: assistantId, 
                role: "assistant", 
                content: "thinking...", 
                createdAt: new Date().toISOString() 
            }]);

            if (reader) {
                let firstChunk = true;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    if (firstChunk) {
                        accumulatedResponse = chunk;
                        firstChunk = false;
                    } else {
                        accumulatedResponse += chunk;
                    }
                    
                    setMessages(prev => prev.map(m => 
                        m.id === assistantId ? { ...m, content: accumulatedResponse } : m
                    ));
                }

                // If stream was empty, show a fallback message
                if (!accumulatedResponse) {
                    setMessages(prev => prev.map(m => 
                        m.id === assistantId ? { ...m, content: "Nova is taking her time to architect this perfectly. Please stay on this page; she'll be with you shortly." } : m
                    ));
                }
            }
        } catch (error: any) {
            console.error("Failed to send message:", error);
            toast.error(error.message || "Nova connection lost");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setAttachment({
                    url: data.url,
                    type: file.type,
                    name: file.name
                });
                toast.success(`File attached: ${file.name}`);
            }
        } catch (error) {
            toast.error("Failed to upload file");
        } finally {
            setIsUploading(false);
        }
    };

    const convertToTask = async (content: string) => {
        if (isLoading) return;
        
        toast.promise(
            (async () => {
                setIsLoading(true);
                const res = await fetch("/api/ai", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: `/task Create a task from this content: ${content.substring(0, 500)}`,
                        workspaceId,
                        conversationId,
                        projectId: selectedProjectId !== "all" ? selectedProjectId : undefined
                    })
                });

                if (!res.ok) throw new Error("Failed to convert");
                
                // We don't need to read the stream here, the AI will just execute the tool
                // But we should refresh the messages
                await fetchMessages();
                setIsLoading(false);
            })(),
            {
                loading: 'Nova is architecting your task...',
                success: 'Task created and added to your workspace!',
                error: 'Failed to convert to task',
            }
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative selection:bg-indigo-500/30">
            {/* Header */}
            <div className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl z-40 relative">
                <div className="h-24 flex items-center justify-between px-10">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 group relative overflow-hidden neural-glow cursor-pointer transition-transform duration-500 hover:scale-105 active:scale-95">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Sparkles className="w-7 h-7 group-hover:rotate-12 transition-transform duration-500 floating" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] leading-tight">Nova Intelligence</h2>
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                                </div>
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] opacity-90">Neural Link Active</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl p-1.5 border border-slate-200/50 dark:border-slate-700/50">
                            <Button 
                                variant={selectedProjectId === "all" ? "secondary" : "ghost"} 
                                size="sm" 
                                onClick={() => setSelectedProjectId("all")}
                                className="h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Layout className="w-3.5 h-3.5 mr-2" />
                                Global Architecture
                            </Button>
                        </div>
                        <Button variant="ghost" size="sm" className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all">
                            <Copy className="w-4 h-4 mr-2" />
                            Protocol Export
                        </Button>
                    </div>
                </div>

                {/* Multi-Mode Tabs */}
                <div className="px-10 pb-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl h-14 border border-slate-200/50 dark:border-slate-800/50">
                            {[
                                { value: "chat", icon: MessageSquare, label: "Neural Chat" },
                                { value: "tasks", icon: ListTodo, label: "Task OS" },
                                { value: "docs", icon: FileText, label: "Knowledge" },
                                { value: "sprint", icon: SprintIcon, label: "Execution" },
                                { value: "reports", icon: BarChart3, label: "Diagnostics" },
                                { value: "analytics", icon: PieChart, label: "Intelligence" },
                                { value: "automations", icon: Settings2, label: "Synthetics" },
                            ].map((tab) => (
                                <TabsTrigger 
                                    key={tab.value}
                                    value={tab.value} 
                                    className="rounded-xl px-6 text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-2xl data-[state=active]:shadow-indigo-500/10 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all duration-300"
                                >
                                    <tab.icon className="w-3.5 h-3.5 mr-2" />
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0 data-[state=active]:flex relative">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-12 flex flex-col space-y-16 scrollbar-hide">
                        {messages.length === 0 && !isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-12 py-20">
                                <div className="relative group cursor-pointer">
                                    <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-20 rounded-full animate-pulse group-hover:opacity-40 transition-opacity duration-1000" />
                                    <div className="w-32 h-32 rounded-[3rem] bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-200/50 dark:border-slate-800/50 relative z-10 shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                                        <Sparkles className="w-16 h-16 text-slate-200 dark:text-slate-800 group-hover:text-indigo-500 transition-colors duration-700 floating" />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1]">
                                        Architect your project <br/> with <span className="text-indigo-600 neural-glow px-4 py-1 rounded-2xl bg-indigo-600/5">Nova</span>
                                    </h3>
                                    <p className="text-xl font-medium text-slate-500 leading-relaxed max-w-xl mx-auto opacity-80">
                                        The next-generation Task OS is online. Design workflows, automate execution, and synthesize deep workspace data.
                                    </p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-4">
                                    {[
                                        { label: "Initialize Sprint", icon: Target },
                                        { label: "Audit Backlog", icon: ListTodo },
                                        { label: "Generate Blueprint", icon: BookOpen }
                                    ].map((suggestion) => (
                                        <button 
                                            key={suggestion.label}
                                            onClick={() => setInput(suggestion.label)}
                                            className="group px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-indigo-500 hover:text-indigo-500 transition-all shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 flex items-center gap-3"
                                        >
                                            <suggestion.icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                            {suggestion.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((m) => (
                                <div key={m.id} className={cn(
                                    "flex gap-8 max-w-5xl mx-auto group animate-in fade-in slide-in-from-bottom-8 duration-700",
                                    m.role === "user" ? "flex-row-reverse" : "flex-row"
                                )}>
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                                        m.role === "user" 
                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700" 
                                            : "bg-indigo-600 text-white shadow-indigo-500/30 neural-glow"
                                    )}>
                                        {m.role === "user" ? <User className="w-7 h-7" /> : <Sparkles className="w-7 h-7 floating" />}
                                    </div>
                                    <div className={cn(
                                        "flex flex-col gap-4",
                                        m.role === "user" ? "items-end max-w-[75%]" : "items-start max-w-[85%]"
                                    )}>
                                        <div className={cn(
                                            "p-10 rounded-[2.5rem] text-[15px] font-medium leading-relaxed shadow-sm border transition-all duration-500 relative group/bubble",
                                            m.role === "user" 
                                                ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tr-none" 
                                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-tl-none group-hover:shadow-2xl group-hover:shadow-indigo-500/10 group-hover:border-indigo-500/30"
                                        )}>
                                            {m.content === "thinking..." ? (
                                                <div className="flex items-center gap-3 py-2">
                                                    <div className="flex gap-1.5">
                                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/60 ml-4">Neural Synthesis In Progress</span>
                                                </div>
                                            ) : (
                                                <div className="prose dark:prose-invert prose-sm max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-headings:text-[11px] prose-headings:tracking-[0.2em] prose-headings:text-slate-400 prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:p-0 prose-pre:rounded-3xl prose-pre:border prose-pre:border-white/5">
                                                    <ReactMarkdown 
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            table: ({ children }) => (
                                                                <div className="my-8 overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-2xl shadow-slate-200/20 dark:shadow-none">
                                                                    <table className="w-full border-collapse bg-white dark:bg-slate-950 text-left text-sm">
                                                                        {children}
                                                                    </table>
                                                                </div>
                                                            ),
                                                            thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-900/50">{children}</thead>,
                                                            th: ({ children }) => <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500">{children}</th>,
                                                            td: ({ children }) => <td className="px-8 py-5 border-t border-slate-100 dark:border-slate-900 text-slate-600 dark:text-slate-400 font-bold">{children}</td>,
                                                            code: ({ node, inline, className, children, ...props }: any) => {
                                                                const match = /language-(\w+)/.exec(className || "");
                                                                return !inline && match ? (
                                                                    <div className="relative group/code my-8">
                                                                        <div className="absolute right-6 top-6 opacity-0 group-hover/code:opacity-100 transition-all duration-500 z-10 translate-y-2 group-hover/code:translate-y-0">
                                                                            <Button 
                                                                                variant="secondary" 
                                                                                size="icon" 
                                                                                className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white border border-white/10 shadow-2xl"
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
                                                                                    toast.success("Intelligence Copied");
                                                                                }}
                                                                            >
                                                                                <Copy className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                        <SyntaxHighlighter
                                                                            style={syntaxStyle}
                                                                            language={match[1]}
                                                                            PreTag="div"
                                                                            className="rounded-3xl !bg-slate-950 !p-8 !m-0 border border-white/5 shadow-2xl font-mono text-[13px] leading-relaxed"
                                                                            {...props}
                                                                        >
                                                                            {String(children).replace(/\n$/, "")}
                                                                        </SyntaxHighlighter>
                                                                    </div>
                                                                ) : (
                                                                    <code className="bg-indigo-500/10 dark:bg-indigo-500/20 px-2 py-0.5 rounded-lg font-black text-indigo-600 dark:text-indigo-400 text-[12px]" {...props}>
                                                                        {children}
                                                                    </code>
                                                                )
                                                            }
                                                        }}
                                                    >
                                                        {m.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}

                                            {m.role === "assistant" && m.content.length > 50 && (
                                                <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-3 opacity-0 group-hover/bubble:opacity-100 transition-all duration-500 translate-y-2 group-hover/bubble:translate-y-0">
                                                    {[
                                                        { label: "Task", icon: CheckCircle2, color: "emerald", action: () => convertToTask(m.content) },
                                                        { label: "Deconstruct", icon: ListTodo, color: "blue", action: () => setInput(`/breakdown ${m.content.substring(0, 100)}...`) },
                                                        { label: "Estimate", icon: RefreshCw, color: "amber", action: () => setInput(`Estimate time for: ${m.content.substring(0, 100)}...`) },
                                                        { label: "Broadcast", icon: Send, color: "purple", action: () => setInput(`/share Thread synthesis for workspace.`) },
                                                    ].map((tool) => (
                                                        <Button 
                                                            key={tool.label}
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={tool.action}
                                                            className={cn(
                                                                "h-10 px-5 rounded-2xl border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-2.5",
                                                                `hover:border-${tool.color}-500 hover:text-${tool.color}-500 hover:bg-${tool.color}-500/5`
                                                            )}
                                                        >
                                                            <tool.icon className="w-3.5 h-3.5" />
                                                            {tool.label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && messages[messages.length-1]?.role !== "assistant" && (
                            <div className="flex gap-8 max-w-5xl mx-auto animate-pulse">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-white flex items-center justify-center border border-indigo-500/20">
                                    <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-10 rounded-[2.5rem] rounded-tl-none flex items-center gap-3">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                        <div className="h-48 flex-shrink-0" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50/95 dark:via-slate-950/95 to-transparent z-50">
                        <div className="max-w-4xl mx-auto flex flex-col gap-6">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-[2.5rem] blur-2xl opacity-10 group-focus-within:opacity-30 transition-opacity duration-1000 animate-pulse" />
                                <div className="relative z-10">
                                    <textarea 
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Architect your next brilliant move..."
                                        rows={1}
                                        className="w-full bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 rounded-[2.2rem] px-12 py-8 pr-24 text-base font-bold focus:outline-none focus:ring-0 focus:border-indigo-500/50 transition-all resize-none overflow-hidden min-h-[84px] shadow-2xl shadow-indigo-500/5 dark:shadow-none placeholder:text-slate-400 placeholder:font-black placeholder:uppercase placeholder:tracking-[0.2em] placeholder:text-[10px] backdrop-blur-xl"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
                                        <Button size="icon" variant="ghost" className="h-12 w-12 rounded-2xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all">
                                            <Paperclip className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    <Button 
                                        onClick={handleSend}
                                        disabled={!input.trim() || isLoading}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-500/40 transition-all active:scale-90 flex items-center justify-center group overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />}
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between px-10">
                                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                    <div className="flex items-center gap-2.5 hover:text-indigo-500 cursor-pointer transition-all duration-500 hover:scale-105 group">
                                        <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                                        Nova GPT-4o
                                    </div>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                                    <div className="flex items-center gap-2.5 hover:text-indigo-500 cursor-pointer transition-all duration-500 hover:scale-105 group">
                                        <CheckCircle2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                        Task Engine V2
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-500">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Command Palette</span>
                                    <div className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold text-[9px]">CMD</kbd>
                                        <kbd className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold text-[9px]">K</kbd>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {["tasks", "docs", "sprint", "reports", "analytics", "automations"].map(tab => (
                    <TabsContent key={tab} value={tab} className="flex-1 flex flex-col items-center justify-center text-center p-12 m-0 data-[state=active]:flex relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] opacity-20 pointer-events-none" />
                        <div className="max-w-xl space-y-10 relative z-10">
                            <div className="w-28 h-28 rounded-[3rem] bg-white dark:bg-slate-900 flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-800 shadow-2xl relative group">
                                <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" />
                                {tab === "sprint" ? <SprintIcon className="w-14 h-14 text-indigo-500 floating" /> : <Sparkles className="w-14 h-14 text-slate-200 dark:text-slate-800 floating" />}
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nova {tab} Core</h3>
                                <p className="text-lg font-medium text-slate-500 leading-relaxed max-w-sm mx-auto opacity-80">
                                    {tab === "sprint" 
                                        ? "Generate high-fidelity velocity reports and bottleneck diagnostics for active cycles."
                                        : `Nova is currently synthesizing the intelligence modules for ${tab} mode.`
                                    }
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Button 
                                    onClick={() => {
                                        setActiveTab("chat");
                                        const prompt = tab === "sprint" ? "/report Generate sprint diagnostics" : `/activate ${tab} module`;
                                        setInput(prompt);
                                    }}
                                    className="h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
                                >
                                    Activate Intelligence
                                </Button>
                                <Button variant="ghost" onClick={() => setActiveTab("chat")} className="h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 hover:text-indigo-500 transition-all">
                                    Return to Neural Mainframe
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
