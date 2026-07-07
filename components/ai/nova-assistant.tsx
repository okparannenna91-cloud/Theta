"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Loader2, Bot, User, Trash2, Maximize2, Minimize2, Mic, Paperclip, FileIcon, Volume2, MessageSquare, History, Zap, ClipboardList, FileEdit, Calculator, Search, Brain, Terminal, Activity as ActivityIcon, Plus, ListTodo, BookOpen, Eraser, Pin } from "lucide-react";
import { ActivityStatus } from "@/components/ai/activity-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';
import { formatDistanceToNow } from "date-fns";

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
    id?: string;
}

interface Conversation {
    id: string;
    title: string;
    lastMessageAt: string;
    isPinned: boolean;
}

const SLASH_COMMANDS = [
    { icon: ListTodo, label: "Create Task", command: "/task ", description: "Turn this thought into a task" },
    { icon: BookOpen, label: "Summarize", command: "/summarize", description: "Summarize the current view" },
    { icon: Eraser, label: "Clear Chat", command: "/clear", description: "Reset the conversation" },
    { icon: Terminal, label: "Debug", command: "/debug", description: "Show system diagnostics" },
];

const BLUEPRINTS = [
    { name: "Bug Report Architect", desc: "Structured bug reproduction steps", icon: Bot, prompt: "Create a bug report for " },
    { name: "Sprint Planner", desc: "Generate milestones and tasks", icon: Zap, prompt: "Plan a sprint for " },
    { name: "PRD Drafter", desc: "Draft a full product requirement doc", icon: FileEdit, prompt: "Draft a PRD for " },
    { name: "Task Breakdown", desc: "Decompose complex tasks", icon: ListTodo, prompt: "Break down this task: " },
    { name: "Status Report", desc: "Generate a workspace status report", icon: ClipboardList, prompt: "Generate a status report for " },
    { name: "Velocity Calc", desc: "Calculate team velocity", icon: Calculator, prompt: "Calculate the team velocity for " },
];

const QUICK_ACTIONS = [
    { label: "Summarize", icon: ClipboardList, color: "bg-primary/10 text-primary", prompt: "Summarize my active tasks." },
    { label: "Daily Standup", icon: MessageSquare, color: "bg-emerald-500/10 text-emerald-500", prompt: "Prepare a daily standup for me." },
    { label: "Draft Spec", icon: FileEdit, color: "bg-amber-500/10 text-amber-500", prompt: "Draft a technical spec for the current project." },
    { label: "Calc Velocity", icon: Calculator, color: "bg-purple-500/10 text-purple-500", prompt: "Calculate the team velocity." },
    { label: "Audit Backlog", icon: ListTodo, color: "bg-rose-500/10 text-rose-500", prompt: "Audit my task backlog and suggest priorities." },
    { label: "Check Health", icon: ActivityIcon, color: "bg-indigo-500/10 text-indigo-500", prompt: "Run a project health check." },
];

export function NovaAssistant() {
    const { activeWorkspaceId } = useWorkspace();
    const { showUpgradePrompt } = usePopups();
    const pathname = usePathname();

    const currentProjectId = pathname?.startsWith("/projects/") ? pathname.split("/")[2]?.split("?")[0] : undefined;

    const pageContext = pathname ? {
        path: pathname,
        type: pathname === "/dashboard" ? "dashboard" :
              pathname.startsWith("/projects/") ? "project" :
              pathname.startsWith("/tasks") ? "tasks" :
              pathname.startsWith("/calendar") ? "calendar" :
              pathname.startsWith("/workspaces") ? "workspaces" :
              pathname.startsWith("/notifications") ? "notifications" :
              pathname.startsWith("/settings") ? "settings" :
              "other",
    } : undefined;
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
    const [isStreaming, setIsStreaming] = useState(false);
    const [usage, setUsage] = useState<{ current: number; max: number } | null>(null);
    const isLimitReached = usage ? (usage.max !== -1 && usage.current >= usage.max) : false;
    const [isListening, setIsListening] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [attachments, setAttachments] = useState<Array<{ name: string; type: string; url: string }>>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const lastPromptRef = useRef("");
    const [activeTab, setActiveTab] = useState("chat");
    const [showSlashMenu, setShowSlashMenu] = useState(false);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [conversationsLoading, setConversationsLoading] = useState(false);
    const [recallSearchQuery, setRecallSearchQuery] = useState("");

    const [memories, setMemories] = useState<any[]>([]);
    const [memoriesLoading, setMemoriesLoading] = useState(false);

    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);

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

    const fetchConversations = useCallback(async () => {
        if (!activeWorkspaceId) return;
        setConversationsLoading(true);
        try {
            const res = await fetch(`/api/ai/conversations?workspaceId=${activeWorkspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (error) {
            console.error("Failed to fetch conversations:", error);
        } finally {
            setConversationsLoading(false);
        }
    }, [activeWorkspaceId]);

    const createConversation = useCallback(async () => {
        if (!activeWorkspaceId) return null;
        try {
            const res = await fetch("/api/ai/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: activeWorkspaceId,
                    title: "New Conversation"
                })
            });
            if (res.ok) {
                const data = await res.json();
                return data.id;
            }
        } catch (error) {
            console.error("Failed to create conversation:", error);
        }
        return null;
    }, [activeWorkspaceId]);

    const fetchConversationMessages = useCallback(async (conversationId: string) => {
        try {
            const res = await fetch(`/api/ai/conversations/${conversationId}?workspaceId=${activeWorkspaceId}`);
            if (res.ok) {
                const data = await res.json();
                const loadedMessages: Message[] = (data.messages || []).map((m: any) => ({
                    role: m.role === "assistant" ? "nova" : "user",
                    content: m.content,
                    timestamp: new Date(m.createdAt),
                    id: m.id,
                }));
                if (loadedMessages.length > 0) {
                    setMessages(loadedMessages);
                } else {
                    setMessages([{
                        role: "nova",
                        content: "Continuing where we left off. What would you like to work on?",
                        timestamp: new Date(),
                    }]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        }
    }, [activeWorkspaceId]);

    const fetchMemories = useCallback(async () => {
        if (!activeWorkspaceId) return;
        setMemoriesLoading(true);
        try {
            const res = await fetch(`/api/ai/memory?workspaceId=${activeWorkspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setMemories(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to fetch memories:", error);
        } finally {
            setMemoriesLoading(false);
        }
    }, [activeWorkspaceId]);

    const deleteMemory = useCallback(async (id: string) => {
        try {
            const res = await fetch("/api/ai/memory", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: activeWorkspaceId, id }),
            });
            if (res.ok) {
                setMemories(prev => prev.filter((m: any) => m.id !== id));
                toast.success("Memory deleted");
            }
        } catch (e) {
            console.error("Failed to delete memory:", e);
        }
    }, [activeWorkspaceId]);

    const fetchAuditLogs = useCallback(async () => {
        if (!activeWorkspaceId) return;
        setAuditLogsLoading(true);
        try {
            const res = await fetch(`/api/activity?workspaceId=${activeWorkspaceId}&type=NOVA_TOOL_EXECUTION&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.activities || data || []);
            }
        } catch (error) {
            console.error("Failed to fetch audit logs:", error);
        } finally {
            setAuditLogsLoading(false);
        }
    }, [activeWorkspaceId]);

    useEffect(() => {
        if (activeWorkspaceId && isOpen) {
            fetchUsage();
            fetchConversations();
        }
    }, [activeWorkspaceId, isOpen, fetchUsage, fetchConversations]);

    useEffect(() => {
        if (activeTab === "history" && activeWorkspaceId) {
            fetchMemories();
            fetchConversations();
        } else if (activeTab === "workflows" && activeWorkspaceId) {
            fetchAuditLogs();
        }
    }, [activeTab, activeWorkspaceId, fetchMemories, fetchConversations, fetchAuditLogs]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isMinimized]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.prompt) {
                setInput(detail.prompt);
                if (!isOpen) setIsOpen(true);
                if (isMinimized) setIsMinimized(false);
                setActiveTab("chat");
            }
        };
        window.addEventListener("nova:open", handler);
        return () => window.removeEventListener("nova:open", handler);
    }, [isOpen, isMinimized]);

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

    const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                return { url: data.url, name: file.name, type: file.type };
            }
        } catch (error) {
            console.error("File upload failed:", error);
        }
        return null;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setAttachedFiles(prev => [...prev, ...files]);
            toast.success(`Attached ${files.length} file(s)`);
        }
    };

    const handleSlashCommand = (command: string) => {
        setShowSlashMenu(false);
        if (command === "/clear") {
            clearChat();
            return;
        }
        setInput(command);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

        const currentInput = input.trim();

        if (currentInput.startsWith("/clear")) {
            clearChat();
            return;
        }

        if (isLimitReached) {
            showUpgradePrompt("nova");
            return;
        }

        let convId = activeConversationId;

        if (!convId) {
            convId = await createConversation();
            if (convId) {
                setActiveConversationId(convId);
                fetchConversations();
            }
        }

        let uploadedAttachments: Array<{ name: string; type: string; url: string }> = [];
        if (attachedFiles.length > 0) {
            for (const file of attachedFiles) {
                const uploaded = await uploadFile(file);
                if (uploaded) {
                    uploadedAttachments.push(uploaded);
                }
            }
        }

        const userMessage: Message = {
            role: "user",
            content: currentInput,
            timestamp: new Date(),
            attachments: uploadedAttachments.length > 0 ? uploadedAttachments : attachedFiles.map(f => ({ name: f.name, type: f.type, url: "" }))
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setAttachedFiles([]);
        setAttachments(uploadedAttachments);
        lastPromptRef.current = currentInput;
        setIsLoading(true);

        try {
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort("Request timeout"), 55000);

            try {
                const res = await fetch("/api/ai", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: currentInput,
                        workspaceId: activeWorkspaceId,
                        conversationId: convId || undefined,
                        projectId: currentProjectId,
                        context: pageContext,
                    }),
                    signal: controller.signal,
                });

                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    if (res.status === 403 && (error.error?.includes("limit") || error.error?.includes("plan"))) {
                        showUpgradePrompt("nova");
                        return;
                    }
                    throw new Error(error.error || `Request failed with status ${res.status}`);
                }

                const reader = res.body?.getReader();
                const decoder = new TextDecoder();
                let accumulatedResponse = "";
                let streamEnded = false;
                let chunkCount = 0;
                let messageAppended = false;

                setIsStreaming(true);

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            streamEnded = true;
                            break;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        chunkCount++;
                        accumulatedResponse += chunk;

                        if (!messageAppended) {
                            messageAppended = true;
                            setMessages((prev) => [...prev, {
                                role: "nova",
                                content: accumulatedResponse,
                                timestamp: new Date(),
                            }]);
                        } else {
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
                }

                if (!messageAppended) {
                    const fallbackContent = accumulatedResponse || "Nova could not generate a response. Check logs.";
                    setMessages((prev) => [...prev, {
                        role: "nova",
                        content: fallbackContent,
                        timestamp: new Date(),
                    }]);
                }
            } finally {
                clearTimeout(fetchTimeout);
                setIsStreaming(false);
            }

            fetchUsage();
            if (convId) fetchConversations();
        } catch (error: any) {
            const isAbort = error?.name === 'AbortError' || error?.message?.includes('abort') || error?.message?.includes('timeout');
            const errorMsg = isAbort
                ? "The request took too long. Please try a simpler query or try again."
                : (error.message || "Nova is having trouble connecting.");
            setMessages((prev) => [...prev, {
                role: "nova",
                content: `I encountered an issue: ${errorMsg}`,
                timestamp: new Date(),
            }]);
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
        setActiveConversationId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
            return;
        }
        if (e.key === '/' && input === '') {
            setShowSlashMenu(true);
        }
    };

    const selectConversation = (id: string) => {
        setActiveConversationId(id);
        fetchConversationMessages(id);
        setActiveTab("chat");
    };

    const filteredConversations = conversations.filter(c =>
        c.title?.toLowerCase().includes(recallSearchQuery.toLowerCase())
    );

    const pinnedConversations = filteredConversations.filter(c => c.isPinned);
    const recentConversations = filteredConversations.filter(c => !c.isPinned);

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] flex-col items-end font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            height: isMinimized ? "72px" : "min(600px, 80vh)",
                            width: isMinimized ? "280px" : "min(450px, 95vw)"
                        }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "mb-4 overflow-hidden rounded-2xl shadow-2xl border border-white/10 backdrop-blur-2xl bg-white/95 dark:bg-slate-950/95 flex flex-col",
                            isMinimized ? "h-18" : "h-[80vh] w-[95vw] sm:w-[450px]"
                        )}
                    >
                        <div className="relative p-4 sm:p-5 bg-gradient-to-br from-primary via-primary/90 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-lg overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30 shadow-lg shadow-black/10">
                                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">Nova</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn(
                                            "h-1.5 w-1.5 rounded-full shadow-lg",
                                            isStreaming ? "bg-yellow-400 shadow-yellow-500/50 animate-pulse" : "bg-emerald-400 shadow-emerald-500/50"
                                        )} />
                                        <span className="text-[10px] text-white/70 font-medium">
                                            {isStreaming ? "Responding..." : "AI Connected"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 relative z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-all"
                                    onClick={() => setIsMinimized(!isMinimized)}
                                >
                                    {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-white/80 hover:text-white hover:bg-rose-500/30 transition-all"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                                <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-transparent">
                                    <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-200/50 dark:border-slate-800/50">
                                        <TabsTrigger value="chat" className="rounded-lg text-[11px] sm:text-xs font-medium py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                                            <MessageSquare className="w-3.5 h-3.5 mr-1.5 inline-block" />
                                            Chat
                                        </TabsTrigger>
                                        <TabsTrigger value="history" className="rounded-lg text-[11px] sm:text-xs font-medium py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                                            <History className="w-3.5 h-3.5 mr-1.5 inline-block" />
                                            Recall
                                        </TabsTrigger>
                                        <TabsTrigger value="workflows" className="rounded-lg text-[11px] sm:text-xs font-medium py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                                            <Zap className="w-3.5 h-3.5 mr-1.5 inline-block" />
                                            Actions
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=active]:flex">
                                    <div
                                        ref={scrollRef}
                                        className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-5 bg-gradient-to-b from-slate-50/50 to-white/30 dark:from-slate-950/50 dark:to-slate-950/30 scrollbar-hide"
                                    >
                                    {messages.map((msg, i) => (
                                        <motion.div
                                            key={msg.id || i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(i * 0.03, 0.3) }}
                                            className={cn(
                                                "flex w-full",
                                                msg.role === "user" ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex gap-2 max-w-[92%] sm:max-w-[88%]",
                                                msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                            )}>
                                                <div className={cn(
                                                    "h-7 w-7 sm:h-8 sm:w-8 rounded-xl shrink-0 flex items-center justify-center overflow-hidden shadow-lg border-2 mt-1",
                                                    msg.role === "nova" ? "border-primary/20 bg-gradient-to-br from-primary/10 to-indigo-500/10" : "border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
                                                )}>
                                                    <Image 
                                                        src={msg.role === "nova" ? novaAvatar : userAvatar} 
                                                        alt={msg.role} 
                                                        width={28} 
                                                        height={28}
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1 min-w-0">
                                                    <div className={cn(
                                                        "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-[12px] sm:text-[13px] leading-relaxed shadow-sm break-words",
                                                        msg.role === "nova"
                                                            ? "bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/50 rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                                                            : "bg-primary text-white rounded-tr-sm shadow-md"
                                                    )}>
                                                        {msg.role === "nova" ? (
                                                            <div className="prose prose-slate dark:prose-invert prose-xs sm:prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1 prose-headings:text-xs prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-table:text-[11px]">
                                                                <ReactMarkdown 
                                                                    remarkPlugins={[remarkGfm]}
                                                                    components={{
                                                                        table: ({ children }) => (
                                                                            <div className="overflow-x-auto my-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                                                                <table className="w-full text-[11px] border-collapse bg-white dark:bg-slate-900">
                                                                                    {children}
                                                                                </table>
                                                                            </div>
                                                                        ),
                                                                        th: ({ children }) => <th className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-left border-b border-slate-200 dark:border-slate-700">{children}</th>,
                                                                        td: ({ children }) => <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">{children}</td>,
                                                                        a: ({ children, href }) => <a href={href} className="text-primary font-medium hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                                                                    }}
                                                                >
                                                                    {msg.content}
                                                                </ReactMarkdown>
                                                                {isStreaming && i === messages.length - 1 && msg.content.length > 0 && (
                                                                    <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 rounded-sm align-text-bottom" />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[12px] sm:text-[13px] font-medium">{msg.content}</span>
                                                        )}

                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                                                                {msg.attachments.map((file, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                                                                        <FileIcon className="w-2.5 h-2.5 text-primary" />
                                                                        <span className="truncate max-w-[70px]">{file.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "text-[9px] px-1 opacity-30 font-medium",
                                                        msg.role === "user" ? "text-right" : "text-left"
                                                    )}>
                                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {(isLoading || isStreaming) && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex justify-start"
                                        >
                                            <div className="flex gap-2 items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-sm px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-sm">
                                                <ActivityStatus
                                                    prompt={lastPromptRef.current}
                                                    isLoading={isLoading}
                                                    isStreaming={isStreaming}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <div className="p-3 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shrink-0 flex flex-col gap-2 sm:gap-3">
                                    {attachedFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 w-full">
                                            {attachedFiles.map((file, i) => (
                                                <div key={i} className="group relative flex items-center gap-1.5 px-2 py-1.5 bg-primary/5 border border-primary/10 rounded-lg text-[10px] font-medium text-primary">
                                                    <Paperclip className="w-2.5 h-2.5" />
                                                    <span className="truncate max-w-[80px]">{file.name}</span>
                                                    <button 
                                                        onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="ml-1 text-rose-500 hover:text-rose-600"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <form onSubmit={handleSend} className="flex w-full items-end gap-2 relative">
                                        <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl shrink-0">
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
                                                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-slate-400 hover:text-primary hover:bg-white/80 dark:hover:bg-slate-800 transition-all"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Paperclip className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "h-8 w-8 sm:h-9 sm:w-9 rounded-lg transition-all",
                                                    isListening ? "text-rose-500 bg-rose-500/10" : "text-slate-400 hover:text-primary hover:bg-white/80 dark:hover:bg-slate-800"
                                                )}
                                                onClick={startListening}
                                            >
                                                <Mic className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <div className="relative flex-1 min-w-0">
                                            <textarea
                                                ref={inputRef}
                                                placeholder={isLimitReached ? "Limit reached" : "Ask Nova... (/ for commands)"}
                                                value={input}
                                                onChange={(e) => {
                                                    setInput(e.target.value);
                                                    if (e.target.value === '/') {
                                                        setShowSlashMenu(true);
                                                    } else {
                                                        setShowSlashMenu(false);
                                                    }
                                                }}
                                                onKeyDown={handleKeyDown}
                                                rows={1}
                                                className="w-full pr-10 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 focus-visible:border-primary/50 focus-visible:ring-0 text-sm font-medium rounded-xl resize-none overflow-hidden py-2.5 px-3.5 min-h-[40px] max-h-[120px] transition-all outline-none"
                                                disabled={isLoading || isLimitReached}
                                            />
                                            {showSlashMenu && (
                                                <div className="absolute bottom-full mb-1 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                                                    {SLASH_COMMANDS.map((cmd) => (
                                                        <button
                                                            key={cmd.command}
                                                            type="button"
                                                            onClick={() => handleSlashCommand(cmd.command)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-all border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                                                        >
                                                            <cmd.icon className="w-4 h-4 text-primary" />
                                                            <div>
                                                                <span className="font-semibold">{cmd.label}</span>
                                                                <span className="text-[10px] text-muted-foreground ml-2">{cmd.description}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || isLimitReached}
                                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm transition-all active:scale-95 shrink-0"
                                        >
                                            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="flex-1 flex flex-col overflow-hidden m-0">
                                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-transparent">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search conversations..."
                                            value={recallSearchQuery}
                                            onChange={(e) => setRecallSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-lg text-xs font-medium focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-7 px-3 rounded-lg text-[10px] font-medium", activeTab === "history" ? "bg-primary/10 text-primary" : "text-muted-foreground")}
                                            onClick={() => { setActiveTab("history"); fetchConversations(); }}
                                        >
                                            <MessageSquare className="w-3 h-3 mr-1" />
                                            Conversations
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-3 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-purple-500 hover:bg-purple-500/5"
                                            onClick={() => { setActiveTab("history"); fetchMemories(); }}
                                        >
                                            <Brain className="w-3 h-3 mr-1" />
                                            Memories
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/30">
                                    {conversationsLoading ? (
                                        <div className="space-y-2">
                                            {[1,2,3].map(i => (
                                                <div key={i} className="h-14 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg border border-slate-200 dark:border-slate-800" />
                                            ))}
                                        </div>
                                    ) : pinnedConversations.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 px-1">
                                                <Pin className="w-3 h-3 text-primary" />
                                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pinned</span>
                                            </div>
                                            {pinnedConversations.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => selectConversation(c.id)}
                                                    className={cn(
                                                        "w-full text-left p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:shadow-md transition-all",
                                                        activeConversationId === c.id && "border-primary/50 ring-1 ring-primary/20"
                                                    )}
                                                >
                                                    <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate">{c.title}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                        {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 px-1">
                                            <MessageSquare className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                {pinnedConversations.length > 0 ? "Recent" : "Conversations"}
                                            </span>
                                        </div>
                                        {recentConversations.length === 0 ? (
                                            <div className="text-center py-8 space-y-2">
                                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center mx-auto">
                                                    <MessageSquare className="w-5 h-5 text-slate-400" />
                                                </div>
                                                <p className="text-xs text-muted-foreground">No conversations yet</p>
                                                <p className="text-[10px] text-muted-foreground">Start a new chat to begin</p>
                                            </div>
                                        ) : (
                                            recentConversations.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => selectConversation(c.id)}
                                                    className={cn(
                                                        "w-full text-left p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:shadow-md transition-all",
                                                        activeConversationId === c.id && "border-primary/50 ring-1 ring-primary/20"
                                                    )}
                                                >
                                                    <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate">{c.title || "Untitled"}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                        {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>

                                    {memories.length > 0 && (
                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 px-1 mb-2">
                                                <Brain className="w-3 h-3 text-purple-500" />
                                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Memories</span>
                                                <span className="text-[10px] text-purple-500 font-medium ml-auto">{memories.length} stored</span>
                                            </div>
                                            <div className="space-y-2">
                                                {memories.map((mem: any) => (
                                                    <div key={mem.id} className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 group hover:border-purple-500/30 transition-all">
                                                        <Brain className="w-3 h-3 text-purple-500 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-[11px] font-semibold text-slate-900 dark:text-white block truncate">{mem.key}</span>
                                                            <span className="text-[9px] text-slate-500 block truncate">{mem.content}</span>
                                                        </div>
                                                        <button onClick={() => deleteMemory(mem.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="workflows" className="flex-1 overflow-y-auto p-4 sm:p-6 m-0 bg-slate-50/30">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Quick Actions</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {QUICK_ACTIONS.map((action, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => { setInput(action.prompt); setActiveTab("chat"); }}
                                                    className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-3 hover:border-primary/50 hover:shadow-md transition-all active:scale-95 group"
                                                >
                                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shadow-sm", action.color)}>
                                                        <action.icon className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{action.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-3 px-1">
                                            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Blueprints</h3>
                                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-4" />
                                        </div>
                                        <div className="space-y-2">
                                            {BLUEPRINTS.map((t, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => { setInput(t.prompt); setActiveTab("chat"); }}
                                                    className="w-full p-3 text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-primary/5 dark:hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center gap-3"
                                                >
                                                    <div className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                        <t.icon className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[12px] font-extrabold text-slate-900 dark:text-white leading-none mb-0.5 truncate">{t.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium truncate">{t.desc}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {auditLogs.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-3 px-1">
                                                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Tool Executions</h3>
                                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-4" />
                                            </div>
                                            <div className="space-y-2">
                                                {auditLogs.slice(0, 5).map((log: any, i: number) => {
                                                    const meta = log.metadata || {};
                                                    const toolName = meta.tool || log.entityId || "unknown";
                                                    return (
                                                        <div key={log.id || i} className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                                                <Terminal className="w-3.5 h-3.5 text-primary" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[11px] font-semibold text-slate-900 dark:text-white block truncate">{toolName.replace(/_/g, " ")}</span>
                                                                <span className="text-[9px] text-slate-500 block truncate">
                                                                    {meta.params ? Object.keys(meta.params).filter((k: string) => meta.params[k]).map((k: string) => `${k}: ${String(meta.params[k]).substring(0, 20)}`).join(" · ") : "No parameters"}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] text-slate-400 shrink-0">
                                                                {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
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
                    "flex items-center gap-2 sm:gap-3 h-12 sm:h-14 px-4 sm:px-5 rounded-2xl shadow-lg transition-all z-50 border border-white/10 backdrop-blur-xl",
                    isOpen
                        ? "bg-slate-900/90 text-white"
                        : "bg-gradient-to-br from-primary to-indigo-600 text-white shadow-primary/30 hover:shadow-primary/40"
                )}
            >
                <div className="relative">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-white/20 backdrop-blur-lg flex items-center justify-center shadow-inner">
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    {!isOpen && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500 border-2 border-white"></span>
                        </span>
                    )}
                </div>
                {!isOpen && <span className="font-semibold text-xs sm:text-sm tracking-tight">Nova</span>}
                {isOpen && <X className="h-4 w-4 sm:h-5 sm:w-5" />}
            </motion.button>
        </div>
    );
}
