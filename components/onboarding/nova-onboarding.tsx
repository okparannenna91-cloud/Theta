"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles, Send, Bot, CheckCircle2, Loader2,
    Building2, Users, Target, Clock, Zap, Brain,
    ArrowRight, Globe, Calendar, Settings, ChevronLeft,
    Rocket, Star, Workflow, BarChart3, FolderKanban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type OnboardingPhase =
    | "welcome"
    | "discovery"
    | "blueprint"
    | "creating"
    | "first_win"
    | "complete";

interface OnboardingData {
    companyName: string;
    companySize: string;
    industry: string;
    website: string;
    userRole: string;
    department: string;
    leadershipLevel: string;
    primaryGoal: string;
    problemsToSolve: string[];
    teamSize: number;
    methodology: string;
    timezone: string;
    workingDays: string[];
    aiInvolvement: "proactive" | "balanced" | "on-demand";
}

interface ChatMessage {
    role: "nova" | "user";
    content: string;
    options?: string[];
    field?: keyof OnboardingData;
    multiple?: boolean;
}

const PROGRESS_STEPS = [
    { id: "understanding", label: "Understanding your team...", icon: Brain },
    { id: "workspace", label: "Creating workspace...", icon: Building2 },
    { id: "teams", label: "Setting up teams...", icon: Users },
    { id: "projects", label: "Building project structure...", icon: FolderKanban },
    { id: "statuses", label: "Creating task statuses...", icon: CheckCircle2 },
    { id: "calendar", label: "Preparing calendars...", icon: Calendar },
    { id: "dashboard", label: "Building dashboards...", icon: BarChart3 },
    { id: "roadmap", label: "Creating roadmap...", icon: Workflow },
    { id: "docs", label: "Preparing documentation...", icon: Globe },
    { id: "nova", label: "Configuring Nova...", icon: Sparkles },
    { id: "automations", label: "Setting automations...", icon: Zap },
    { id: "permissions", label: "Configuring permissions...", icon: Settings },
    { id: "personalize", label: "Personalizing your workspace...", icon: Star },
];

interface NovaOnboardingProps {
    onComplete: () => void;
}

export function NovaOnboarding({ onComplete }: NovaOnboardingProps) {
    const [phase, setPhase] = useState<OnboardingPhase>("welcome");
    const [data, setData] = useState<OnboardingData>({
        companyName: "", companySize: "", industry: "", website: "",
        userRole: "", department: "", leadershipLevel: "",
        primaryGoal: "", problemsToSolve: [],
        teamSize: 1, methodology: "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        aiInvolvement: "balanced",
    });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [creating, setCreating] = useState(false);
    const [currentProgress, setCurrentProgress] = useState(0);
    const [inputValue, setInputValue] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, phase]);

    const addMessage = useCallback((msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
    }, []);

    const conversationFlow: ChatMessage[] = [
        {
            role: "nova",
            content: "Hi! I'm Nova, your AI Project Manager. 🚀\n\nI'll learn about your team and build a workspace that's ready to use in about two minutes. Let's start — what's your company called?",
            field: "companyName",
        },
        {
            role: "nova",
            content: "Great! How many people are in your company?",
            options: ["Just me", "2-5", "6-20", "21-50", "50+"],
            field: "companySize",
        },
        {
            role: "nova",
            content: "What industry are you in?",
            options: ["Software / Tech", "Marketing / Agency", "Sales / CRM", "Education", "Healthcare", "Construction", "Operations", "Other"],
            field: "industry",
        },
        {
            role: "nova",
            content: "What's your role at the company?",
            options: ["Founder / CEO", "Product Manager", "Engineering Lead", "Marketing Lead", "Operations Manager", "Team Lead", "Individual Contributor"],
            field: "userRole",
        },
        {
            role: "nova",
            content: "What department do you work in?",
            options: ["Engineering", "Product", "Marketing", "Sales", "Operations", "Design", "Leadership"],
            field: "department",
        },
        {
            role: "nova",
            content: "What brings you to Theta? What are you hoping to manage?",
            options: ["Software projects", "Marketing campaigns", "Client work", "Sales pipeline", "Team operations", "Personal productivity"],
            field: "primaryGoal",
        },
        {
            role: "nova",
            content: "How many teammates will work with you in this workspace?",
            options: ["Just me", "2-5 people", "6-15 people", "16-30 people", "30+"],
            field: "teamSize",
        },
        {
            role: "nova",
            content: "How does your team work? What methodology fits best?",
            options: ["Agile / Scrum", "Kanban", "Waterfall", "Hybrid", "Custom / No methodology"],
            field: "methodology",
        },
        {
            role: "nova",
            content: "How involved should I be? I can be a proactive partner or stay quiet until you ask.",
            options: ["Fully proactive — suggest everything", "Balanced — suggest when relevant", "Only when I ask"],
            field: "aiInvolvement",
        },
    ];

    const startDiscovery = () => {
        setPhase("discovery");
        setCurrentStep(0);
        setShowOptions(true);
        addMessage(conversationFlow[0]);
    };

    const handleUserInput = (value: string) => {
        addMessage({ role: "user", content: value });
        setInputValue("");

        const current = conversationFlow[currentStep];
        if (current.field) {
            const field = current.field;
            if (field === "teamSize") {
                const sizes: Record<string, number> = {
                    "Just me": 1, "2-5 people": 4, "6-15 people": 10, "16-30 people": 22, "30+": 35,
                };
                setData(prev => ({ ...prev, teamSize: sizes[value] || 1 }));
            } else if (field === "problemsToSolve") {
                setData(prev => ({ ...prev, problemsToSolve: [...prev.problemsToSolve, value] }));
            } else {
                setData(prev => ({ ...prev, [field]: value }));
            }
        }

        const nextStep = currentStep + 1;
        if (nextStep < conversationFlow.length) {
            setTimeout(() => {
                setCurrentStep(nextStep);
                addMessage(conversationFlow[nextStep]);
                setShowOptions(!!conversationFlow[nextStep].options);
            }, 600);
        } else {
            setTimeout(() => {
                setPhase("blueprint");
                setShowOptions(false);
            }, 800);
        }
    };

    const startCreation = async () => {
        setPhase("creating");
        setCreating(true);
        setCurrentProgress(0);

        const createdWorkspaceId = await runCreation();

        if (createdWorkspaceId) {
            setPhase("first_win");
        } else {
            setPhase("complete");
            toast.error("Workspace creation had a minor issue. You can continue.");
        }
        setCreating(false);
    };

    const runCreation = async () => {
        const progressInterval = setInterval(() => {
            setCurrentProgress(prev => {
                if (prev >= PROGRESS_STEPS.length - 1) {
                    clearInterval(progressInterval);
                    return PROGRESS_STEPS.length - 1;
                }
                return prev + 1;
            });
        }, 2000);

        try {
            const wsRes = await fetch("/api/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.companyName || `${data.industry || "My"} Workspace`,
                    plan: "free",
                }),
            });
            if (!wsRes.ok) throw new Error("Workspace creation failed");
            const workspace = await wsRes.json();
            const workspaceId = workspace.id;

            const projectRes = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.primaryGoal === "Software projects" ? "Engineering Sprint" :
                          data.primaryGoal === "Marketing campaigns" ? "Marketing Campaign" :
                          data.primaryGoal === "Client work" ? "Client Projects" :
                          data.primaryGoal === "Sales pipeline" ? "Sales Pipeline" :
                          data.primaryGoal === "Team operations" ? "Team Operations" :
                          "Getting Started",
                    description: `Auto-created for ${data.companyName || "your team"} — ${data.primaryGoal || "getting started"}`,
                    workspaceId,
                    visibility: "team_access",
                }),
            });
            if (projectRes.ok) {
                const project = await projectRes.json();
                await fetch("/api/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: "Welcome! Let's set up your workspace together",
                        description: "This is your first task. Nova is ready to help you organize work, create projects, and automate workflows.",
                        priority: "high",
                        status: "todo",
                        workspaceId,
                        projectId: project.id,
                    }),
                });
            }

            await fetch("/api/user/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    onboardingComplete: true,
                    onboardingContext: JSON.stringify({
                        company: data.companyName,
                        industry: data.industry,
                        role: data.userRole,
                        goal: data.primaryGoal,
                        teamSize: data.teamSize,
                        methodology: data.methodology,
                        aiMode: data.aiInvolvement,
                    }),
                }),
            });

            clearInterval(progressInterval);
            setCurrentProgress(PROGRESS_STEPS.length - 1);
            return workspaceId;
        } catch (error) {
            clearInterval(progressInterval);
            console.warn("[NovaOnboarding] Creation error:", error);
            return null;
        }
    };

    const completeOnboarding = () => {
        setPhase("complete");
        onComplete();
    };

    if (phase === "welcome") {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-xl"
                >
                    <Card className="border-none shadow-sm rounded-lg overflow-hidden bg-card">
                        <CardContent className="p-0">
                            <div className="p-8 sm:p-12 text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                    className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-500/30"
                                >
                                    <Bot className="w-10 h-10 text-white" />
                                </motion.div>

                                <motion.h1
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-3xl sm:text-4xl font-black text-foreground mb-3"
                                >
                                    Welcome to Theta
                                </motion.h1>

                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-xl text-muted-foreground mb-2"
                                >
                                    Meet <span className="font-bold text-primary">Nova</span>, your AI Project Manager
                                </motion.p>

                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="text-sm text-muted-foreground mb-10 max-w-md mx-auto"
                                >
                                    I&apos;ll learn how your team works and prepare a workspace that&apos;s ready to use.
                                </motion.p>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 }}
                                >
                                    <Button
                                        onClick={startDiscovery}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-16 rounded-2xl text-lg font-black shadow-lg shadow-indigo-500/30 group"
                                    >
                                        Get Started
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (phase === "discovery") {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-xl"
                >
                    <Card className="border-none shadow-sm rounded-lg overflow-hidden bg-card">
                        <CardContent className="p-0 flex flex-col" style={{ maxHeight: "90vh" }}>
                            <div className="p-4 border-b bg-gradient-to-r from-indigo-500/5 to-purple-500/5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Nova Setup</p>
                                    <p className="text-xs text-muted-foreground">
                                        Step {currentStep + 1} of {conversationFlow.length}
                                    </p>
                                </div>
                                <div className="ml-auto flex gap-1">
                                    {conversationFlow.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full transition-colors ${
                                                i <= currentStep ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
                                <AnimatePresence initial={false}>
                                    {messages.map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm ${
                                                    msg.role === "user"
                                                        ? "bg-indigo-600 text-white rounded-tr-none"
                                                        : "bg-muted text-foreground rounded-tl-none border border-border/50"
                                                }`}
                                            >
                                                {msg.role === "nova" && (
                                                    <p className="text-[10px] font-bold mb-1 uppercase tracking-wider text-primary/70">
                                                        Nova
                                                    </p>
                                                )}
                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="p-4 border-t bg-muted/30">
                                {showOptions && currentStep < conversationFlow.length && conversationFlow[currentStep].options ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {conversationFlow[currentStep].options!.map((opt) => (
                                            <Button
                                                key={opt}
                                                variant="outline"
                                                className="h-12 rounded-xl text-sm font-medium hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                                onClick={() => handleUserInput(opt)}
                                            >
                                                {opt}
                                            </Button>
                                        ))}
                                        <Button
                                            variant="ghost"
                                            className="h-12 rounded-xl text-xs text-muted-foreground col-span-2"
                                            onClick={() => {
                                                setShowOptions(false);
                                                setTimeout(() => inputRef.current?.focus(), 100);
                                            }}
                                        >
                                            Type your own answer...
                                        </Button>
                                    </div>
                                ) : (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (inputValue.trim()) {
                                                handleUserInput(inputValue.trim());
                                            }
                                        }}
                                        className="flex gap-3"
                                    >
                                        <Input
                                            ref={inputRef}
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="Type your answer..."
                                            className="h-12 rounded-xl bg-background border-border"
                                            autoFocus
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={!inputValue.trim()}
                                            className="h-12 w-12 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (phase === "blueprint") {
        const industry = data.industry;
        const suggestions = industry?.includes("Software") || industry?.includes("Tech")
            ? ["Sprint Board", "Bug Tracker", "Product Roadmap", "Engineering Docs"]
            : industry?.includes("Marketing") || industry?.includes("Agency")
            ? ["Campaign Planner", "Content Calendar", "Client Dashboard", "Creative Requests"]
            : industry?.includes("Sales")
            ? ["Pipeline Board", "Deal Tracker", "Forecast Dashboard", "Lead Management"]
            : ["Getting Started Board", "Task Tracker", "Team Dashboard", "Project Docs"];

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-xl"
                >
                    <Card className="border-none shadow-sm rounded-lg overflow-hidden bg-card">
                        <CardContent className="p-0">
                            <div className="p-8 sm:p-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Brain className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">Workspace Blueprint</h2>
                                        <p className="text-xs text-muted-foreground">Nova's plan for your workspace</p>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-2xl p-6 mb-6 border border-primary/10">
                                    <p className="text-sm text-foreground font-medium mb-4">
                                        I&apos;ve learned enough. Here&apos;s what I&apos;ll create for you:
                                    </p>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm">
                                            <Building2 className="w-4 h-4 text-primary" />
                                            <span className="text-muted-foreground">
                                                Workspace: <strong className="text-foreground">{data.companyName || "Your Workspace"}</strong>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Users className="w-4 h-4 text-primary" />
                                            <span className="text-muted-foreground">
                                                Team: <strong className="text-foreground">{data.teamSize} people</strong> &middot; {data.methodology || "Agile"} methodology
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Target className="w-4 h-4 text-primary" />
                                            <span className="text-muted-foreground">
                                                Focus: <strong className="text-foreground">{data.primaryGoal || "Getting started"}</strong>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Zap className="w-4 h-4 text-primary" />
                                            <span className="text-muted-foreground">
                                                Nova mode: <strong className="text-foreground capitalize">{data.aiInvolvement}</strong>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Suggested starter boards</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {suggestions.map((s) => (
                                            <div key={s} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
                                                <FolderKanban className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                <span className="text-xs text-foreground">{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setPhase("discovery")} className="flex-1 h-14 rounded-xl font-semibold">
                                        <ChevronLeft className="w-4 h-4 mr-2" />
                                        Adjust
                                    </Button>
                                    <Button onClick={startCreation} className="flex-[2] h-14 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold shadow-lg shadow-indigo-500/30">
                                        Looks Good — Create Workspace
                                        <Rocket className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (phase === "creating") {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-lg"
                >
                    <Card className="border-none shadow-sm rounded-lg overflow-hidden bg-card">
                        <CardContent className="p-8 sm:p-10">
                            <div className="text-center mb-8">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                    className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/30"
                                >
                                    <Bot className="w-8 h-8 text-white" />
                                </motion.div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">Building Your Workspace</h2>
                                <p className="text-sm text-muted-foreground">Nova is setting everything up...</p>
                            </div>

                            <div className="space-y-3">
                                {PROGRESS_STEPS.map((step, i) => {
                                    const isActive = i === currentProgress;
                                    const isDone = i < currentProgress;
                                    const isPending = i > currentProgress;
                                    return (
                                        <motion.div
                                            key={step.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{
                                                opacity: isDone ? 0.5 : 1,
                                                x: 0,
                                            }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                                isActive
                                                    ? "bg-primary/10 border border-primary/20"
                                                    : isDone
                                                    ? "bg-muted/30"
                                                    : "opacity-40"
                                            }`}
                                        >
                                            {isDone ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                            ) : isActive ? (
                                                <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                                            ) : (
                                                <step.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                            )}
                                            <span className={`text-sm ${
                                                isActive ? "text-foreground font-medium" : "text-muted-foreground"
                                            }`}>
                                                {step.label}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (phase === "first_win") {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-xl"
                >
                    <Card className="border-none shadow-sm rounded-lg overflow-hidden bg-card">
                        <CardContent className="p-0">
                            <div className="p-8 sm:p-10 text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                                    className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30"
                                >
                                    <Sparkles className="w-10 h-10 text-white" />
                                </motion.div>

                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-2xl font-bold text-foreground mb-2"
                                >
                                    Everything is ready!
                                </motion.h2>

                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto"
                                >
                                    Your workspace has been created with projects, boards, and starter tasks.
                                    What would you like to work on first?
                                </motion.p>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="space-y-3"
                                >
                                    <Button
                                        onClick={completeOnboarding}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 rounded-2xl font-semibold shadow-lg shadow-indigo-500/30"
                                    >
                                        <Rocket className="w-5 h-5 mr-2" />
                                        View Dashboard
                                    </Button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            className="h-12 rounded-xl text-sm font-medium"
                                            onClick={() => {
                                                completeOnboarding();
                                                window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "Suggest next actions for my workspace" } }));
                                            }}
                                        >
                                            <Sparkles className="w-4 h-4 mr-2 text-primary" />
                                            Ask Nova
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-12 rounded-xl text-sm font-medium"
                                            onClick={() => {
                                                completeOnboarding();
                                                window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "Plan this week's priorities for my team" } }));
                                            }}
                                        >
                                            <Calendar className="w-4 h-4 mr-2 text-primary" />
                                            Plan This Week
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return null;
}
