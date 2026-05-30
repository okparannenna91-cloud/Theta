"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    BarChart3, 
    Download,
    Maximize2,
    Minimize2,
    Settings2,
    Sparkles,
    Search,
    ChevronLeft,
    ChevronRight,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TimelineCanvas from "../timeline/timeline-canvas";
import PresenceAvatars from "../gantt/presence-avatars";
import AIScheduleAssistant from "../gantt/ai-assistant";
import { toPng } from "html-to-image";
import { ZoomLevel } from "../timeline/timeline-page";

interface GanttChartProps {
    tasks: any[];
    projectId?: string;
    workspaceId?: string;
}

export function GanttChart({ tasks, projectId, workspaceId }: GanttChartProps) {
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
    const [searchQuery, setSearchQuery] = useState("");
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        const element = document.getElementById("project-gantt-capture");
        if (!element) return;
        
        setIsExporting(true);
        try {
            const dataUrl = await toPng(element, { 
                quality: 0.95,
                backgroundColor: "#ffffff",
                style: { borderRadius: '0' }
            });
            const link = document.createElement('a');
            link.download = `project-gantt-${projectId || "export"}-${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Export failed', err);
        } finally {
            setIsExporting(false);
        }
    };

    const filteredTasks = (Array.isArray(tasks) ? tasks : []).filter((t: any) => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`flex flex-col overflow-hidden bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl transition-all duration-500 ${isFullScreen ? "fixed inset-0 z-[100] rounded-none" : "h-[700px]"}`}>
            {/* Enterprise Header */}
            <header className="flex items-center justify-between px-8 py-6 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl z-30">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                            <BarChart3 className="h-6 w-6 text-indigo-600" />
                            Project Timeline
                        </h1>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Dependency & Resource Orchestration</p>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner ml-4">
                        {(["day", "week", "month", "quarter"] as ZoomLevel[]).map((lvl) => (
                            <button
                                key={lvl}
                                onClick={() => setZoomLevel(lvl)}
                                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    zoomLevel === lvl 
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-md" 
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                                }`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {workspaceId && <PresenceAvatars workspaceId={workspaceId} />}
                    
                    <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800 pl-6">
                        <div className="relative group w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input 
                                placeholder="FILTER..." 
                                className="h-9 pl-9 rounded-xl text-[9px] font-black uppercase tracking-widest border-none bg-slate-100 dark:bg-slate-800 focus-visible:ring-indigo-500/30"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-xl h-9 w-9 border-slate-200 dark:border-slate-700"
                            onClick={() => setIsFullScreen(!isFullScreen)}
                        >
                            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                        
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={isExporting}
                            className="rounded-xl h-9 text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700"
                            onClick={handleExport}
                        >
                            <Download className="h-3.5 w-3.5 mr-2" /> Export
                        </Button>
                    </div>
                </div>
            </header>

            {/* View Context Bar */}
            <div className="flex items-center justify-between px-8 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-b z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 min-w-[120px] text-center">October 2026</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-rose-500">Critical Path</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Balanced</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Autosave Active
                    </div>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden" id="project-gantt-capture">
                <TimelineCanvas 
                    tasks={filteredTasks} 
                    zoomLevel={zoomLevel} 
                    searchQuery={""} // Search is handled by parent filtering here
                />
            </div>

            <AIScheduleAssistant tasks={filteredTasks} />
        </div>
    );
}
