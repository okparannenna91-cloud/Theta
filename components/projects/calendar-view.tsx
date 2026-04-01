"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format } from "date-fns";

import { Card } from "@/components/ui/card";

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
        <Card className="w-full h-full p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col">
            <div className="mb-6">
                <h3 className="text-xl font-black uppercase tracking-tight">Project Calendar View</h3>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-1">
                    Manage Tasks on Timeline
                </p>
            </div>
            
            <div className="flex-1 min-h-[600px] overflow-hidden rounded-xl border border-slate-200/50 dark:border-slate-800/50 p-4">
                {/* 
                  To ensure FullCalendar looks modern and blends in, we rely on custom 
                  CSS overrides that target .fc classes typically added to index.css
                */}
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
                    editable={false} /* Future iteration: allow drag and drop dates */
                    selectable={false}
                    dayMaxEvents={3} // Limit number of events rendering on a single day
                    eventClick={(info) => {
                        // Future iteration: Open Task details modal
                        console.log("Clicked Task: ", info.event.title);
                    }}
                />
            </div>
        </Card>
    );
}
