"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion, AnimatePresence } from "framer-motion";
import { 
    BarChart3, 
    Filter, 
    Plus, 
    ChevronLeft, 
    ChevronRight,
    Search,
    Download,
    Settings2,
    LayoutGrid,
    Clock,
    Sparkles,
    Maximize2,
    Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TimelineCanvas from "../timeline/timeline-canvas";
import { MotionWrapper } from "@/components/common/motion-wrapper";
import PresenceAvatars from "./presence-avatars";
import AIScheduleAssistant from "./ai-assistant";
import { toPng } from "html-to-image";

export default function GanttPage() {
    const { activeWorkspaceId } = useWorkspace();
    const [zoomLevel, setZoomLevel] = useState<"hour" | "day" | "week" | "month" | "quarter" | "year">("week");
    const [searchQuery, setSearchQuery] = useState("");
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const { data: tasksData, isLoading } = useQuery({
        queryKey: ["timeline-tasks", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/tasks?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch tasks");
            const data = await res.json();
            return data.tasks;
        },
        enabled: !!activeWorkspaceId
    });

    const handleExport = async () => {
        const element = document.getElementById("gantt-capture-area");
        if (!element) return;
        
        setIsExporting(true);
        try {
            const dataUrl = await toPng(element, { 
                quality: 0.95,
                backgroundColor: "#020617",
                style: { borderRadius: '0' }
            });
            const link = document.createElement('a');
            link.download = `theta-gantt-${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Export failed', err);
        } finally {
            setIsExporting(false);
        }
    };

    const tasks = tasksData || [];

    if (isLoading) {
        return (
            <div className="p-8 space-y-6 h-full">
                <Skeleton className="h-20 w-full rounded-3xl" />
                <Skeleton className="h-[600px] w-full rounded-3xl" />
            </div>
        );
    }

    return (
        <MotionWrapper className={`flex flex-col overflow-hidden bg-background transition-all duration-500 ${isFullScreen ? "fixed inset-0 z-[100]" : "h-[calc(100vh-100px)]"}`}>
            {/* High-End Glass Header */}
            <header className="flex items-center justify-between px-8 py-6 border-b bg-background/50 backdrop-blur-3xl z-30">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                            <BarChart3 className="h-8 w-8 text-primary" />
                            Gantt Chart
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest text-[9px]">Enterprise</Badge>
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Advanced Dependency & Resource Orchestration</p>
                    </div>

                    <div className="flex bg-secondary/50 p-1 rounded-2xl border border-white/5 shadow-inner ml-4">
                        {["hour", "day", "week", "month", "quarter", "year"].map((lvl) => (
                            <button
                                key={lvl}
                                onClick={() => setZoomLevel(lvl as any)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    zoomLevel === lvl 
                                    ? "bg-white dark:bg-slate-800 text-primary shadow-lg" 
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {activeWorkspaceId && <PresenceAvatars workspaceId={activeWorkspaceId} />}
                    
                    <div className="flex items-center gap-3 border-l border-white/10 pl-6">
                        <div className="relative group w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input 
                                placeholder="FILTER TIMELINE..." 
                                className="h-10 pl-10 rounded-2xl text-[10px] font-black uppercase tracking-widest border-white/5 bg-secondary/30 focus-visible:ring-primary/30"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-2xl h-10 w-10 border-white/10 bg-white/5"
                            onClick={() => setIsFullScreen(!isFullScreen)}
                        >
                            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                        
                        <Button className="rounded-2xl h-10 shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px] px-6">
                            <Plus className="h-3.5 w-3.5 mr-2" /> Add Phase
                        </Button>
                    </div>
                </div>
            </header>

            {/* Sub-navigation Context */}
            <div className="flex items-center justify-between px-8 py-3 bg-secondary/10 border-b z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground min-w-[150px] text-center">October - December 2026</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="h-6 w-[1px] bg-border" />
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500/80">Critical Path Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/80">Resource Balanced</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" className="text-[9px] font-black uppercase tracking-widest h-8 px-4 rounded-xl text-muted-foreground hover:text-primary">
                        <Settings2 className="h-3.5 w-3.5 mr-2" /> Baseline Compare
                    </Button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden" id="gantt-capture-area">
                <TimelineCanvas 
                    tasks={tasks} 
                    zoomLevel={zoomLevel} 
                    searchQuery={searchQuery} 
                />
            </div>

            <AIScheduleAssistant tasks={tasks} />

            {/* Action Bar Footer */}
            <footer className="h-14 bg-background/80 backdrop-blur-xl border-t flex items-center justify-between px-8 z-30">
                <div className="flex items-center gap-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Last Sync: Just Now
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={isExporting}
                        className="rounded-xl h-8 text-[9px] font-black uppercase tracking-widest"
                        onClick={handleExport}
                    >
                        <Download className="h-3 w-3 mr-2" /> {isExporting ? "Exporting..." : "Export PNG"}
                    </Button>
                </div>
            </footer>
        </MotionWrapper>
    );
}
