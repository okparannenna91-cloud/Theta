"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Clock, Save } from "lucide-react";
import { toast } from "sonner";

interface TimeTrackerProps {
    taskId: string;
    onTimeLogged?: () => void;
}

export function TimeTracker({ taskId, onTimeLogged }: TimeTrackerProps) {
    const [isActive, setIsActive] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive) {
            timerRef.current = setInterval(() => {
                setSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive]);

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs.toString().padStart(2, "0")}:${mins
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const handleToggle = () => {
        setIsActive(!isActive);
    };

    const handleReset = () => {
        setIsActive(false);
        setSeconds(0);
    };

    const handleSave = async () => {
        if (seconds === 0) return;

        try {
            const res = await fetch(`/api/tasks/${taskId}/time-logs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ duration: seconds }),
            });

            if (!res.ok) throw new Error("Failed to save time log");

            toast.success("Time log saved");
            setSeconds(0);
            setIsActive(false);
            if (onTimeLogged) onTimeLogged();
        } catch (error) {
            toast.error("Failed to save time log");
        }
    };

    return (
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Time Tracking</span>
                </div>
                <div className="text-xl font-mono font-black tabular-nums text-indigo-600 dark:text-indigo-400">
                    {formatTime(seconds)}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {!isActive ? (
                    <Button
                        size="sm"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold"
                        onClick={handleToggle}
                    >
                        <Play className="h-4 w-4 fill-current" />
                        Start Timer
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2 font-bold"
                        onClick={handleToggle}
                    >
                        <Pause className="h-4 w-4 fill-current" />
                        Pause
                    </Button>
                )}

                <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 border-slate-200 dark:border-slate-800"
                    onClick={handleReset}
                    disabled={seconds === 0}
                >
                    <Square className="h-4 w-4 text-slate-400" />
                </Button>

                <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-200/50 dark:border-emerald-800/50"
                    onClick={handleSave}
                    disabled={seconds === 0 || isActive}
                >
                    <Save className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
