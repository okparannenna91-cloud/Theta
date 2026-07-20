import { addMinutes, differenceInMinutes, startOfDay, isWeekend, addDays, format, parseISO } from "date-fns";
import type { WorkingDayConfig, Holiday } from "@/components/shared/timeline/types";

export type DependencyType = "FS" | "SS" | "FF" | "SF";

export interface TaskData {
    id: string;
    startDate: Date | null;
    dueDate: Date | null;
    durationMinutes: number;
    schedulingMode: "auto" | "manual";
    predecessors: {
        predecessorId: string;
        type: DependencyType;
        lagMinutes: number;
    }[];
}

export interface SchedulingConfig {
    workingDays: WorkingDayConfig;
    holidays: Holiday[];
    workingHourStart: number;
    workingHourEnd: number;
}

const DEFAULT_CONFIG: SchedulingConfig = {
    workingDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
    holidays: [],
    workingHourStart: 9,
    workingHourEnd: 17,
};

function isWorkingDay(date: Date, config: SchedulingConfig): boolean {
    const dayOfWeek = format(date, "EEEE").toLowerCase() as keyof WorkingDayConfig;
    if (!config.workingDays[dayOfWeek]) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    return !config.holidays.some(h => h.date === dateStr);
}

function addWorkingMinutes(date: Date, minutes: number, config: SchedulingConfig): Date {
    let remaining = minutes;
    let current = new Date(date);

    // Calculate minutes available in current working day
    const currentHour = current.getHours();
    const currentMinute = current.getMinutes();
    const dayMinutesUsed = (currentHour - config.workingHourStart) * 60 + currentMinute;
    const dayMinutesAvailable = (config.workingHourEnd - config.workingHourStart) * 60;

    // If we're in a working day, use remaining minutes in the day first
    if (isWorkingDay(current, config) && currentHour >= config.workingHourStart && currentHour < config.workingHourEnd) {
        const minutesLeftToday = dayMinutesAvailable - dayMinutesUsed;
        if (remaining <= minutesLeftToday) {
            return addMinutes(current, remaining);
        }
        remaining -= minutesLeftToday;
    }

    // Jump to next working day start
    current = jumpToNextWorkingDayStart(current, config);

    // Process full working days in bulk (much faster than minute-by-minute)
    const minutesPerDay = dayMinutesAvailable;
    if (minutesPerDay > 0 && remaining > minutesPerDay) {
        const fullDays = Math.floor(remaining / minutesPerDay);
        if (fullDays > 0) {
            let daysJumped = 0;
            let tempDate = new Date(current);
            while (daysJumped < fullDays) {
                tempDate = addDays(tempDate, 1);
                if (isWorkingDay(tempDate, config)) {
                    daysJumped++;
                }
            }
            current = new Date(tempDate);
            current.setHours(config.workingHourStart, 0, 0, 0);
            remaining = remaining % minutesPerDay;
        }
    }

    // Handle remaining minutes within the final working day
    while (remaining > 0) {
        current = addMinutes(current, 1);
        if (isWorkingDay(current, config) && current.getHours() >= config.workingHourStart && current.getHours() < config.workingHourEnd) {
            remaining--;
        } else if (!isWorkingDay(current, config) || current.getHours() >= config.workingHourEnd) {
            current = jumpToNextWorkingDayStart(current, config);
        }
    }
    return current;
}

function jumpToNextWorkingDayStart(date: Date, config: SchedulingConfig): Date {
    let result = new Date(date);
    // If current time is past working hours or not a working day, move to next working day start
    if (!isWorkingDay(result, config) || result.getHours() >= config.workingHourEnd) {
        result = addDays(result, 1);
    }
    // Find the next working day
    let attempts = 0;
    while (!isWorkingDay(result, config) && attempts < 30) {
        result = addDays(result, 1);
        attempts++;
    }
    result.setHours(config.workingHourStart, 0, 0, 0);
    return result;
}

export function calculateSchedules(tasks: TaskData[], config: SchedulingConfig = DEFAULT_CONFIG) {
    const taskMap = new Map(tasks.map(t => [t.id, { ...t }]));
    const processed = new Set<string>();
    const processing = new Set<string>();

    function processTask(taskId: string) {
        if (processed.has(taskId)) return;
        if (processing.has(taskId)) {
            console.warn(`Circular dependency detected at task ${taskId}`);
            return;
        }
        processing.add(taskId);
        const task = taskMap.get(taskId);
        if (!task) return;

        task.predecessors.forEach(dep => processTask(dep.predecessorId));

        if (task.schedulingMode === "auto" && task.predecessors.length > 0) {
            let earliestStart: Date | null = null;
            task.predecessors.forEach(dep => {
                const pred = taskMap.get(dep.predecessorId);
                if (!pred || !pred.startDate || !pred.dueDate) return;
                let calculatedStart: Date;
                switch (dep.type) {
                    case "FS":
                        calculatedStart = addMinutes(pred.dueDate, dep.lagMinutes);
                        break;
                    case "SS":
                        calculatedStart = addMinutes(pred.startDate, dep.lagMinutes);
                        break;
                    case "FF":
                        calculatedStart = addMinutes(pred.dueDate, dep.lagMinutes - task.durationMinutes);
                        break;
                    case "SF":
                        calculatedStart = addMinutes(pred.startDate, dep.lagMinutes - task.durationMinutes);
                        break;
                    default:
                        calculatedStart = addMinutes(pred.dueDate, dep.lagMinutes);
                }
                if (!earliestStart || calculatedStart > earliestStart) {
                    earliestStart = calculatedStart;
                }
            });
            if (earliestStart) {
                earliestStart = adjustForWorkingDays(earliestStart, config);
                task.startDate = earliestStart;
                task.dueDate = addWorkingMinutes(earliestStart, task.durationMinutes, config);
            }
        }
        processing.delete(taskId);
        processed.add(taskId);
    }

    tasks.forEach(t => processTask(t.id));
    return Array.from(taskMap.values());
}

function adjustForWorkingDays(date: Date, config: SchedulingConfig): Date {
    let result = new Date(date);
    let attempts = 0;
    while (!isWorkingDay(result, config) && attempts < 30) {
        result = addDays(result, 1);
        result = startOfDay(result);
        result.setHours(config.workingHourStart, 0, 0, 0);
        attempts++;
    }
    return result;
}

export function detectCriticalPath(tasks: TaskData[]): Set<string> {
    if (tasks.length === 0) return new Set();
    const taskMap = new Map(tasks.map(t => [t.id, {
        ...t,
        earlyStart: 0,
        earlyFinish: 0,
        lateStart: 0,
        lateFinish: 0
    }]));

    const processed = new Set<string>();
    const processing = new Set<string>();

    function forwardPass(taskId: string) {
        if (processed.has(taskId)) return;
        if (processing.has(taskId)) {
            console.warn(`Circular dependency detected in forward pass at task ${taskId}`);
            return;
        }
        processing.add(taskId);
        const task = taskMap.get(taskId);
        if (!task) { processing.delete(taskId); return; }

        let maxEF = 0;
        let maxConstraint = 0;
        task.predecessors.forEach(dep => {
            forwardPass(dep.predecessorId);
            const pred = taskMap.get(dep.predecessorId);
            if (!pred) return;
            switch (dep.type) {
                case "SS":
                    maxConstraint = Math.max(maxConstraint, pred.earlyStart + dep.lagMinutes);
                    break;
                case "FF":
                    maxConstraint = Math.max(maxConstraint, pred.earlyFinish + dep.lagMinutes - task.durationMinutes);
                    break;
                case "SF":
                    maxConstraint = Math.max(maxConstraint, pred.earlyStart + dep.lagMinutes - task.durationMinutes);
                    break;
                case "FS":
                default:
                    maxEF = Math.max(maxEF, pred.earlyFinish + dep.lagMinutes);
                    break;
            }
        });
        task.earlyStart = Math.max(maxEF, maxConstraint);
        task.earlyFinish = task.earlyStart + task.durationMinutes;
        processing.delete(taskId);
        processed.add(taskId);
    }
    tasks.forEach(t => forwardPass(t.id));

    const projectDuration = Math.max(...Array.from(taskMap.values()).map(t => t.earlyFinish));

    const backwardProcessed = new Set<string>();
    const backwardProcessing = new Set<string>();

    function backwardPass(taskId: string) {
        if (backwardProcessed.has(taskId)) return;
        if (backwardProcessing.has(taskId)) {
            console.warn(`Circular dependency detected in backward pass at task ${taskId}`);
            return;
        }
        backwardProcessing.add(taskId);
        const task = taskMap.get(taskId);
        if (!task) { backwardProcessing.delete(taskId); return; }

        const successors = tasks.filter(t => t.predecessors.some(p => p.predecessorId === taskId));
        if (successors.length === 0) {
            task.lateFinish = projectDuration;
        } else {
            let minLS = projectDuration;
            successors.forEach(succTask => {
                backwardPass(succTask.id);
                const succ = taskMap.get(succTask.id);
                const dep = succTask.predecessors.find(p => p.predecessorId === taskId);
                if (!succ || !dep) return;
                switch (dep.type) {
                    case "SS":
                        minLS = Math.min(minLS, succ.lateStart - dep.lagMinutes);
                        break;
                    case "FF":
                        minLS = Math.min(minLS, succ.lateFinish - dep.lagMinutes);
                        break;
                    case "SF":
                        minLS = Math.min(minLS, succ.lateFinish - dep.lagMinutes + task.durationMinutes);
                        break;
                    case "FS":
                    default:
                        minLS = Math.min(minLS, succ.lateStart - dep.lagMinutes);
                        break;
                }
            });
            task.lateFinish = minLS;
        }
        task.lateStart = task.lateFinish - task.durationMinutes;
        backwardProcessing.delete(taskId);
        backwardProcessed.add(taskId);
    }
    tasks.forEach(t => backwardPass(t.id));

    const criticalPath = new Set<string>();
    taskMap.forEach((t, id) => {
        if (Math.abs(t.lateStart - t.earlyStart) < 1) {
            criticalPath.add(id);
        }
    });

    return criticalPath;
}

export function calculateSlack(tasks: TaskData[]): Map<string, number> {
    const slackMap = new Map<string, number>();
    if (tasks.length === 0) return slackMap;

    const taskMap = new Map(tasks.map(t => [t.id, {
        ...t,
        earlyStart: 0,
        earlyFinish: 0,
        lateStart: 0,
        lateFinish: 0
    }]));

    const processed = new Set<string>();
    const processing = new Set<string>();

    function forwardPass(taskId: string) {
        if (processed.has(taskId)) return;
        if (processing.has(taskId)) return;
        processing.add(taskId);
        const task = taskMap.get(taskId);
        if (!task) { processing.delete(taskId); return; }

        let maxEF = 0;
        let maxConstraint = 0;
        task.predecessors.forEach(dep => {
            forwardPass(dep.predecessorId);
            const pred = taskMap.get(dep.predecessorId);
            if (!pred) return;
            switch (dep.type) {
                case "SS":
                    maxConstraint = Math.max(maxConstraint, pred.earlyStart + dep.lagMinutes);
                    break;
                case "FF":
                    maxConstraint = Math.max(maxConstraint, pred.earlyFinish + dep.lagMinutes - task.durationMinutes);
                    break;
                case "SF":
                    maxConstraint = Math.max(maxConstraint, pred.earlyStart + dep.lagMinutes - task.durationMinutes);
                    break;
                case "FS":
                default:
                    maxEF = Math.max(maxEF, pred.earlyFinish + dep.lagMinutes);
                    break;
            }
        });
        task.earlyStart = Math.max(maxEF, maxConstraint);
        task.earlyFinish = task.earlyStart + task.durationMinutes;
        processing.delete(taskId);
        processed.add(taskId);
    }
    tasks.forEach(t => forwardPass(t.id));

    const projectDuration = Math.max(...Array.from(taskMap.values()).map(t => t.earlyFinish));

    const backwardProcessed = new Set<string>();
    const backwardProcessing = new Set<string>();

    function backwardPass(taskId: string) {
        if (backwardProcessed.has(taskId)) return;
        if (backwardProcessing.has(taskId)) return;
        backwardProcessing.add(taskId);
        const task = taskMap.get(taskId);
        if (!task) { backwardProcessing.delete(taskId); return; }

        const successors = tasks.filter(t => t.predecessors.some(p => p.predecessorId === taskId));
        if (successors.length === 0) {
            task.lateFinish = projectDuration;
        } else {
            let minLS = projectDuration;
            successors.forEach(succTask => {
                backwardPass(succTask.id);
                const succ = taskMap.get(succTask.id);
                const dep = succTask.predecessors.find(p => p.predecessorId === taskId);
                if (!succ || !dep) return;
                switch (dep.type) {
                    case "SS":
                        minLS = Math.min(minLS, succ.lateStart - dep.lagMinutes);
                        break;
                    case "FF":
                        minLS = Math.min(minLS, succ.lateFinish - dep.lagMinutes);
                        break;
                    case "SF":
                        minLS = Math.min(minLS, succ.lateFinish - dep.lagMinutes + task.durationMinutes);
                        break;
                    case "FS":
                    default:
                        minLS = Math.min(minLS, succ.lateStart - dep.lagMinutes);
                        break;
                }
            });
            task.lateFinish = minLS;
        }
        task.lateStart = task.lateFinish - task.durationMinutes;
        backwardProcessing.delete(taskId);
        backwardProcessed.add(taskId);
    }
    tasks.forEach(t => backwardPass(t.id));

    taskMap.forEach((t, id) => {
        const slack = t.lateStart - t.earlyStart;
        slackMap.set(id, Math.max(0, slack));
    });

    return slackMap;
}

export function calculateProgressRollup(tasks: any[]): any[] {
    const map = new Map<string, any>(tasks.map(t => [t.id, { ...t, children: [] }]));
    const roots: any[] = [];
    map.forEach(task => {
        if (task.parentId && map.has(task.parentId)) {
            map.get(task.parentId).children.push(task);
        } else {
            roots.push(task);
        }
    });

    function rollup(node: any): void {
        if (node.children.length === 0) return;
        node.children.forEach(rollup);
        const total = node.children.reduce((sum: number, c: any) => sum + (c.progress || 0), 0);
        node.progress = Math.round(total / node.children.length);
        if (node.children.every((c: any) => c.status === "done")) {
            node.status = "done";
        } else if (node.children.some((c: any) => c.status === "in_progress")) {
            node.status = "in_progress";
        }
        const earliestStart = node.children.reduce((min: Date | null, c: any) => {
            const d = c.startDate ? new Date(c.startDate) : null;
            return d && (!min || d < min) ? d : min;
        }, null);
        const latestDue = node.children.reduce((max: Date | null, c: any) => {
            const d = c.dueDate ? new Date(c.dueDate) : null;
            return d && (!max || d > max) ? d : max;
        }, null);
        if (earliestStart) node.startDate = earliestStart.toISOString();
        if (latestDue) node.dueDate = latestDue.toISOString();
    }

    roots.forEach(rollup);
    const result: any[] = [];
    function flatten(nodes: any[]) {
        nodes.forEach(n => { result.push(n); flatten(n.children); });
    }
    flatten(roots);
    return result;
}
