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
    }, [conversationId, workspaceId, fetchMessages, fetchProjects]);

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
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl z-20">
                <div className="h-20 flex items-center justify-between px-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform duration-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest leading-tight">Nova Intelligence</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Neural Link Synchronized</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                            <Button 
                                variant={selectedProjectId === "all" ? "secondary" : "ghost"} 
                                size="sm" 
                                onClick={() => setSelectedProjectId("all")}
                                className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest"
                            >
                                <Layout className="w-3 h-3 mr-1.5" />
                                Global
                            </Button>
                        </div>
                        <Button variant="ghost" size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-all">
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Multi-Mode Tabs */}
                <div className="px-8 pb-3">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl h-12">
                            <TabsTrigger value="chat" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                <MessageSquare className="w-3.5 h-3.5 mr-2" />
                                Chat
                            </TabsTrigger>
                            <TabsTrigger value="tasks" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                <ListTodo className="w-3.5 h-3.5 mr-2" />
                                Tasks
                            </TabsTrigger>
                            <TabsTrigger value="docs" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                <FileText className="w-3.5 h-3.5 mr-2" />
                                Docs
                            </TabsTrigger>
                            <TabsTrigger value="sprint" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                <SprintIcon className="w-3.5 h-3.5 mr-2" />
                                Sprint
                            </TabsTrigger>
                            <TabsTrigger value="reports" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                <BarChart3 className="w-3.5 h-3.5 mr-2" />
                                Reports
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                <PieChart className="w-3.5 h-3.5 mr-2" />
                                Analytics
                            </TabsTrigger>
                            <TabsTrigger value="automations" className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                <Settings2 className="w-3.5 h-3.5 mr-2" />
                                Automations
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=active]:flex">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 flex flex-col space-y-12">
                        {messages.length === 0 && !isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-8 py-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-20 rounded-full animate-pulse" />
                                    <div className="w-24 h-24 rounded-[2.5rem] bg-slate-100 dark:bg-slate-900 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 relative z-10 group">
                                        <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 transition-colors duration-500" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">How can Nova assist your project today?</h3>
                                    <p className="text-lg font-medium text-slate-500 leading-relaxed max-w-md mx-auto">
                                        I can help you architect complex projects, automate repetitive tasks, or extract deep insights from your workspace data.
                                    </p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {["Plan a sprint", "Analyze team velocity", "Generate technical docs"].map((suggestion) => (
                                        <button 
                                            key={suggestion}
                                            onClick={() => setInput(suggestion)}
                                            className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all shadow-sm"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((m) => (
                                <div key={m.id} className={cn(
                                    "flex gap-6 max-w-5xl mx-auto group animate-in fade-in slide-in-from-bottom-4 duration-500",
                                    m.role === "user" ? "flex-row-reverse" : "flex-row"
                                )}>
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-110",
                                        m.role === "user" 
                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" 
                                            : "bg-indigo-600 text-white shadow-indigo-500/20"
                                    )}>
                                        {m.role === "user" ? <User className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                                    </div>
                                    <div className={cn(
                                        "flex flex-col gap-3",
                                        m.role === "user" ? "items-end max-w-[80%]" : "items-start max-w-[85%]"
                                    )}>
                                        <div className={cn(
                                            "p-8 rounded-[2.5rem] text-sm font-medium leading-relaxed shadow-sm border transition-all duration-300",
                                            m.role === "user" 
                                                ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tr-none" 
                                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-tl-none group-hover:shadow-xl group-hover:shadow-indigo-500/5 group-hover:border-indigo-500/20"
                                        )}>
                                            {m.content === "thinking..." ? (
                                                <div className="flex items-center gap-2 py-1">
                                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Nova is thinking...</span>
                                                </div>
                                            ) : (
                                                <div className="prose dark:prose-invert prose-sm max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:p-0 prose-pre:rounded-2xl">
                                                    <ReactMarkdown 
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            table: ({ children }) => (
                                                                <div className="my-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                                                    <table className="w-full border-collapse bg-white dark:bg-slate-900 text-left text-sm text-slate-500 dark:text-slate-400">
                                                                        {children}
                                                                    </table>
                                                                </div>
                                                            ),
                                                            thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800/50">{children}</thead>,
                                                            th: ({ children }) => <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-slate-900 dark:text-white">{children}</th>,
                                                            td: ({ children }) => <td className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">{children}</td>,
                                                            code: ({ node, inline, className, children, ...props }: any) => {
                                                                const match = /language-(\w+)/.exec(className || "");
                                                                return !inline && match ? (
                                                                    <div className="relative group/code my-6">
                                                                        <div className="absolute right-4 top-4 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                                                                            <Button 
                                                                                variant="secondary" 
                                                                                size="icon" 
                                                                                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border-white/10"
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
                                                                                    toast.success("Code copied!");
                                                                                }}
                                                                            >
                                                                                <Copy className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                        <SyntaxHighlighter
                                                                            style={syntaxStyle}
                                                                            language={match[1]}
                                                                            PreTag="div"
                                                                            className="rounded-2xl !bg-slate-950 !p-6 !m-0 border border-white/5 shadow-2xl"
                                                                            {...props}
                                                                        >
                                                                            {String(children).replace(/\n$/, "")}
                                                                        </SyntaxHighlighter>
                                                                    </div>
                                                                ) : (
                                                                    <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-bold text-indigo-600 dark:text-indigo-400" {...props}>
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
                                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => convertToTask(m.content)}
                                                        className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all flex items-center gap-2"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Convert to Task
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => setInput(`/breakdown ${m.content.substring(0, 100)}...`)}
                                                        className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all flex items-center gap-2"
                                                    >
                                                        <ListTodo className="w-3.5 h-3.5" />
                                                        Breakdown
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => setInput(`Estimate time for: ${m.content.substring(0, 100)}...`)}
                                                        className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:border-amber-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all flex items-center gap-2"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                        Estimate
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => {
                                                            setInput(`/share Save and share this conversation with the workspace.`);
                                                        }}
                                                        className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:border-purple-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all flex items-center gap-2"
                                                    >
                                                        <Send className="w-3.5 h-3.5" />
                                                        Share Thread
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && messages[messages.length-1]?.role !== "assistant" && (
                            <div className="flex gap-6 max-w-5xl mx-auto animate-pulse">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] rounded-tl-none flex items-center gap-3">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-10 bg-gradient-to-t from-white dark:from-slate-950 via-white/80 dark:via-slate-950/80 to-transparent">
                        <div className="max-w-4xl mx-auto relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2.2rem] blur opacity-10 group-focus-within:opacity-30 transition-opacity duration-500" />
                            <textarea 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Ask Nova to build something brilliant..."
                                rows={1}
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[2rem] px-10 py-6 pr-20 text-base font-medium focus:outline-none focus:ring-0 focus:border-indigo-500 transition-all resize-none overflow-hidden min-h-[72px] relative z-10 shadow-2xl shadow-slate-200/50 dark:shadow-none placeholder:text-slate-400 placeholder:font-bold"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                                    <Paperclip className="w-5 h-5" />
                                </Button>
                            </div>
                            <Button 
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/40 transition-all active:scale-90 flex items-center justify-center group"
                            >
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {["tasks", "docs", "sprint", "reports", "analytics", "automations"].map(tab => (
                    <TabsContent key={tab} value={tab} className="flex-1 flex flex-col items-center justify-center text-center p-8 m-0 data-[state=active]:flex">
                        <div className="max-w-md space-y-6">
                            <div className="w-20 h-20 rounded-[2rem] bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto border-2 border-dashed border-slate-200 dark:border-slate-800">
                                {tab === "sprint" ? <SprintIcon className="w-10 h-10 text-indigo-500" /> : <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-700" />}
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nova {tab.charAt(0).toUpperCase() + tab.slice(1)} Mode</h3>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                {tab === "sprint" 
                                    ? "Generate deep-dive reports, velocity charts, and bottleneck analysis for your current sprint."
                                    : `Nova is currently calibrating her intelligence for ${tab} mode.`
                                }
                            </p>
                            <div className="flex flex-col gap-2">
                                {tab === "sprint" && (
                                    <Button 
                                        onClick={() => {
                                            setActiveTab("chat");
                                            setInput("/report Generate a comprehensive status report for the current sprint.");
                                        }}
                                        className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white h-12"
                                    >
                                        Generate Neural Report
                                    </Button>
                                )}
                                {tab === "automations" && (
                                    <Button 
                                        onClick={() => {
                                            setActiveTab("chat");
                                            setInput("Create an automation that...");
                                        }}
                                        className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-purple-600 hover:bg-purple-700 text-white h-12"
                                    >
                                        Architect Automation
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => setActiveTab("chat")} className="rounded-xl font-black uppercase tracking-widest text-[10px] h-12">
                                    Back to Neural Chat
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
                <div className="max-w-4xl mx-auto flex items-center justify-between mt-6 px-4">
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <div className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer transition-colors">
                            <Sparkles className="w-3 h-3" />
                            GPT-4o Vision
                        </div>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <div className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer transition-colors">
                            <CheckCircle2 className="w-3 h-3" />
                            Task Extractor
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">
                        Shift + Enter for new line
                    </p>
                </div>
            </div>
    );
}
