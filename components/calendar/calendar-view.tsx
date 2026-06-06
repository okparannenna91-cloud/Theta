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
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { FadeIn } from "@/components/common/motion-wrapper";
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
                "text-[10px] px-3 py-1.5 rounded-lg border shadow-sm",
                "flex items-center gap-2 truncate hover:shadow-md transition-all duration-300 cursor-grab active:cursor-grabbing group",
                isDragging ? "opacity-50" : "opacity-100",
                "bg-card/40"
            )}
            style={{ ...style, borderLeftColor: event.color || "#4f46e5", borderLeftWidth: "4px" }}
        >
            {event.teamId && <Users className="h-2.5 w-2.5 text-primary group-hover:scale-110 transition-transform" />}
            {event.recurrence !== "none" && <Repeat className="h-2.5 w-2.5 text-primary group-hover:rotate-180 transition-transform duration-700" />}
            <span className="font-semibold truncate leading-none">{event.title}</span>
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
                "min-h-[140px] p-4 border-r border-b transition-all duration-300 cursor-pointer group relative overflow-hidden",
                isCurrentMonth ? "bg-transparent" : "bg-muted/30 opacity-30",
                i % 7 === 6 ? "border-r-0" : "border-border/50",
                isOver ? "bg-primary/10" : "hover:bg-primary/5"
            )}
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <span className={cn(
                    "text-xs font-semibold h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-300",
                    isToday 
                        ? "bg-primary text-primary-foreground shadow-md scale-110" 
                        : "text-muted-foreground group-hover:text-primary group-hover:scale-110"
                )}>
                    {format(day, "d")}
                </span>
                {isToday && (
                    <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full -z-10" />
                )}
            </div>
            <div className="space-y-2 relative z-10">
                {children}
            </div>
            
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Plus className="h-4 w-4 text-primary/20" />
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
        <div className="space-y-8 pb-40 relative">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-none mb-4">
                        Calendar
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="h-1 w-12 bg-primary rounded-full" />
                        <p className="text-sm font-medium text-muted-foreground">
                            {format(currentDate, "MMMM yyyy")}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border shadow-sm">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-md" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" className="text-xs font-semibold px-6 h-10 rounded-md" onClick={() => setCurrentDate(new Date())}>Today</Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-md" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    <Button 
                        className={cn(
                            "h-11 px-6 rounded-lg font-semibold text-xs shadow-sm transition-all duration-300",
                            isLimitReached ? "bg-muted" : "bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95"
                        )}
                        onClick={() => handleDayClick(new Date())}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Event
                    </Button>
                </div>
            </div>

            <FadeIn delay={0.2}>
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="border shadow-sm bg-card rounded-xl overflow-hidden">
                        <div className="grid grid-cols-7 border-b bg-muted/30">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                <div key={day} className="py-4 text-center text-xs font-semibold text-muted-foreground">{day}</div>
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
                                            <div className="text-[10px] font-medium text-muted-foreground pl-2">
                                                + {dayEvents.length - 3} more
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
                                className="text-xs px-3 py-2 rounded-lg border bg-card/90 shadow-lg scale-110 rotate-3 border-primary flex items-center gap-2 font-semibold"
                                style={{ borderLeftColor: activeDragEvent.color || "#4f46e5", borderLeftWidth: "4px" }}
                            >
                                <span className="truncate">{activeDragEvent.title}</span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <FadeIn delay={0.4} className="lg:col-span-2">
                    <Card className="border shadow-sm bg-card rounded-xl overflow-hidden group">
                        <CardHeader className="p-6 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-primary/5 flex items-center justify-center border group-hover:scale-110 transition-transform duration-500">
                                    <Clock className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold tracking-tight">Upcoming Events</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground mt-1">Scheduled events</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            {events && events.length > 0 ? (
                                <div className="space-y-4">
                                    {(events as CalendarEvent[]).filter((e: CalendarEvent) => new Date(e.start) >= new Date()).slice(0, 5).map((event: CalendarEvent) => (
                                        <div key={event.id} className="flex items-center justify-between p-4 rounded-lg bg-card/40 border hover:bg-muted/60 transition-all duration-300 group/item">
                                            <div className="flex items-center gap-6">
                                                <div className="h-14 w-14 rounded-xl bg-card flex flex-col items-center justify-center border shadow-sm group-hover/item:scale-110 transition-transform">
                                                    <span className="text-[10px] font-semibold text-primary">{format(parseISO(event.start), "MMM")}</span>
                                                    <span className="text-lg font-semibold">{format(parseISO(event.start), "dd")}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-base">{event.title}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {format(parseISO(event.start), "HH:mm")} — {format(parseISO(event.end), "HH:mm")}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className="bg-primary/10 text-primary border-none rounded-full px-4 py-1 text-xs font-medium">{event.type}</Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-muted-foreground">
                                    <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-5" />
                                    <p className="text-xs font-semibold">No upcoming events.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>

                <FadeIn delay={0.6}>
                    <Card className="border shadow-sm bg-card rounded-xl group h-full">
                        <CardHeader className="p-6 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-amber-500/5 flex items-center justify-center border border-amber-500/10 group-hover:scale-110 transition-transform duration-500">
                                    <Bell className="h-6 w-6 text-amber-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold tracking-tight">Alert</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground mt-1">Upcoming</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="space-y-4">
                                {events && (events as CalendarEvent[]).filter((e: CalendarEvent) => new Date(e.start) >= new Date()).length > 0 ? (
                                    (() => {
                                        const nextEvent = (events as CalendarEvent[]).filter((e: CalendarEvent) => new Date(e.start) >= new Date())
                                            .sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
                                        return (
                                            <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/10 relative overflow-hidden group/alert">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/alert:scale-125 transition-transform duration-700">
                                                    <Sparkles className="h-12 w-12 text-amber-500" />
                                                </div>
                                                <p className="text-xs font-semibold text-amber-600 mb-3">Next Up</p>
                                                <p className="text-xl font-semibold mb-2">{nextEvent.title}</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Starts {format(parseISO(nextEvent.start), "eeee 'at' HH:mm")}
                                                </p>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="p-8 rounded-xl border border-dashed border-border text-center">
                                        <p className="text-xs font-semibold text-muted-foreground leading-relaxed">No upcoming events.</p>
                                    </div>
                                )}
                                <Button 
                                    variant="ghost" 
                                    className="w-full h-11 rounded-lg text-xs font-semibold bg-muted/50 border hover:bg-muted" 
                                    onClick={() => toast.info("Calendar settings")}
                                >
                                    Calendar Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>

            <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-xl border bg-background/80 backdrop-blur-3xl p-8 shadow-2xl">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-2xl font-semibold tracking-tight">
                            {editingEvent ? "Update" : "New"} Event
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-2">
                            {selectedDate ? format(selectedDate, "PPPP") : "Add event details"}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground ml-1">Title</Label>
                            <Input 
                                placeholder="Event title" 
                                value={title} 
                                onChange={(e: any) => setTitle(e.target.value)} 
                                required 
                                className="h-12 rounded-lg bg-background/50 border text-base"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-medium text-muted-foreground ml-1">Start</Label>
                                <Input type="time" value={startTime} onChange={(e: any) => setStartTime(e.target.value)} className="h-12 rounded-lg bg-background/50 border" />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-medium text-muted-foreground ml-1">End</Label>
                                <Input type="time" value={endTime} onChange={(e: any) => setEndTime(e.target.value)} className="h-12 rounded-lg bg-background/50 border" />
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground ml-1">Color</Label>
                            <div className="flex gap-4 p-4 bg-muted/50 rounded-lg border">
                                {["#4f46e5", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"].map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setEventColor(c)}
                                        className={cn(
                                            "h-8 w-8 rounded-full transition-all duration-500",
                                            eventColor === c ? "scale-125 shadow-xl ring-4 ring-offset-2 ring-primary" : "opacity-40 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold">Team Event</p>
                                <p className="text-xs text-muted-foreground">Share with team.</p>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={isTeamEvent} 
                                onChange={(e: any) => setIsTeamEvent(e.target.checked)} 
                                className="h-5 w-5 rounded border-muted bg-background/50 text-primary focus:ring-primary cursor-pointer" 
                            />
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                            <Button type="button" variant="ghost" className="flex-1 h-12 rounded-lg font-medium text-sm" onClick={() => setIsEventDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" className="flex-[2] h-12 rounded-lg font-medium text-sm bg-primary hover:bg-primary/90 shadow-md">Save Event</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
