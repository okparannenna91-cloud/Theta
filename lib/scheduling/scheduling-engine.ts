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
 * Detects the critical path in a set of tasks using Forward and Backward passes.
 */
export function detectCriticalPath(tasks: TaskData[]): Set<string> {
    if (tasks.length === 0) return new Set();

    const taskMap = new Map(tasks.map(t => [t.id, { 
        ...t, 
        earlyStart: 0, 
        earlyFinish: 0, 
        lateStart: 0, 
        lateFinish: 0 
    }]));

    // 1. Forward Pass: Calculate Early Start (ES) and Early Finish (EF)
    const processed = new Set<string>();
    function forwardPass(taskId: string) {
        if (processed.has(taskId)) return;
        const task = taskMap.get(taskId);
        if (!task) return;

        let maxEF = 0;
        task.predecessors.forEach(dep => {
            forwardPass(dep.predecessorId);
            const pred = taskMap.get(dep.predecessorId);
            if (pred) {
                maxEF = Math.max(maxEF, pred.earlyFinish + dep.lagMinutes);
            }
        });

        task.earlyStart = maxEF;
        task.earlyFinish = maxEF + task.durationMinutes;
        processed.add(taskId);
    }
    tasks.forEach(t => forwardPass(t.id));

    // 2. Find total project duration
    const projectDuration = Math.max(...Array.from(taskMap.values()).map(t => t.earlyFinish));

    // 3. Backward Pass: Calculate Late Start (LS) and Late Finish (LF)
    const backwardProcessed = new Set<string>();
    function backwardPass(taskId: string) {
        if (backwardProcessed.has(taskId)) return;
        const task = taskMap.get(taskId);
        if (!task) return;

        // Find successors (tasks that have this task as a predecessor)
        const successors = tasks.filter(t => t.predecessors.some(p => p.predecessorId === taskId));

        if (successors.length === 0) {
            task.lateFinish = projectDuration;
        } else {
            let minLS = projectDuration;
            successors.forEach(succTask => {
                backwardPass(succTask.id);
                const succ = taskMap.get(succTask.id);
                const dep = succTask.predecessors.find(p => p.predecessorId === taskId);
                if (succ && dep) {
                    minLS = Math.min(minLS, succ.lateStart - dep.lagMinutes);
                }
            });
            task.lateFinish = minLS;
        }

        task.lateStart = task.lateFinish - task.durationMinutes;
        backwardProcessed.add(taskId);
    }
    tasks.forEach(t => backwardPass(t.id));

    // 4. Identify critical tasks (Slack = 0)
    const criticalPath = new Set<string>();
    taskMap.forEach((t, id) => {
        if (Math.abs(t.lateStart - t.earlyStart) < 1) { // 1 minute tolerance
            criticalPath.add(id);
        }
    });

    return criticalPath;
}
