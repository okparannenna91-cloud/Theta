import { addDays, differenceInDays, startOfDay } from "date-fns";

export interface GanttTask {
    id: string;
    startDate: Date | null;
    dueDate: Date | null;
    dependencyIds: string[];
    isMilestone: boolean;
}

/**
 * Calculates the schedule for a set of tasks based on dependencies.
 * This is a simplified CPM implementation.
 */
export function calculateSchedule(tasks: GanttTask[]) {
    const taskMap = new Map<string, GanttTask>(tasks.map(t => [t.id, t]));
    const results = new Map<string, { start: Date, end: Date, isCritical: boolean }>();

    // 1. Forward Pass (Early Start / Early Finish)
    const visited = new Set<string>();
    const processing = new Set<string>();

    function processTask(id: string) {
        if (processing.has(id)) throw new Error("Circular dependency detected");
        if (visited.has(id)) return;

        processing.add(id);
        const task = taskMap.get(id);
        if (!task) return;

        let earlyStart = task.startDate ? new Date(task.startDate) : new Date();
        
        // Predependencies determine the earliest start
        for (const depId of task.dependencyIds) {
            processTask(depId);
            const depResult = results.get(depId);
            if (depResult && depResult.end > earlyStart) {
                earlyStart = new Date(depResult.end);
            }
        }

        const duration = task.startDate && task.dueDate 
            ? Math.max(1, differenceInDays(startOfDay(task.dueDate), startOfDay(task.startDate)) + 1)
            : 1;

        const earlyFinish = addDays(earlyStart, duration);

        results.set(id, { 
            start: earlyStart, 
            end: earlyFinish, 
            isCritical: false // Determined in backward pass
        });

        processing.delete(id);
        visited.add(id);
    }

    for (const task of tasks) {
        processTask(task.id);
    }

    return results;
}

/**
 * Shifts a task and all its dependent successors by a delta in days.
 */
export function shiftTaskChain(
    taskId: string, 
    deltaDays: number, 
    tasks: GanttTask[], 
    dependencies: { predecessorId: string, successorId: string }[]
) {
    const updates: { id: string, startDate: Date, dueDate: Date }[] = [];
    const queue = [{ id: taskId, delta: deltaDays }];
    const seen = new Set<string>();

    while (queue.length > 0) {
        const { id, delta } = queue.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);

        const task = tasks.find(t => t.id === id);
        if (!task || !task.startDate || !task.dueDate) continue;

        const newStart = addDays(task.startDate, delta);
        const newEnd = addDays(task.dueDate, delta);

        updates.push({ id, startDate: newStart, dueDate: newEnd });

        // Find all successors
        const successors = dependencies
            .filter(d => d.predecessorId === id)
            .map(d => d.successorId);

        for (const successorId of successors) {
            queue.push({ id: successorId, delta });
        }
    }

    return updates;
}
