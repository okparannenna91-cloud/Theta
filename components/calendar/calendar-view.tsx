"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  parseISO,
  addDays,
  differenceInMinutes,
  isSameMonth
} from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Tag,
  Repeat,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  DndContext, 
  DragOverlay, 
  closestCenter, 
  closestCorners,
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { MotionWrapper, FadeIn } from "@/components/common/motion-wrapper";
import { cn } from "@/lib/utils";

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
            className={cn(
                "text-[9px] px-3 py-1.5 rounded-xl border border-white/20 dark:border-white/10 shadow-sm backdrop-blur-md",
                "flex items-center gap-2 truncate hover:shadow-xl transition-all duration-300 cursor-grab active:cursor-grabbing group",
                isDragging ? "opacity-50" : "opacity-100",
                "bg-white/40 dark:bg-slate-900/40"
            )}
            style={{ ...style, borderLeftColor: event.color || "#4f46e5", borderLeftWidth: "4px" }}
        >
            {event.teamId && <Users className="h-2.5 w-2.5 text-indigo-500 group-hover:scale-110 transition-transform" />}
            {event.recurrence !== "none" && <Repeat className="h-2.5 w-2.5 text-purple-500 group-hover:rotate-180 transition-transform duration-700" />}
            <span className="font-black uppercase tracking-tighter truncate leading-none">{event.title}</span>
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
            className={cn(
                "min-h-[140px] p-4 border-r border-b transition-all duration-500 cursor-pointer group relative overflow-hidden",
                isCurrentMonth ? "bg-transparent" : "bg-slate-900/5 opacity-30",
                i % 7 === 6 ? "border-r-0" : "border-white/10 dark:border-white/5",
                isOver ? "bg-indigo-600/10 backdrop-blur-xl" : "hover:bg-indigo-600/5 backdrop-blur-sm"
            )}
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <span className={cn(
                    "text-xs font-black tracking-widest h-8 w-8 flex items-center justify-center rounded-xl transition-all duration-500",
                    isToday 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-110" 
                        : "text-slate-400 group-hover:text-indigo-600 group-hover:scale-110"
                )}>
                    {format(day, "d")}
                </span>
                {isToday && (
                    <div className="absolute -inset-2 bg-indigo-600/20 blur-xl rounded-full animate-pulse -z-10" />
                )}
            </div>
            <div className="space-y-2 relative z-10">
                {children}
            </div>
            
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Plus className="h-4 w-4 text-indigo-500/20" />
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

    const { showUpgradePrompt } = usePopups();
    const queryClient = useQueryClient();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    // Fetch events
    const { data: calendarData, isLoading } = useQuery({
        queryKey: ["calendar-events", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/calendar?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch events");
            return res.json();
        }
    });

    const events = Array.isArray(calendarData?.events) ? calendarData.events : Array.isArray(calendarData) ? calendarData : [];
    const limits = calendarData?.limits || { max: -1, current: 0 };
    const isLimitReached = limits.max !== -1 && limits.current >= limits.max;

    const upsertMutation = useMutation({
        mutationFn: async (eventData: any) => {
            const url = eventData.id ? `/api/calendar/${eventData.id}` : "/api/calendar";
            const method = eventData.id ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(eventData)
            });
            if (!res.ok) {
                const error = await res.json();
                if (res.status === 403 && error.error?.includes("limit")) {
                    showUpgradePrompt("calendar_events");
                    return;
                }
                throw new Error(error.error || "Failed to save event");
            }
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
        if (isLimitReached) {
            showUpgradePrompt("calendar_events");
            return;
        }
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

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getEventsForDay = (day: Date) => {
        const eventList = (events as CalendarEvent[]) || [];
        return eventList.filter((event: CalendarEvent) => isSameDay(parseISO(event.start), day));
    };

    return (
        <MotionWrapper className="space-y-12 pb-40 relative">
             {/* Neural Background Elements */}
            <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-mesh" />
            <div className="absolute bottom-40 left-0 -z-10 w-[500px] h-[500px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-6xl sm:text-7xl font-black tracking-tighter uppercase leading-none mb-6">
                        Temporal <span className="text-indigo-600">Grid</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                           Synchronization Matrix: {format(currentDate, "MMMM yyyy")}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-2xl border border-white/20 shadow-sm backdrop-blur-xl">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest px-6 h-10 rounded-xl" onClick={() => setCurrentDate(new Date())}>Today</Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    <Button 
                        className={cn(
                            "h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all duration-500",
                            isLimitReached ? "bg-slate-200 dark:bg-slate-800" : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95"
                        )}
                        onClick={() => handleDayClick(new Date())}
                    >
                        <Plus className="h-4 w-4 mr-3" />
                        Sync New Node
                    </Button>
                </div>
            </div>

            <FadeIn delay={0.2}>
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="glass-card border-none rounded-[3rem] overflow-hidden bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl shadow-2xl">
                        <div className="grid grid-cols-7 border-b border-white/10 bg-white/40 dark:bg-slate-900/40">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                <div key={day} className="py-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{day}</div>
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
                                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 pl-2">
                                                + {dayEvents.length - 3} Overflow
                                            </div>
                                        )}
                                    </DroppableDay>
                                );
                            })}
                        </div>
                    </div>

                    <DragOverlay>
                        {activeDragEvent ? (
                            <div
                                className="text-[9px] px-3 py-2 rounded-xl border bg-white/90 dark:bg-slate-900/90 shadow-2xl backdrop-blur-xl scale-110 rotate-3 border-indigo-500 flex items-center gap-2 font-black uppercase tracking-tighter"
                                style={{ borderLeftColor: activeDragEvent.color || "#4f46e5", borderLeftWidth: "4px" }}
                            >
                                <span className="truncate">{activeDragEvent.title}</span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <FadeIn delay={0.4} className="lg:col-span-2">
                    <Card className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 shadow-2xl overflow-hidden group">
                        <CardHeader className="px-0 pt-0 pb-10">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-indigo-600/5 flex items-center justify-center border border-indigo-500/10 group-hover:scale-110 transition-transform duration-500">
                                    <Clock className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Synchronization Queue</CardTitle>
                                    <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Pending temporal nodes</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-0">
                            {events && events.length > 0 ? (
                                <div className="space-y-6">
                                    {(events as CalendarEvent[]).filter((e: CalendarEvent) => new Date(e.start) >= new Date()).slice(0, 5).map((event: CalendarEvent) => (
                                        <div key={event.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 border border-white/20 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-500 group/item">
                                            <div className="flex items-center gap-8">
                                                <div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-950 flex flex-col items-center justify-center border border-indigo-500/10 shadow-xl group-hover/item:scale-110 transition-transform">
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{format(parseISO(event.start), "MMM")}</span>
                                                    <span className="text-2xl font-black tracking-tighter">{format(parseISO(event.start), "dd")}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-black uppercase text-lg tracking-tighter">{event.title}</p>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Clock className="h-3 w-3" />
                                                        {format(parseISO(event.start), "HH:mm")} — {format(parseISO(event.end), "HH:mm")}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className="bg-indigo-600/10 text-indigo-600 border-none rounded-full px-6 py-2 text-[9px] font-black uppercase tracking-widest">{event.type}</Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-400">
                                    <CalendarIcon className="h-20 w-20 mx-auto mb-6 opacity-5 animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No active nodes scheduled.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>

                <FadeIn delay={0.6}>
                    <Card className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 shadow-2xl group h-full">
                        <CardHeader className="px-0 pt-0 pb-10">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-amber-500/5 flex items-center justify-center border border-amber-500/10 group-hover:scale-110 transition-transform duration-500">
                                    <Bell className="h-6 w-6 text-amber-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Neural Alert</CardTitle>
                                    <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Imminent synchronization</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-0">
                            <div className="space-y-6">
                                {events && (events as CalendarEvent[]).filter((e: CalendarEvent) => new Date(e.start) >= new Date()).length > 0 ? (
                                    (() => {
                                        const nextEvent = (events as CalendarEvent[]).filter((e: CalendarEvent) => new Date(e.start) >= new Date())
                                            .sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
                                        return (
                                            <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 relative overflow-hidden group/alert">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/alert:scale-125 transition-transform duration-700">
                                                    <Sparkles className="h-12 w-12 text-amber-500" />
                                                </div>
                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mb-4">CRITICAL PRIORITY</p>
                                                <p className="text-2xl font-black uppercase tracking-tighter mb-2">{nextEvent.title}</p>
                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                                    Synchronization starts {format(parseISO(nextEvent.start), "eeee 'at' HH:mm")}
                                                </p>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="p-10 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-relaxed">System calm. No imminent nodes detected.</p>
                                    </div>
                                )}
                                <Button 
                                    variant="ghost" 
                                    className="w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-100/50 dark:bg-slate-900/50 border border-white/20 hover:bg-white/40 dark:hover:bg-slate-800/40" 
                                    onClick={() => toast.info("Neural link optimization incoming")}
                                >
                                    Global Preferences
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>

            <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                <DialogContent className="sm:max-w-[500px] border-none bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl rounded-[3rem] p-12 shadow-3xl">
                    <DialogHeader className="mb-10">
                        <DialogTitle className="text-4xl font-black uppercase tracking-tighter">
                            {editingEvent ? "Update" : "Initialize"} <span className="text-indigo-600">Node</span>
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">
                            {selectedDate ? format(selectedDate, "PPPP") : "Configure temporal parameters."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Title</Label>
                            <Input 
                                placeholder="Sync Protocol..." 
                                value={title} 
                                onChange={(e: any) => setTitle(e.target.value)} 
                                required 
                                className="h-14 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-white/20 text-lg font-black uppercase tracking-tighter"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Phase</Label>
                                <Input type="time" value={startTime} onChange={(e: any) => setStartTime(e.target.value)} className="h-14 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-white/20 font-black" />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End Phase</Label>
                                <Input type="time" value={endTime} onChange={(e: any) => setEndTime(e.target.value)} className="h-14 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-white/20 font-black" />
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Protocol Color</Label>
                            <div className="flex gap-4 p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-white/20">
                                {["#4f46e5", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"].map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setEventColor(c)}
                                        className={cn(
                                            "h-8 w-8 rounded-full transition-all duration-500",
                                            eventColor === c ? "scale-125 shadow-xl ring-4 ring-offset-2 ring-indigo-500" : "opacity-40 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-6 rounded-[2rem] bg-indigo-600/5 border border-indigo-600/10">
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-tighter">Collective Sync</p>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Share with grid participants.</p>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={isTeamEvent} 
                                onChange={(e: any) => setIsTeamEvent(e.target.checked)} 
                                className="h-6 w-6 rounded-lg border-white/20 bg-white/50 text-indigo-600 focus:ring-indigo-600 cursor-pointer" 
                            />
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                            <Button type="button" variant="ghost" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[11px]" onClick={() => setIsEventDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-indigo-600 hover:bg-indigo-700 shadow-2xl">Initialize Synchronization</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

