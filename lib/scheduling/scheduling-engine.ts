import { addMinutes, differenceInMinutes, startOfDay, isWeekend } from "date-fns";

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

/**
 * Recalculates task dates based on dependencies and constraints.
 * This is a simplified version of a CPM (Critical Path Method) engine.
 */
export function calculateSchedules(tasks: TaskData[], skipWeekends: boolean = true) {
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

        // Process predecessors first
        task.predecessors.forEach(dep => processTask(dep.predecessorId));

        if (task.schedulingMode === "auto" && task.predecessors.length > 0) {
            let earliestStart: Date | null = null;

            task.predecessors.forEach(dep => {
                const pred = taskMap.get(dep.predecessorId);
                if (!pred || !pred.startDate || !pred.dueDate) return;

                let calculatedStart: Date;

                switch (dep.type) {
                    case "FS": // Finish-to-Start: Task starts after predecessor finishes
                        calculatedStart = addMinutes(pred.dueDate, dep.lagMinutes);
                        break;
                    case "SS": // Start-to-Start: Task starts after predecessor starts
                        calculatedStart = addMinutes(pred.startDate, dep.lagMinutes);
                        break;
                    case "FF": // Finish-to-Finish: Task finishes after predecessor finishes
                        // Start = PredFinish + Lag - Duration
                        calculatedStart = addMinutes(pred.dueDate, dep.lagMinutes - task.durationMinutes);
                        break;
                    case "SF": // Start-to-Finish: Task finishes after predecessor starts
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
                // Adjust for weekends if enabled
                if (skipWeekends) {
                    earliestStart = adjustForWeekends(earliestStart);
                }
                
                task.startDate = earliestStart;
                task.dueDate = addMinutes(earliestStart, task.durationMinutes);
            }
        }

        processing.delete(taskId);
        processed.add(taskId);
    }

    tasks.forEach(t => processTask(t.id));

    return Array.from(taskMap.values());
}

function adjustForWeekends(date: Date): Date {
    let result = new Date(date);
    while (isWeekend(result)) {
        result = addMinutes(result, 1440); // Add a day
        result = startOfDay(result);
        result.setHours(9, 0, 0, 0); // Start at 9 AM
    }
    return result;
}

/**
 * Detects the critical path in a set of tasks.
 */
export function detectCriticalPath(tasks: TaskData[]) {
    // This requires a forward and backward pass (Early Start/Finish, Late Start/Finish)
    // For now, we'll return an empty set or a simplified heuristic
    return new Set<string>();
}
