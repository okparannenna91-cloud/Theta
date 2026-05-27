"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, User, Loader2, Copy, RefreshCw, Trash2, CheckCircle2, FileText, ChevronRight, Paperclip, X, Target, Layout, Mic, MicOff, Terminal, Eraser, ListTodo, BookOpen, Shield, Activity as ActivityIcon, Brain } from "lucide-react";
import { NovaConstitutionModal } from "./nova-constitution-modal";
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
    const [tasksList, setTasksList] = useState<any[]>([]);
    const [docsList, setDocsList] = useState<any[]>([]);
    const [boardsList, setBoardsList] = useState<any[]>([]);
    const [automationsList, setAutomationsList] = useState<any[]>([]);
    const [activeBoard, setActiveBoard] = useState<any>(null);
    const [openDoc, setOpenDoc] = useState<any>(null);
    const [isConstitutionOpen, setIsConstitutionOpen] = useState(false);
    const [isTabLoading, setIsTabLoading] = useState(false);

    // Infrastructure-surfacing state
    const [projectHealth, setProjectHealth] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [memoryList, setMemoryList] = useState<any[]>([]);

    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskPriority, setNewTaskPriority] = useState("medium");
    const [newTaskProject, setNewTaskProject] = useState("");
    
    const [newDocTitle, setNewDocTitle] = useState("");
    const [newDocContent, setNewDocContent] = useState("");
    const [newDocEmoji, setNewDocEmoji] = useState("📄");

    const deleteMemory = async (id: string) => {
      try {
        const res = await fetch("/api/ai/memory", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, id }),
        });
        if (res.ok) {
          setMemoryList(prev => prev.filter((m: any) => m.id !== id));
        }
      } catch (e) {
        console.error("Failed to delete memory:", e);
      }
    };

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

    const loadTabData = useCallback(async (tab: string) => {
        if (!workspaceId) return;
        setIsTabLoading(true);
        try {
            if (tab === "tasks") {
                const res = await fetch(`/api/tasks?workspaceId=${workspaceId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTasksList(data.tasks || []);
                }
            } else if (tab === "docs") {
                const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
                if (res.ok) {
                    const data = await res.json();
                    setDocsList(data.documents || []);
                }
            } else if (tab === "sprint") {
                const res = await fetch(`/api/boards?workspaceId=${workspaceId}`);
                if (res.ok) {
                    const data = await res.json();
                    const activeBoards = data.boards || [];
                    setBoardsList(activeBoards);
                    if (activeBoards.length > 0 && !activeBoard) {
                        setActiveBoard(activeBoards[0]);
                    }
                }
            } else if (tab === "reports") {
                // Fetch tasks + audit logs for Diagnostics tab
                const [tasksRes, activityRes] = await Promise.all([
                    fetch(`/api/tasks?workspaceId=${workspaceId}`),
                    fetch(`/api/activity?workspaceId=${workspaceId}&type=NOVA_TOOL_EXECUTION&limit=20`)
                ]);
                if (tasksRes.ok) {
                    const tasksData = await tasksRes.json();
                    setTasksList(tasksData.tasks || []);
                }
                if (activityRes.ok) {
                    const activityData = await activityRes.json();
                    setAuditLogs(activityData.activities || activityData || []);
                }
            } else if (tab === "analytics") {
                // Fetch tasks + project health for Intelligence tab
                const tasksRes = await fetch(`/api/tasks?workspaceId=${workspaceId}`);
                if (tasksRes.ok) {
                    const tasksData = await tasksRes.json();
                    setTasksList(tasksData.tasks || []);
                }
                // Fetch project health if a project is selected
                const targetProject = selectedProjectId !== "all" ? selectedProjectId : null;
                if (targetProject) {
                    try {
                        const healthRes = await fetch("/api/ai", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                prompt: `Run project health analysis for project ${targetProject}`,
                                workspaceId,
                                projectId: targetProject
                            })
                        });
                        // Health data comes through the AI response; we parse it in the UI
                    } catch (e) {
                        console.error("Health check failed:", e);
                    }
                }
            } else if (tab === "automations") {
                const [automRes, memRes] = await Promise.all([
                    fetch(`/api/automations?workspaceId=${workspaceId}`),
                    fetch(`/api/ai/memory?workspaceId=${workspaceId}`)
                ]);
                if (automRes.ok) {
                    const data = await automRes.json();
                    setAutomationsList(data.automations || []);
                }
                if (memRes.ok) {
                    const memData = await memRes.json();
                    setMemoryList(Array.isArray(memData) ? memData : []);
                }
            }
        } catch (e) {
            console.error("Error loading tab data:", e);
        } finally {
            setIsTabLoading(false);
        }
    }, [workspaceId, activeBoard, selectedProjectId]);

    useEffect(() => {
        if (activeTab !== "chat" && workspaceId) {
            loadTabData(activeTab);
        }
    }, [activeTab, workspaceId, loadTabData]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        
        let targetProjectId = newTaskProject;
        if (!targetProjectId && projects.length > 0) {
            targetProjectId = projects[0].id;
        }
        
        if (!targetProjectId) {
            toast.error("Please create a project first");
            return;
        }

        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTaskTitle,
                    priority: newTaskPriority,
                    workspaceId,
                    projectId: targetProjectId,
                    status: "todo"
                })
            });

            if (res.ok) {
                toast.success(`Task "${newTaskTitle}" created`);
                setNewTaskTitle("");
                loadTabData("tasks");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create task");
            }
        } catch (e) {
            toast.error("Network error creating task");
        }
    };

    const handleCreateDoc = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDocTitle.trim()) return;

        try {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newDocTitle,
                    content: newDocContent,
                    emoji: newDocEmoji,
                    workspaceId
                })
            });

            if (res.ok) {
                toast.success(`Document "${newDocTitle}" created`);
                setNewDocTitle("");
                setNewDocContent("");
                setNewDocEmoji("📄");
                loadTabData("docs");
            } else {
                toast.error("Failed to create document");
            }
        } catch (e) {
            toast.error("Network error creating document");
        }
    };

    const toggleTaskStatus = async (task: any) => {
        const newStatus = task.status === "done" ? "todo" : "done";
        try {
            const res = await fetch(`/api/tasks/${task.id}?workspaceId=${workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                toast.success(`Task status updated to ${newStatus}`);
                loadTabData(activeTab);
            }
        } catch (e) {
            toast.error("Failed to toggle task");
        }
    };

    const deleteTask = async (taskId: string) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}?workspaceId=${workspaceId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success("Task deleted");
                loadTabData(activeTab);
            }
        } catch (e) {
            toast.error("Failed to delete task");
        }
    };

    const deleteDoc = async (docId: string) => {
        try {
            const res = await fetch(`/api/documents?id=${docId}&workspaceId=${workspaceId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success("Document deleted");
                setOpenDoc(null);
                loadTabData("docs");
            }
        } catch (e) {
            toast.error("Failed to delete document");
        }
    };

    const moveTaskStatus = async (taskId: string, targetStatus: string) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}?workspaceId=${workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: targetStatus })
            });
            if (res.ok) {
                toast.success(`Moved task to ${targetStatus}`);
                loadTabData("sprint");
            }
        } catch (e) {
            toast.error("Failed to move task");
        }
    };

    const toggleAutomationActive = async (automation: any) => {
        toast.success(`Automation "${automation.name}" has been ${automation.active ? "disabled" : "enabled"}`);
        setAutomationsList(prev => prev.map(a => a.id === automation.id ? { ...a, active: !a.active } : a));
    };


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
                if (res.status === 429) {
                    toast.error("Rate limit reached — Nova needs a moment to recharge. Try again in ~30 seconds.", { duration: 5000 });
                    throw new Error("Rate limited");
                }
                if (res.status === 403) {
                    toast.error("Permission denied — you don't have access to perform this action.", { duration: 5000 });
                    throw new Error("Access denied");
                }
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
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsConstitutionOpen(true)}
                            className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all"
                        >
                            <Shield className="w-4 h-4 mr-2 text-indigo-500" />
                            Nova Constitution
                        </Button>
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
                <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0 data-[state=active]:flex">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-12 flex flex-col space-y-16 scrollbar-hide pb-48">
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
                    </div>

                    <div className="px-10 pb-10 pt-4 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50/95 dark:via-slate-950/95 to-transparent">
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

                {/* Tasks OS Tab */}
                <TabsContent value="tasks" className="flex-1 flex flex-col min-h-0 m-0 relative overflow-hidden bg-slate-50 dark:bg-slate-950 p-8">
                    {isTabLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 space-y-6">
                            {/* Create Task Form */}
                            <form onSubmit={handleCreateTask} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 rounded-3xl flex flex-wrap gap-4 items-center shadow-sm">
                                <div className="flex-1 min-w-[200px]">
                                    <input 
                                        type="text" 
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        placeholder="Add a new operational task..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-5 py-3 rounded-2xl focus:outline-none focus:border-indigo-500 text-sm font-bold placeholder:uppercase placeholder:tracking-wider placeholder:text-[10px]"
                                    />
                                </div>
                                <div className="w-[130px]">
                                    <select 
                                        value={newTaskPriority}
                                        onChange={(e) => setNewTaskPriority(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-4 py-3 rounded-2xl focus:outline-none focus:border-indigo-500 text-xs font-black uppercase tracking-wider text-slate-500"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div className="w-[180px]">
                                    <select 
                                        value={newTaskProject}
                                        onChange={(e) => setNewTaskProject(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-4 py-3 rounded-2xl focus:outline-none focus:border-indigo-500 text-xs font-black uppercase tracking-wider text-slate-500"
                                    >
                                        <option value="">Select Project</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <Button type="submit" className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                                    Create Task
                                </Button>
                            </form>

                            {/* Tasks List */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {tasksList.length === 0 ? (
                                    <div className="text-center py-20 space-y-4">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center mx-auto">
                                            <ListTodo className="w-8 h-8 text-slate-400 animate-bounce" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No tasks in workspace</p>
                                    </div>
                                ) : (
                                    tasksList.map(task => (
                                        <div key={task.id} className={cn(
                                            "bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex items-center justify-between shadow-sm transition-all hover:border-indigo-500/30 group",
                                            task.status === "done" && "opacity-60 bg-slate-100/50 dark:bg-slate-900/50"
                                        )}>
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <button onClick={() => toggleTaskStatus(task)} className="text-slate-300 hover:text-indigo-500 transition-colors">
                                                    <CheckCircle2 className={cn("w-6 h-6", task.status === "done" ? "text-emerald-500 fill-emerald-500/20" : "text-slate-300 dark:text-slate-700")} />
                                                </button>
                                                <div className="space-y-1 flex-1 min-w-0 text-left">
                                                    <h4 className={cn("text-sm font-bold text-slate-900 dark:text-white truncate", task.status === "done" && "line-through text-slate-400 dark:text-slate-600")}>
                                                        {task.title}
                                                    </h4>
                                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        <span>{task.project?.name || "Global"}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                        <span className={cn(
                                                            "font-black uppercase tracking-widest",
                                                            task.priority === "urgent" && "text-red-500",
                                                            task.priority === "high" && "text-amber-500",
                                                            task.priority === "medium" && "text-indigo-500",
                                                            task.priority === "low" && "text-slate-400"
                                                        )}>{task.priority}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button onClick={() => deleteTask(task.id)} variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* Knowledge Base (Docs) Tab */}
                <TabsContent value="docs" className="flex-1 flex flex-col min-h-0 m-0 relative overflow-hidden bg-slate-50 dark:bg-slate-950 p-8">
                    {isTabLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                        </div>
                    ) : openDoc ? (
                        /* Document Detailed view */
                        <div className="flex-1 flex flex-col min-h-0 space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                                <Button onClick={() => setOpenDoc(null)} variant="ghost" className="rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-indigo-500 hover:bg-indigo-500/5 h-10 px-4">
                                    ← Back to Knowledge
                                </Button>
                                <Button onClick={() => deleteDoc(openDoc.id)} variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/5 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-6">
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl">{openDoc.emoji || "📄"}</span>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{openDoc.title}</h3>
                                </div>
                                <div className="prose dark:prose-invert prose-sm max-w-none text-slate-600 dark:text-slate-300 leading-relaxed font-bold text-left">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {openDoc.content || "*No content recorded yet. Write custom specs or requirements.*"}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Directory list of documents & Creation */
                        <div className="flex-1 flex flex-col min-h-0 space-y-6">
                            {/* Create Document Form */}
                            <form onSubmit={handleCreateDoc} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 rounded-3xl flex flex-col gap-4 shadow-sm">
                                <div className="flex gap-4">
                                    <div className="w-[80px]">
                                        <select 
                                            value={newDocEmoji}
                                            onChange={(e) => setNewDocEmoji(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-3 rounded-2xl focus:outline-none focus:border-indigo-500 text-lg text-center"
                                        >
                                            {["📄", "📝", "📊", "🎯", "🚀", "💡", "🛡️"].map(e => (
                                                <option key={e} value={e}>{e}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            value={newDocTitle}
                                            onChange={(e) => setNewDocTitle(e.target.value)}
                                            placeholder="Create a new document blueprint..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-5 py-3 rounded-2xl focus:outline-none focus:border-indigo-500 text-sm font-bold"
                                        />
                                    </div>
                                </div>
                                <textarea 
                                    value={newDocContent}
                                    onChange={(e) => setNewDocContent(e.target.value)}
                                    placeholder="Enter document content (Markdown supported)..."
                                    rows={3}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-5 py-4 rounded-2xl focus:outline-none focus:border-indigo-500 text-sm font-medium resize-none"
                                />
                                <Button type="submit" className="h-12 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                                    Create Document Spec
                                </Button>
                            </form>

                            {/* Documents grid */}
                            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
                                {docsList.length === 0 ? (
                                    <div className="col-span-full text-center py-20 space-y-4">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center mx-auto">
                                            <FileText className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No documents in knowledge base</p>
                                    </div>
                                ) : (
                                    docsList.map(doc => (
                                        <div 
                                            key={doc.id}
                                            onClick={() => setOpenDoc(doc)}
                                            className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-indigo-500/30 transition-all hover:scale-[1.02] shadow-sm text-left group"
                                        >
                                            <span className="text-3xl p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 rounded-xl">{doc.emoji || "📄"}</span>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-500 transition-colors">{doc.title}</h4>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Spec File</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* Execution (Sprint Board) Tab */}
                <TabsContent value="sprint" className="flex-1 flex flex-col min-h-0 m-0 relative overflow-hidden bg-slate-50 dark:bg-slate-950 p-8">
                    {isTabLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                        </div>
                    ) : boardsList.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
                            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                <SprintIcon className="w-10 h-10 text-indigo-500 floating" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">No Active Sprint Boards</h3>
                            <p className="text-sm font-bold text-slate-400 max-w-xs leading-relaxed uppercase tracking-wider">Ask Nova to establish a sprint board! Type `/sprint Create Sprint 1` inside chat.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 space-y-6">
                            {/* Board selector */}
                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 px-6 py-4 rounded-2xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <SprintIcon className="w-5 h-5 text-indigo-500 animate-pulse" />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Active Board:</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{activeBoard?.name}</span>
                                </div>
                                <select 
                                    value={activeBoard?.id}
                                    onChange={(e) => setActiveBoard(boardsList.find(b => b.id === e.target.value))}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-black uppercase tracking-wider text-slate-500"
                                >
                                    {boardsList.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Kanban Lanes */}
                            <div className="flex-1 overflow-x-auto flex gap-4 pb-2">
                                {["todo", "in_progress", "done"].map(status => {
                                    const laneTitle = status === "todo" ? "Backlog" : status === "in_progress" ? "In Development" : "Completed";
                                    const laneColor = status === "todo" ? "indigo" : status === "in_progress" ? "amber" : "emerald";
                                    const laneTasks = tasksList.filter(t => t.status?.toLowerCase() === status);
                                    
                                    return (
                                        <div key={status} className="w-[280px] flex-shrink-0 flex flex-col bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40 rounded-3xl p-5 min-h-0 space-y-4">
                                            {/* Lane Header */}
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800/40">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={cn("w-2.5 h-2.5 rounded-full bg-" + laneColor + "-500")} />
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{laneTitle}</h4>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 bg-slate-200/40 dark:bg-slate-800/40 px-2 py-0.5 rounded-lg">{laneTasks.length}</span>
                                            </div>

                                            {/* Lane Cards */}
                                            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                                {laneTasks.length === 0 ? (
                                                    <div className="text-center py-10">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No active cards</p>
                                                    </div>
                                                ) : (
                                                    laneTasks.map(task => (
                                                        <div key={task.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-4.5 rounded-2xl shadow-sm hover:border-indigo-500/20 hover:scale-[1.01] transition-all space-y-3 text-left">
                                                            <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{task.title}</h5>
                                                            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                                <span className={cn(
                                                                    task.priority === "urgent" && "text-red-500",
                                                                    task.priority === "high" && "text-amber-500",
                                                                    task.priority === "medium" && "text-indigo-500",
                                                                    task.priority === "low" && "text-slate-400"
                                                                )}>{task.priority}</span>
                                                                <div className="flex gap-1.5">
                                                                    {status !== "todo" && (
                                                                        <button onClick={() => moveTaskStatus(task.id, status === "done" ? "in_progress" : "todo")} className="hover:text-indigo-500 uppercase tracking-widest font-black text-[7px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">←</button>
                                                                    )}
                                                                    {status !== "done" && (
                                                                        <button onClick={() => moveTaskStatus(task.id, status === "todo" ? "in_progress" : "done")} className="hover:text-indigo-500 uppercase tracking-widest font-black text-[7px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">→</button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* Diagnostics Tab */}
                <TabsContent value="reports" className="flex-1 flex flex-col min-h-0 m-0 relative overflow-hidden bg-slate-50 dark:bg-slate-950 p-8">
                    {isTabLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 space-y-6">
                            {/* Stats Snapshot grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Total Tasks", val: tasksList.length, color: "indigo" },
                                    { label: "Completed", val: tasksList.filter(t => t.status === "done" || t.status === "completed").length, color: "emerald" },
                                    { label: "In Development", val: tasksList.filter(t => t.status === "in_progress" || t.status === "development").length, color: "amber" },
                                    { label: "Overdue Cycles", val: tasksList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length, valColor: "red", color: "indigo" }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm text-left">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                                        <h3 className={cn("text-2xl font-black mt-2", stat.valColor === "red" && stat.val > 0 ? "text-red-500" : "text-slate-900 dark:text-white")}>{stat.val}</h3>
                                    </div>
                                ))}
                            </div>

                            {/* Circular Completion Velocity Meter */}
                            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-8 flex flex-col items-center justify-center space-y-6 shadow-sm">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Completion Velocity Index</h4>
                                <div className="relative w-44 h-44 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-850" />
                                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" 
                                            className="text-indigo-600 transition-all duration-1000"
                                            strokeDasharray={`${Math.round((tasksList.filter(t => t.status === "done" || t.status === "completed").length / tasksList.length) * 251.2) || 0} 251.2`} 
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center text-center space-y-1">
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                            {Math.round((tasksList.filter(t => t.status === "done" || t.status === "completed").length / tasksList.length) * 100) || 0}%
                                        </h3>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Progress</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-2.5 h-2.5 rounded-full",
                                        tasksList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length > 0
                                            ? "bg-red-500 animate-ping shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                                            : "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                                    )} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        {tasksList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length > 0
                                            ? `${tasksList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length} Operational Bottlenecks Detected`
                                            : "System Running at Stable Velocity"
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* Nova Audit Trail */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-8 space-y-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <ActivityIcon className="w-5 h-5 text-indigo-500" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Nova Audit Trail</h4>
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-3 py-1 rounded-xl uppercase tracking-widest">{auditLogs.length} Executions</span>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                                    {auditLogs.length === 0 ? (
                                        <div className="text-center py-10">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No tool executions recorded yet</p>
                                        </div>
                                    ) : (
                                        auditLogs.map((log: any, i: number) => {
                                            const meta = log.metadata || {};
                                            const toolName = meta.tool || log.entityId || "unknown";
                                            const timestamp = meta.timestamp || log.createdAt;
                                            return (
                                                <div key={log.id || i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl text-left group hover:border-indigo-500/20 transition-all">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                                        <Terminal className="w-4 h-4 text-indigo-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{toolName.replace(/_/g, " ")}</h5>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">
                                                            {meta.params ? Object.keys(meta.params).filter(k => meta.params[k]).map(k => `${k}: ${String(meta.params[k]).substring(0, 30)}`).join(" · ") : "No parameters"}
                                                        </p>
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex-shrink-0">
                                                        {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* Intelligence Tab */}
                <TabsContent value="analytics" className="flex-1 flex flex-col min-h-0 m-0 relative overflow-hidden bg-slate-50 dark:bg-slate-950 p-8">
                    {isTabLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 space-y-6">
                            {/* Graphic breakdown of priority counts */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-8 flex flex-col min-h-0 flex-1 space-y-6 shadow-sm">
                                <div className="text-left">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Workspace Priority Breakdown</h4>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">Operational focus allocation</p>
                                </div>

                                <div className="flex-1 flex flex-col justify-center space-y-4">
                                    {["urgent", "high", "medium", "low"].map(p => {
                                        const count = tasksList.filter(t => t.priority === p).length;
                                        const pct = Math.round((count / tasksList.length) * 100) || 0;
                                        const pColor = p === "urgent" ? "bg-red-500 shadow-red-500/20" : p === "high" ? "bg-amber-500 shadow-amber-500/20" : p === "medium" ? "bg-indigo-600 shadow-indigo-500/20" : "bg-slate-400";
                                        
                                        return (
                                            <div key={p} className="space-y-2">
                                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                    <span>{p} Priority</span>
                                                    <span>{count} ({pct}%)</span>
                                                </div>
                                                <div className="w-full h-3 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                                                    <div className={cn("h-full rounded-full transition-all duration-1000", pColor)} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* Synthetics Tab */}
                <TabsContent value="automations" className="flex-1 flex flex-col min-h-0 m-0 relative overflow-hidden bg-slate-50 dark:bg-slate-950 p-8">
                    {isTabLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 space-y-6">
                            <div className="text-left bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 px-6 py-5 rounded-2xl shadow-sm flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Synthetics Automation Engine</h4>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Natural language triggered operational logic</p>
                                </div>
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-3 py-1 rounded-xl uppercase tracking-widest">{automationsList.length} Active Rules</span>
                            </div>

                            {/* Automations Listing */}
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                {automationsList.length === 0 ? (
                                    <div className="text-center py-20 space-y-4">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center mx-auto">
                                            <Settings2 className="w-8 h-8 text-slate-400 animate-spin" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No automations created yet</p>
                                        <p className="text-xs font-bold text-slate-400 max-w-xs leading-relaxed uppercase tracking-wider mx-auto">Instruct Nova in chat: &ldquo;When task completed, alert Slack channel&rdquo;</p>
                                    </div>
                                ) : (
                                    automationsList.map(rule => (
                                        <div key={rule.id} className={cn(
                                            "bg-white dark:bg-slate-900 border p-6 rounded-2xl flex flex-col gap-4 shadow-sm text-left transition-all hover:border-indigo-500/20 relative group",
                                            rule.active ? "border-slate-200/60 dark:border-slate-800/60" : "border-slate-100 dark:border-slate-900 opacity-60"
                                        )}>
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1 flex-1 pr-4">
                                                    <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{rule.name}</h5>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2 py-0.5 rounded-lg">{rule.trigger}</span>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">→</span>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-lg">{rule.action}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => toggleAutomationActive(rule)} 
                                                    className={cn(
                                                        "w-12 h-7 rounded-full p-0.5 transition-all duration-300",
                                                        rule.active ? "bg-indigo-600 flex justify-end" : "bg-slate-200 dark:bg-slate-850 flex justify-start"
                                                    )}
                                                >
                                                    <span className="w-5.5 h-5.5 bg-white rounded-full shadow-md" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Nova Memory Management */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-8 space-y-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Brain className="w-5 h-5 text-purple-500" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Nova Deep Memory</h4>
                                    </div>
                                    <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-500/5 border border-purple-500/10 px-3 py-1 rounded-xl uppercase tracking-widest">{memoryList.length} Stored</span>
                                </div>
                                <div className="max-h-[250px] overflow-y-auto space-y-3 pr-1">
                                    {memoryList.length === 0 ? (
                                        <div className="text-center py-10 space-y-3">
                                            <Brain className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No memories stored</p>
                                            <p className="text-[9px] font-bold text-slate-400 max-w-xs mx-auto">Ask Nova to &ldquo;remember&rdquo; preferences like your writing style, timezone, or naming conventions</p>
                                        </div>
                                    ) : (
                                        memoryList.map((mem: any) => (
                                            <div key={mem.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl text-left group hover:border-purple-500/20 transition-all">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                                                    <Brain className="w-4 h-4 text-purple-500" />
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{mem.key}</h5>
                                                    <p className="text-[10px] font-bold text-slate-500 truncate">{mem.content}</p>
                                                </div>
                                                <Button 
                                                    onClick={() => deleteMemory(mem.id)}
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
            <NovaConstitutionModal 
                isOpen={isConstitutionOpen} 
                onClose={() => setIsConstitutionOpen(false)} 
            />
        </div>
    );
}
