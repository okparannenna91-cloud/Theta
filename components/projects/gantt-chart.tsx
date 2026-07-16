"use client";

import { useState, useMemo, useCallback } from "react";
import { format, addMonths, subMonths } from "date-fns";
import {
  BarChart3,
  Download,
  Maximize2,
  Minimize2,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Settings2,
  RotateCcw,
  Workflow,
  GitBranch,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TimelineCanvas from "../timeline/timeline-canvas";
import PresenceAvatars from "../gantt/presence-avatars";
import { toPng } from "html-to-image";
import type { ZoomLevel } from "@/components/shared/timeline/types";

interface GanttChartProps {
  tasks: any[];
  projectId?: string;
  workspaceId?: string;
}

const WORKING_DAYS_LIST = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export function GanttChart({ tasks, projectId, workspaceId }: GanttChartProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [schedulingMode, setSchedulingMode] = useState<"auto" | "manual">("auto");
  const [showCriticalPath, setShowCriticalPath] = useState(true);

  // Working Days dialog
  const [workingDaysOpen, setWorkingDaysOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>({
    mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false,
  });

  // Holidays dialog
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [holidays, setHolidays] = useState<{ name: string; date: string }[]>([]);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");

  // Nav
  const [navDate, setNavDate] = useState(new Date());
  const navLabel = useMemo(() => format(navDate, "MMMM yyyy"), [navDate]);
  const goToPrev = () => setNavDate((d) => subMonths(d, 1));
  const goToNext = () => setNavDate((d) => addMonths(d, 1));

  const handleExport = async () => {
    const element = document.getElementById("project-gantt-capture");
    if (!element) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(element, {
        quality: 0.95,
        backgroundColor: "#ffffff",
        style: { borderRadius: "0" },
      });
      const link = document.createElement("a");
      link.download = `project-gantt-${projectId || "export"}-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const addHoliday = () => {
    if (holidayName && holidayDate) {
      setHolidays((prev) => [...prev, { name: holidayName, date: holidayDate }]);
      setHolidayName("");
      setHolidayDate("");
    }
  };

  const removeHoliday = (index: number) => {
    setHolidays((prev) => prev.filter((_, i) => i !== index));
  };

  const filteredTasks = (Array.isArray(tasks) ? tasks : []).filter((t: any) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`flex flex-col overflow-hidden bg-white dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl transition-all duration-500 ${
        isFullScreen ? "fixed inset-0 z-[100] rounded-none" : "h-[700px]"
      }`}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-30">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Gantt Chart
            </h1>
            <p className="text-[9px] text-muted-foreground font-semibold">
              Drag tasks, resize, create dependencies, auto-shift
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 ml-4">
            {(["day", "week", "month"] as ZoomLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setZoomLevel(lvl)}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  zoomLevel === lvl
                    ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Scheduling mode */}
          <Button
            variant={schedulingMode === "auto" ? "default" : "outline"}
            size="sm"
            className="h-8 text-[10px] font-semibold"
            onClick={() => setSchedulingMode((m) => (m === "auto" ? "manual" : "auto"))}
          >
            <Workflow className="h-3 w-3 mr-1" />
            {schedulingMode === "auto" ? "Auto" : "Manual"}
          </Button>

          {workspaceId && <PresenceAvatars workspaceId={workspaceId} />}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Filter tasks..."
              className="h-8 pl-8 w-40 text-[10px] font-semibold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullScreen(!isFullScreen)}>
            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-[10px] font-semibold" disabled={isExporting} onClick={handleExport}>
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>

          {/* Options menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-semibold">
                <Settings2 className="h-3 w-3 mr-1" /> Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" align="end">
              <DropdownMenuItem className="text-xs" onClick={() => setWorkingDaysOpen(true)}>
                Set Working Days
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => setHolidaysOpen(true)}>
                Manage Holidays
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs" onClick={() => setShowCriticalPath(!showCriticalPath)}>
                <GitBranch className="h-3 w-3 mr-2" /> {showCriticalPath ? "Hide" : "Show"} Critical Path
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs">
                <RotateCcw className="h-3 w-3 mr-2" /> Recalculate All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Context bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-b z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrev}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 min-w-[100px] text-center">
              {navLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {showCriticalPath && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[8px] font-semibold text-rose-500">Critical Path</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[9px] text-slate-400 font-semibold">
          <span>{filteredTasks.length} tasks</span>
          <span>{schedulingMode === "auto" ? "Auto-scheduling" : "Manual"}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Autosave
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" id="project-gantt-capture">
        <TimelineCanvas
          tasks={filteredTasks}
          zoomLevel={zoomLevel}
          searchQuery=""
          showCriticalPath={showCriticalPath}
          schedulingMode={schedulingMode}
          workingDays={workingDays}
          holidays={holidays}
        />
      </div>

      {/* Working Days Dialog */}
      <Dialog open={workingDaysOpen} onOpenChange={setWorkingDaysOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Set Working Days</DialogTitle>
            <DialogDescription className="text-xs">
              Choose which days are considered working days. Non-working days are skipped in scheduling.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {WORKING_DAYS_LIST.map((day) => (
              <div key={day.key} className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{day.label}</Label>
                <Checkbox
                  checked={workingDays[day.key]}
                  onCheckedChange={(checked) =>
                    setWorkingDays((prev) => ({ ...prev, [day.key]: !!checked }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setWorkingDaysOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => setWorkingDaysOpen(false)}>
              Save Working Days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holidays Dialog */}
      <Dialog open={holidaysOpen} onOpenChange={setHolidaysOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Manage Holidays</DialogTitle>
            <DialogDescription className="text-xs">
              Add holidays that should be excluded from scheduling calculations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Holiday name"
                className="h-8 text-xs flex-1"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
              />
              <Input
                type="date"
                className="h-8 text-xs w-36"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
              />
              <Button size="sm" className="h-8" onClick={addHoliday}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {holidays.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {holidays.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <span className="text-xs font-semibold">{h.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{h.date}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeHoliday(i)}>
                      <span className="text-xs text-red-500">✕</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setHolidaysOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
