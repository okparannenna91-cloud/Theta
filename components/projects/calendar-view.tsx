"use client";

import { useMemo, Component, type ReactNode } from "react";
import dynamic from "next/dynamic";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import { Card } from "@/components/ui/card";
import { toast } from "sonner";

class CalendarErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return (
                <Card className="w-full h-full p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-xl border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                    <p className="text-sm text-muted-foreground">Calendar failed to load. Please refresh the page.</p>
                </Card>
            );
        }
        return this.props.children;
    }
}

interface CalendarViewProps {
    tasks: any[];
}

export function CalendarView({ tasks }: CalendarViewProps) {
    const events = useMemo(() => {
        return tasks
            .filter((t) => t.dueDate || t.createdAt) // Ensure there's a date to plot
            .map((task) => {
                const isHighPriority = task.priority === "high";
                const isMediumPriority = task.priority === "medium";

                // Map state to FullCalendar structure
                return {
                    id: task.id,
                    title: task.title,
                    // Use dueDate if available, otherwise createdAt for tasks without explicit deadlines
                    start: task.dueDate || task.createdAt, 
                    end: task.dueDate,
                    allDay: true, // In a project view, tasks are typicaly standard "all day" blocks
                    backgroundColor: isHighPriority 
                        ? "#ef4444" // red-500
                        : isMediumPriority 
                            ? "#fbbf24" // amber-400
                            : "#10b981", // emerald-500
                    borderColor: "transparent",
                    extendedProps: {
                        status: task.status,
                        priority: task.priority
                    }
                };
            });
    }, [tasks]);

    return (
        <Card className="w-full h-full p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-xl border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col">
            <div className="mb-6">
                <h3 className="text-xl font-semibold">Project Calendar View</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">
                    Manage Tasks on Timeline
                </p>
            </div>
            
            <div className="flex-1 min-h-[600px] overflow-hidden rounded-xl border border-slate-200/50 dark:border-slate-800/50 p-4">
                <CalendarErrorBoundary>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: "dayGridMonth,timeGridWeek,timeGridDay"
                        }}
                        events={events}
                        height="100%"
                        editable={false}
                        selectable={false}
                        dayMaxEvents={3}
                        eventClick={(info: any) => {
                            const task = tasks.find(t => t.id === info.event.id);
                            if (task) {
                                // In future: open task detail modal
                                toast.info(`Task: ${info.event.title}`);
                            }
                        }}
                    />
                </CalendarErrorBoundary>
            </div>
        </Card>
    );
}
