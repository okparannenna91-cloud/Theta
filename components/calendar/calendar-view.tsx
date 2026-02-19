"use client";

import React, { useState, useEffect } from "react";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval,
    parseISO,
    differenceInMinutes,
} from "date-fns";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    Users,
    Bell,
    Repeat,
    Calendar as CalendarIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    DndContext,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    useDraggable,
    useDroppable,
} from "@dnd-kit/core";

interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start: string;
    end: string;
    allDay: boolean;
    color?: string;
    type: string;
    recurrence?: string;
    teamId?: string;
    reminders?: number[];
}

function DraggableEvent({ event }: { event: CalendarEvent }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: event.id,
        data: { event },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`
                text-[10px] px-2 py-1 rounded-md border bg-background border-slate-200 dark:border-slate-800 shadow-sm 
                flex items-center gap-1 truncate hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
                ${isDragging ? "opacity-50" : "opacity-100"}
            `}
            style={{ ...style, borderLeftColor: event.color || "#4f46e5", borderLeftWidth: "3px" }}
        >
            {event.teamId && <Users className="h-2 w-2 text-indigo-500" />}
            {event.recurrence !== "none" && <Repeat className="h-2 w-2 text-purple-500" />}
            <span className="font-medium truncate">{event.title}</span>
        </div>
    );
}

function DroppableDay({ day, children, onClick, isCurrentMonth, isToday, i }: any) {
    const { isOver, setNodeRef } = useDroppable({
        id: day.toISOString(),
        data: { day },
    });

    return (
        <div
            ref={setNodeRef}
            onClick={() => onClick(day)}
            className={`
                min-h-[120px] p-2 border-r border-b transition-colors cursor-pointer group
                ${isCurrentMonth ? "bg-card" : "bg-muted/10 opacity-50"}
                ${i % 7 === 6 ? "border-r-0" : ""}
                ${isOver ? "bg-indigo-100/50 dark:bg-indigo-900/30" : "hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`
                    text-sm font-semibold h-7 w-7 flex items-center justify-center rounded-full
                    ${isToday ? "bg-indigo-600 text-white shadow-md" : "text-foreground group-hover:text-indigo-600"}
                `}>
                    {format(day, "d")}
                </span>
            </div>
            <div className="space-y-1">
                {children}
            </div>
        </div>
    );
}

export function CalendarView({ workspaceId }: { workspaceId: string }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [activeDragEvent, setActiveDragEvent] = useState<CalendarEvent | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:00");
    const [isTeamEvent, setIsTeamEvent] = useState(false);
    const [recurrence, setRecurrence] = useState("none");
    const [eventColor, setEventColor] = useState("#4f46e5");

    const queryClient = useQueryClient();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    // Fetch events
    const { data: events, isLoading } = useQuery({
        queryKey: ["calendar-events", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/calendar?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch events");
            return res.json() as Promise<CalendarEvent[]>;
        }
    });

    const upsertMutation = useMutation({
        mutationFn: async (eventData: any) => {
            const url = eventData.id ? `/api/calendar/${eventData.id}` : "/api/calendar";
            const method = eventData.id ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(eventData)
            });
            if (!res.ok) throw new Error("Failed to save event");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
            setIsEventDialogOpen(false);
            resetForm();
            toast.success("Calendar updated");
        }
    });

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setStartTime("09:00");
        setEndTime("10:00");
        setIsTeamEvent(false);
        setRecurrence("none");
        setEventColor("#4f46e5");
        setEditingEvent(null);
    };

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setIsEventDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate) return;

        const start = new Date(selectedDate);
        const [h1, m1] = startTime.split(":").map(Number);
        start.setHours(h1, m1);

        const end = new Date(selectedDate);
        const [h2, m2] = endTime.split(":").map(Number);
        end.setHours(h2, m2);

        upsertMutation.mutate({
            id: editingEvent?.id,
            title,
            description,
            start: start.toISOString(),
            end: end.toISOString(),
            workspaceId,
            recurrence,
            color: eventColor,
            type: isTeamEvent ? "meeting" : "event",
            // If it's a team event, we'll associate it with the workspace's default team for now
            // In a full implementation, we'd have a team picker
            teamId: isTeamEvent ? undefined : undefined
        });
    };

    const handleDragStart = (event: any) => {
        const { active } = event;
        setActiveDragEvent(active.data.current.event);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveDragEvent(null);

        if (!over) return;

        const droppedEvent = active.data.current.event as CalendarEvent;
        const targetDay = new Date(over.data.current.day);

        // Calculate new start/end while keeping time the same
        const oldStart = parseISO(droppedEvent.start);
        const oldEnd = parseISO(droppedEvent.end);
        const duration = differenceInMinutes(oldEnd, oldStart);

        const newStart = new Date(targetDay);
        newStart.setHours(oldStart.getHours(), oldStart.getMinutes());

        const newEnd = new Date(newStart);
        newEnd.setMinutes(newEnd.getMinutes() + duration);

        upsertMutation.mutate({
            id: droppedEvent.id,
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
        });
    };

    // Calendar Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getEventsForDay = (day: Date) => {
        return events?.filter(event => isSameDay(parseISO(event.start), day)) || [];
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {format(currentDate, "MMMM yyyy")}
                    </h1>
                    <p className="text-muted-foreground">Reschedule by dragging events to new dates.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md ml-2" onClick={() => handleDayClick(new Date())}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Event
                    </Button>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="bg-card border rounded-2xl overflow-hidden shadow-xl">
                    <div className="grid grid-cols-7 border-b bg-muted/30">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, i) => {
                            const dayEvents = getEventsForDay(day);
                            return (
                                <DroppableDay
                                    key={i}
                                    day={day}
                                    i={i}
                                    isCurrentMonth={isSameMonth(day, monthStart)}
                                    isToday={isSameDay(day, new Date())}
                                    onClick={handleDayClick}
                                >
                                    {dayEvents.slice(0, 3).map((event) => (
                                        <DraggableEvent key={event.id} event={event} />
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="text-[9px] text-muted-foreground pl-1 font-medium italic">+ {dayEvents.length - 3} more</div>
                                    )}
                                </DroppableDay>
                            );
                        })}
                    </div>
                </div>

                <DragOverlay>
                    {activeDragEvent ? (
                        <div
                            className="text-[10px] px-2 py-1 rounded-md border bg-white shadow-xl opacity-90 scale-110 rotate-2 border-indigo-500 flex items-center gap-1"
                            style={{ borderLeftColor: activeDragEvent.color || "#4f46e5", borderLeftWidth: "3px" }}
                        >
                            <span className="font-medium">{activeDragEvent.title}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-indigo-500" />
                            Upcoming Events
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {events && events.length > 0 ? (
                            <div className="space-y-4">
                                {events.filter(e => new Date(e.start) >= new Date()).slice(0, 5).map(event => (
                                    <div key={event.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-900 flex flex-col items-center justify-center border shadow-sm">
                                                <span className="text-[10px] font-bold text-indigo-600 uppercase">{format(parseISO(event.start), "MMM")}</span>
                                                <span className="text-sm font-bold">{format(parseISO(event.start), "dd")}</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{event.title}</p>
                                                <p className="text-xs text-muted-foreground">{format(parseISO(event.start), "hh:mm aa")} - {format(parseISO(event.end), "hh:mm aa")}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="capitalize">{event.type}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>No upcoming events scheduled.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Bell className="h-5 w-5 text-orange-500" />
                            Quick Reminders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {events && events.filter(e => new Date(e.start) >= new Date()).length > 0 ? (
                                (() => {
                                    const nextEvent = events.filter(e => new Date(e.start) >= new Date())
                                        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
                                    return (
                                        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                                            <p className="text-xs font-bold text-orange-700 dark:text-orange-400">NEXT UP</p>
                                            <p className="text-sm mt-1 font-semibold">{nextEvent.title}</p>
                                            <p className="text-[10px] text-orange-600/70 mt-1">
                                                Starting {format(parseISO(nextEvent.start), "eeee 'at' hh:mm aa")}
                                            </p>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-dashed text-center">
                                    <p className="text-xs text-muted-foreground">No upcoming events today</p>
                                </div>
                            )}
                            <Button variant="outline" className="w-full text-xs font-bold" onClick={() => toast.info("Notification settings coming soon")}>
                                Notification Settings
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
                        <DialogDescription>{selectedDate ? format(selectedDate, "PPPP") : "Set your event details below."}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Event Title</Label>
                            <Input placeholder="Meeting with client..." value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Optional)</Label>
                            <Textarea placeholder="Add more details..." value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Event Color</Label>
                            <div className="flex gap-2">
                                {["#4f46e5", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"].map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setEventColor(c)}
                                        className={`h-6 w-6 rounded-full border-2 transition-all ${eventColor === c ? "border-black scale-110 shadow-md" : "border-transparent opacity-70 hover:opacity-100"}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div className="space-y-0.5">
                                <p className="text-sm font-semibold">Team Event</p>
                                <p className="text-[10px] text-muted-foreground">Share this event with everyone in the team.</p>
                            </div>
                            <input type="checkbox" checked={isTeamEvent} onChange={(e) => setIsTeamEvent(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                        </div>
                        <div className="space-y-2">
                            <Label>Recurrence</Label>
                            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="w-full h-10 px-3 py-2 rounded-md border text-sm bg-background">
                                <option value="none">Does not repeat</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Save Event</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

