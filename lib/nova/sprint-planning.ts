import { prisma } from "@/lib/prisma";
import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";

const STATUS_DONE = ["done", "completed"];
const STATUS_TODO = ["todo", "backlog", "new"];

export interface BacklogTask {
  taskId: string;
  title: string;
  priority: string;
  estimatedHours: number | null;
  labels: string[];
  dependencies: string[];
  assigneeIds: string[];
  dueDate: Date | null;
}

export interface SprintPlanTask {
  taskId: string;
  title: string;
  assigneeId?: string;
  estimatedHours: number | null;
  priority: string;
  reason: string;
}

export interface SprintPlan {
  tasks: SprintPlanTask[];
  totalHours: number;
  capacityUtilization: number;
  predictedVelocity: number;
  riskLevel: "low" | "medium" | "high";
}

export interface ScopeCreepResult {
  sprintId: string;
  sprintName: string;
  initialTaskCount: number;
  currentTaskCount: number;
  addedTasks: Array<{ taskId: string; title: string; addedAt: Date }>;
  removedTasks: Array<{ taskId: string; title: string }>;
  scopeChangePercent: number;
  hasScopeCreep: boolean;
}

export class SprintPlanning {
  static async analyzeBacklog(
    workspaceId: string,
    projectId: string,
  ): Promise<BacklogTask[]> {
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        projectId,
        status: { in: STATUS_TODO },
        sprintId: null,
      },
      include: {
        predecessors: { select: { predecessorId: true, type: true } },
        tags: { select: { name: true } },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" },
      ],
    });

    return tasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      estimatedHours: task.estimatedHours,
      labels: task.tags.map((t) => t.name),
      dependencies: task.predecessors
        .filter((p: { type: string }) => p.type === "FS")
        .map((p: { predecessorId: string }) => p.predecessorId),
      assigneeIds: task.assigneeIds,
      dueDate: task.dueDate,
    }));
  }

  static async generateSprintPlan(
    workspaceId: string,
    projectId: string,
    sprintDurationDays: number = 14,
  ): Promise<SprintPlan> {
    const backlog = await this.analyzeBacklog(workspaceId, projectId);

    const teamVelocity = await this.getTeamVelocity(workspaceId, projectId);
    const teamCapacity = await this.getTeamCapacity(workspaceId, projectId);

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { name: true },
    });

    const backlogSummary = backlog.length > 0
      ? backlog.map((t) =>
          `- "${t.title}" [${t.priority}] ${t.estimatedHours ? `${t.estimatedHours}h` : "no estimate"} deps:${t.dependencies.length} assignees:${t.assigneeIds.length}`
        ).join("\n")
      : "No tasks in backlog";

    const velocitySummary = teamVelocity.length > 0
      ? teamVelocity.map((v) => `${v.memberName}: ${v.velocity}/week`).join(", ")
      : "No velocity data";

    const prompt = `You are a sprint planning assistant. Generate an optimal sprint plan.

Project: ${project?.name || "Unknown"}
Sprint duration: ${sprintDurationDays} days
Team velocity: ${velocitySummary}
Team capacity: ${teamCapacity} active members
Available hours per member: ~${sprintDurationDays * 8}h (8h/day)

Backlog tasks:
${backlogSummary}

Generate a sprint plan with:
1. Which tasks to include (prioritize by priority, dependencies, and estimated hours)
2. Suggested assignees based on team capacity
3. Predicted completion

Respond with ONLY valid JSON:
{
  "tasks": [
    {
      "taskId": "id",
      "title": "task title",
      "assigneeId": "member-id or null",
      "estimatedHours": number or null,
      "priority": "high|medium|low",
      "reason": "why this task is included"
    }
  ],
  "totalHours": number,
  "capacityUtilization": number (0-100),
  "predictedVelocity": number (tasks per sprint),
  "riskLevel": "low|medium|high"
}

Rules:
- Don't exceed ${teamCapacity * sprintDurationDays * 8} total hours
- Include dependency-aware ordering
- Mark uncertain estimates
- Return ONLY the JSON`;

    try {
      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "You are a JSON-only parser. Respond with valid JSON only, no markdown.",
        prompt
      );

      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const validTaskIds = new Set(backlog.map((t) => t.taskId));
      const tasks: SprintPlanTask[] = (parsed.tasks || [])
        .filter((t: SprintPlanTask) => validTaskIds.has(t.taskId))
        .map((t: SprintPlanTask) => {
          const backlogItem = backlog.find((b) => b.taskId === t.taskId);
          return {
            taskId: t.taskId,
            title: t.title || backlogItem?.title || "Unknown",
            assigneeId: t.assigneeId || undefined,
            estimatedHours: t.estimatedHours || backlogItem?.estimatedHours || null,
            priority: t.priority || backlogItem?.priority || "medium",
            reason: t.reason || "Included based on priority and capacity",
          };
        });

      return {
        tasks,
        totalHours: parsed.totalHours || tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
        capacityUtilization: Math.min(100, parsed.capacityUtilization || 0),
        predictedVelocity: parsed.predictedVelocity || tasks.length,
        riskLevel: parsed.riskLevel || "medium",
      };
    } catch (error) {
      logger.warn("[SprintPlanning] LLM planning failed, using heuristic fallback:", error);
      return this.heuristicSprintPlan(backlog, teamVelocity, teamCapacity, sprintDurationDays);
    }
  }

  static async detectScopeCreep(sprintId: string): Promise<ScopeCreepResult> {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: {
        id: true,
        name: true,
        startDate: true,
        tasks: {
          select: { id: true, title: true, createdAt: true, sprintId: true },
        },
      },
    });

    if (!sprint) {
      return {
        sprintId,
        sprintName: "Unknown",
        initialTaskCount: 0,
        currentTaskCount: 0,
        addedTasks: [],
        removedTasks: [],
        scopeChangePercent: 0,
        hasScopeCreep: false,
      };
    }

    const currentTasks = sprint.tasks;

    const baseline = await prisma.baseline.findFirst({
      where: {
        workspaceId: undefined,
        projectId: undefined,
      },
      orderBy: { createdAt: "desc" },
    });

    let initialTaskIds: string[] = [];

    if (baseline) {
      const baselineTasks = baseline.tasks as Array<{ id: string; title: string }>;
      initialTaskIds = baselineTasks
        .filter((bt) => currentTasks.some((ct) => ct.id === bt.id))
        .map((bt) => bt.id);

      if (initialTaskIds.length === 0) {
        const sprintStartTasks = currentTasks.filter(
          (t) => new Date(t.createdAt) < sprint.startDate
        );
        initialTaskIds = sprintStartTasks.map((t) => t.id);
      }
    } else {
      const sprintStartTasks = currentTasks.filter(
        (t) => new Date(t.createdAt) < sprint.startDate
      );
      initialTaskIds = sprintStartTasks.map((t) => t.id);
    }

    const addedTasks = currentTasks
      .filter((t) => !initialTaskIds.includes(t.id))
      .map((t) => ({
        taskId: t.id,
        title: t.title,
        addedAt: new Date(t.createdAt),
      }));

    const initialCount = initialTaskIds.length || 1;
    const currentCount = currentTasks.length;
    const scopeChangePercent = Math.round(
      ((currentCount - initialCount) / initialCount) * 100
    );

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      initialTaskCount: initialCount,
      currentTaskCount: currentCount,
      addedTasks,
      removedTasks: [],
      scopeChangePercent,
      hasScopeCreep: scopeChangePercent > 20,
    };
  }

  private static async getTeamVelocity(
    workspaceId: string,
    projectId: string,
  ): Promise<Array<{ memberId: string; memberName: string; velocity: number }>> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const completedTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        projectId,
        status: { in: STATUS_DONE },
        updatedAt: { gte: ninetyDaysAgo },
      },
      select: {
        assigneeIds: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const memberStats = new Map<string, { count: number; totalDays: number }>();

    for (const task of completedTasks) {
      const days = Math.max(
        1,
        Math.ceil(
          (new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      for (const memberId of task.assigneeIds) {
        const existing = memberStats.get(memberId) || { count: 0, totalDays: 0 };
        existing.count++;
        existing.totalDays += days;
        memberStats.set(memberId, existing);
      }
    }

    if (memberStats.size === 0) return [];

    const memberIds = Array.from(memberStats.keys());
    const members = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(members.map((m) => [m.id, m.name || "Unknown"]));

    return Array.from(memberStats.entries()).map(([memberId, stats]) => ({
      memberId,
      memberName: nameMap.get(memberId) || "Unknown",
      velocity: Math.round((stats.count / 90) * 7 * 10) / 10,
    }));
  }

  private static async getTeamCapacity(
    workspaceId: string,
    projectId: string,
  ): Promise<number> {
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });

    if (members.length === 0) {
      const wsMembers = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        select: { userId: true },
      });
      return wsMembers.length;
    }

    return members.length;
  }

  private static heuristicSprintPlan(
    backlog: BacklogTask[],
    teamVelocity: Array<{ velocity: number }>,
    teamCapacity: number,
    sprintDurationDays: number,
  ): SprintPlan {
    const totalVelocity = teamVelocity.reduce((sum, v) => sum + v.velocity, 0);
    const tasksPerSprint = Math.max(1, Math.round(totalVelocity * sprintDurationDays / 7));
    const maxHours = teamCapacity * sprintDurationDays * 8;

    const sorted = [...backlog].sort((a, b) => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
    });

    const selected: SprintPlanTask[] = [];
    let totalHours = 0;

    for (const task of sorted) {
      if (selected.length >= tasksPerSprint) break;

      const taskHours = task.estimatedHours || 4;
      if (totalHours + taskHours > maxHours) continue;

      totalHours += taskHours;
      selected.push({
        taskId: task.taskId,
        title: task.title,
        assigneeId: task.assigneeIds[0] || undefined,
        estimatedHours: task.estimatedHours,
        priority: task.priority,
        reason: task.priority === "high" || task.priority === "urgent"
          ? "High priority"
          : task.dependencies.length > 0
          ? "Has dependencies — include early"
          : "Within capacity",
      });
    }

    const capacityUtilization = maxHours > 0 ? Math.round((totalHours / maxHours) * 100) : 0;

    return {
      tasks: selected,
      totalHours,
      capacityUtilization: Math.min(100, capacityUtilization),
      predictedVelocity: selected.length,
      riskLevel: capacityUtilization > 90 ? "high" : capacityUtilization > 70 ? "medium" : "low",
    };
  }
}
