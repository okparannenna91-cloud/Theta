"use client";

import { useMemo, useState, useCallback } from "react";
import { startOfDay, parseISO, format } from "date-fns";
import { MonthView } from "./calendar-month-view";
import { WeekView } from "./calendar-week-view";
import { DayView } from "./calendar-day-view";
import { AgendaView } from "./calendar-agenda-view";
import { MiniCalendar } from "./calendar-mini";
import { tasksToCalendarEvents, getDateRangeFromDrop, navigateCalendar, computeCalendarRange, getViewTitle } from "./calendar-utils";
import type { CalendarEvent, CalendarViewType, CalendarGroupByKey } from "./calendar-types";

export interface CalendarViewProps {
  tasks: any[];
  currentDate: Date;
  viewType: CalendarViewType;
  searchQuery: string;
  groupBy: CalendarGroupByKey | "none";
  filterStatus: string;
  filterPriority: string;
  filterAssignee: string;
  filterProject: string;
  showWeekends: boolean;
  onDateChange: (date: Date) => void;
  onViewTypeChange: (type: CalendarViewType) => void;
  onTaskUpdate: (taskId: string, updates: any) => void;
  onTaskClick: (task: any) => void;
  onCreateTask: (startDate: string, endDate: string) => void;
  onLogActivity: (action: string, taskId: string, metadata?: any) => void;
}

export function CalendarView({
  tasks,
  currentDate,
  viewType,
  searchQuery,
  groupBy,
  filterStatus,
  filterPriority,
  filterAssignee,
  filterProject,
  showWeekends,
  onDateChange,
  onViewTypeChange,
  onTaskUpdate,
  onTaskClick,
  onCreateTask,
  onLogActivity,
}: CalendarViewProps) {
  const [selectedMiniDate, setSelectedMiniDate] = useState<Date>(new Date());

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t: any) => t.title?.toLowerCase().includes(q));
    }

    if (filterStatus && filterStatus !== "all") {
      result = result.filter((t: any) => t.status === filterStatus);
    }

    if (filterPriority && filterPriority !== "all") {
      result = result.filter((t: any) => t.priority === filterPriority);
    }

    if (filterAssignee && filterAssignee !== "all") {
      result = result.filter((t: any) => t.assigneeIds?.includes(filterAssignee));
    }

    if (filterProject && filterProject !== "all") {
      result = result.filter((t: any) => t.project?.id === filterProject);
    }

    return result.filter((t: any) => t.startDate || t.dueDate);
  }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee, filterProject]);

  const events = useMemo(() => tasksToCalendarEvents(filteredTasks), [filteredTasks]);

  const groupedEvents = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All Tasks", events }];

    const groups = new Map<string, { key: string; label: string; events: CalendarEvent[] }>();

    for (const event of events) {
      let key: string;
      let label: string;

      switch (groupBy) {
        case "project":
          key = event.project?.id || "no-project";
          label = event.project?.name || "No Project";
          break;
        case "assignee":
          if (event.assigneeIds.length > 0) {
            key = `assignee:${event.assigneeIds[0]}`;
            label = event.originalTask?.assigneeNames?.[event.assigneeIds[0]] || event.originalTask?.user?.name || `Assignee`;
          } else {
            key = "unassigned";
            label = "Unassigned";
          }
          break;
        default:
          key = "all";
          label = "All Tasks";
      }

      if (!groups.has(key)) groups.set(key, { key, label, events: [] });
      groups.get(key)!.events.push(event);
    }

    return Array.from(groups.values());
  }, [events, groupBy]);

  const taskDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const event of events) {
      if (event.dueDate) set.add(format(parseISO(event.dueDate), "yyyy-MM-dd"));
      if (event.startDate) set.add(format(parseISO(event.startDate), "yyyy-MM-dd"));
    }
    return set;
  }, [events]);

  const handleNavigate = useCallback((direction: -1 | 1) => {
    onDateChange(navigateCalendar(currentDate, viewType, direction));
  }, [currentDate, viewType, onDateChange]);

  const handleToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  const handleMiniDateSelect = useCallback((date: Date) => {
    setSelectedMiniDate(date);
    onDateChange(date);
  }, [onDateChange]);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    onTaskClick(event.originalTask);
  }, [onTaskClick]);

  const handleDayClick = useCallback((day: Date) => {
    if (viewType === "day") {
      onCreateTask(startOfDay(day).toISOString(), startOfDay(day).toISOString());
    } else if (viewType === "month") {
      onDateChange(day);
      onViewTypeChange("day");
    } else {
      onCreateTask(startOfDay(day).toISOString(), startOfDay(day).toISOString());
    }
  }, [viewType, onDateChange, onViewTypeChange, onCreateTask]);

  const handleEventDrop = useCallback((event: CalendarEvent, dropDay: Date) => {
    const updates = getDateRangeFromDrop(dropDay, event);
    onTaskUpdate(event.id, updates);
    onLogActivity("task_rescheduled", event.id, {
      taskTitle: event.title,
      from: event.startDate,
      to: updates.startDate,
    });
  }, [onTaskUpdate, onLogActivity]);

  const handleEventResize = useCallback((event: CalendarEvent, newStart: string, newEnd: string) => {
    onTaskUpdate(event.id, { startDate: newStart, dueDate: newEnd });
    onLogActivity("task_rescheduled", event.id, {
      taskTitle: event.title,
      from: `${event.startDate} → ${event.dueDate}`,
      to: `${newStart} → ${newEnd}`,
    });
  }, [onTaskUpdate, onLogActivity]);

  const title = getViewTitle(currentDate, viewType);

  return (
    <div className="flex gap-4 h-full">
      <div className="w-64 shrink-0 space-y-4">
        <MiniCalendar
          currentDate={currentDate}
          selectedDate={selectedMiniDate}
          onDateSelect={handleMiniDateSelect}
          taskDates={taskDateSet}
        />

        <div className="border-subtle rounded-xl bg-card shadow-sm p-3">
          <div className="space-y-0.5">
            <button
              onClick={() => onViewTypeChange("month")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                viewType === "month" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => onViewTypeChange("week")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                viewType === "week" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => onViewTypeChange("day")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                viewType === "day" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => onViewTypeChange("agenda")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                viewType === "agenda" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
              }`}
            >
              Agenda
            </button>
          </div>
        </div>

        <div className="border-subtle rounded-xl bg-card shadow-sm p-3">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Legend</div>
          <div className="text-[11px] text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Due today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavigate(-1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleToday}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => handleNavigate(1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold ml-2">{title}</h2>
          </div>
        </div>

        {groupBy === "none" ? (
          <>
            {viewType === "month" && (
              <MonthView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
                onDayClick={handleDayClick}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
              />
            )}
            {viewType === "week" && (
              <WeekView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
                onDayClick={handleDayClick}
                onEventDrop={handleEventDrop}
                onLogActivity={onLogActivity}
                showWeekends={showWeekends}
              />
            )}
            {viewType === "day" && (
              <DayView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
                onDayClick={handleDayClick}
                onLogActivity={onLogActivity}
              />
            )}
            {viewType === "agenda" && (
              <AgendaView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}
          </>
        ) : (
          <div className="space-y-6">
            {groupedEvents.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="h-2 w-2 rounded-full bg-primary/50" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">({group.events.length})</span>
                </div>
            {viewType === "month" && (
              <MonthView
                currentDate={currentDate}
                events={group.events}
                onEventClick={handleEventClick}
                onDayClick={handleDayClick}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
              />
            )}
                {viewType === "week" && (
                  <WeekView
                    currentDate={currentDate}
                    events={group.events}
                    onEventClick={handleEventClick}
                    onDayClick={handleDayClick}
                    onEventDrop={handleEventDrop}
                    onLogActivity={onLogActivity}
                    showWeekends={showWeekends}
                  />
                )}
                {viewType === "day" && (
                  <DayView
                    currentDate={currentDate}
                    events={group.events}
                    onEventClick={handleEventClick}
                    onDayClick={handleDayClick}
                    onLogActivity={onLogActivity}
                  />
                )}
                {viewType === "agenda" && (
                  <AgendaView
                    currentDate={currentDate}
                    events={group.events}
                    onEventClick={handleEventClick}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}