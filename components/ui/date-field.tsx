"use client";

import { useEffect, useMemo, useState } from "react";
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    isToday,
    format,
    addMonths,
    subMonths,
    setMonth,
    setYear,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

interface DateFieldProps {
    value?: Date | null;
    onChange?: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
}

export function DateField({ value, onChange, placeholder = "Set date", className }: DateFieldProps) {
    const [open, setOpen] = useState(false);
    const [viewDate, setViewDate] = useState(startOfMonth(value ?? new Date()));

    useEffect(() => {
        if (!open) setViewDate(startOfMonth(value ?? new Date()));
    }, [open, value]);

    const days = useMemo(() => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(monthStart);
        const start = startOfWeek(monthStart);
        const end = endOfWeek(monthEnd);
        return eachDayOfInterval({ start, end });
    }, [viewDate]);

    const years = useMemo(() => {
        const todayYear = new Date().getFullYear();
        const viewYear = viewDate.getFullYear();
        const low = Math.min(todayYear, viewYear) - 50;
        const high = Math.max(todayYear, viewYear) + 25;
        const list: number[] = [];
        for (let y = low; y <= high; y++) list.push(y);
        return list;
    }, [viewDate]);

    const handleSelect = (day: Date) => {
        onChange?.(day);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full h-11 justify-start text-left font-medium text-xs bg-background border rounded-lg shadow-sm hover:border-primary/30 transition-colors",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-3 h-4 w-4 text-primary shrink-0" />
                    {value ? format(value, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 bg-background border rounded-xl shadow-2xl" align="start">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setViewDate(subMonths(viewDate, 1))}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="flex items-center gap-1 text-xs font-semibold">
                            <select
                                value={viewDate.getMonth()}
                                onChange={(e) => setViewDate(setMonth(viewDate, Number(e.target.value)))}
                                className="h-7 rounded-md border border-input bg-background px-1.5 text-xs font-medium"
                                aria-label="Month"
                            >
                                {MONTH_NAMES.map((m, i) => (
                                    <option key={m} value={i}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={viewDate.getFullYear()}
                                onChange={(e) => setViewDate(setYear(viewDate, Number(e.target.value)))}
                                className="h-7 rounded-md border border-input bg-background px-1.5 text-xs font-medium"
                                aria-label="Year"
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={() => setViewDate(addMonths(viewDate, 1))}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            aria-label="Next month"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7">
                        {DAY_HEADERS.map((d) => (
                            <div key={d} className="text-[10px] font-medium text-muted-foreground text-center h-6 flex items-center justify-center">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5">
                        {days.map((day) => (
                            <button
                                key={day.toISOString()}
                                type="button"
                                onClick={() => handleSelect(day)}
                                className={cn(
                                    "text-xs h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                                    !isSameMonth(day, viewDate) && "text-muted-foreground/30",
                                    value && isSameDay(day, value) && "bg-primary text-primary-foreground font-semibold",
                                    !value || !isSameDay(day, value) ? isToday(day) && "border border-primary text-primary font-semibold" : "",
                                    (!value || !isSameDay(day, value)) && !isToday(day) && isSameMonth(day, viewDate) && "hover:bg-muted"
                                )}
                            >
                                {format(day, "d")}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t">
                        <button
                            type="button"
                            onClick={() => {
                                onChange?.(undefined);
                                setOpen(false);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                            Clear
                        </button>
                        {value && (
                            <span className="text-xs font-medium text-muted-foreground">
                                {format(value, "PPP")}
                            </span>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
