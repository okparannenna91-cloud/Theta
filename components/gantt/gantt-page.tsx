"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import {
    BarChart3,
    Filter,
    Plus,
    ChevronLeft,
    ChevronRight,
    Search,
    Download,
    Settings2,
    Clock,
    Maximize2,
    Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TimelineCanvas from "../timeline/timeline-canvas";
import PresenceAvatars from "./presence-avatars";
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
            const dataUrl = await toPng(element, { quality: 0.95, style: { borderRadius: '0' } });
            const link = document.createElement('a');
            link.download = `theta-gantt-${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) { console.error('Export failed', err); }
        finally { setIsExporting(false); }
    };

    const tasks = tasksData || [];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-[600px] w-full rounded-lg" />
            </div>
        );
    }

    return (
        <div className={`flex flex-col overflow-hidden transition-all duration-500 ${isFullScreen ? "fixed inset-0 z-[100] bg-background" : "h-[calc(100vh-100px)]"}`}>
            <header className="flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Gantt Chart
                        <Badge variant="outline" className="text-xs rounded-md px-2 py-0">Enterprise</Badge>
                    </h1>
                    <div className="flex bg-muted/50 p-0.5 rounded-md border">
                        {["hour", "day", "week", "month", "quarter", "year"].map((lvl) => (
                            <button key={lvl} onClick={() => setZoomLevel(lvl as any)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${zoomLevel === lvl ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {activeWorkspaceId && <PresenceAvatars workspaceId={activeWorkspaceId} />}
                    <div className="relative w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Filter tasks..." className="h-9 pl-9 text-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setIsFullScreen(!isFullScreen)}>
                        {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    <Button className="h-9 text-xs" onClick={() => {}}>
                        <Plus className="h-3.5 w-3.5 mr-2" /> Add Phase
                    </Button>
                </div>
            </header>

            <div className="flex items-center justify-between px-6 py-2 border-b bg-muted/20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md">
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs font-medium min-w-[120px] text-center">October - December 2026</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md">
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div className="h-5 w-px bg-border" />
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical Path
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Resource Balanced
                        </span>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                    <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Baseline Compare
                </Button>
            </div>

            <div className="flex-1 relative overflow-hidden" id="gantt-capture-area">
                <TimelineCanvas tasks={tasks} zoomLevel={zoomLevel} searchQuery={searchQuery} />
            </div>

                        
            <footer className="h-12 bg-background/80 backdrop-blur-sm border-t flex items-center justify-between px-6">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Last Sync: Just Now
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={isExporting} onClick={handleExport}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> {isExporting ? "Exporting..." : "Export PNG"}
                </Button>
            </footer>
        </div>
    );
}
