import { getPrismaClient } from "../prisma";
import { TASK_QUALITY_STANDARDS, TASK_CREATION_FLOW, TASK_INTELLIGENCE_CAPABILITIES } from "./constitution/task-standards";

export { TASK_QUALITY_STANDARDS, TASK_CREATION_FLOW, TASK_INTELLIGENCE_CAPABILITIES } from "./constitution/task-standards";

export interface TaskRecommendation {
  priority: "low" | "medium" | "high" | "urgent";
  suggestedAssigneeId?: string;
  reason: string;
  estimatedHours?: number;
  health?: TaskHealthStatus;
}

export interface TaskHealthStatus {
  status: "ON_TRACK" | "STALLED" | "OVERDUE" | "BLOCKED" | "AT_RISK";
  daysSinceLastUpdate: number;
  isOverdue: boolean;
  hasBlockingDependencies: boolean;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarTasks: Array<{ id: string; title: string; status: string }>;
  confidence: number;
}

export class TaskIntelligence {
  public static async analyzeAndRecommend(
    workspaceId: string,
    title: string,
    description?: string
  ): Promise<TaskRecommendation> {
    const db = getPrismaClient(workspaceId);

    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    const lowercaseTitle = title.toLowerCase();

    if (lowercaseTitle.includes("fix") || lowercaseTitle.includes("broken") || lowercaseTitle.includes("critical") || lowercaseTitle.includes("crash")) {
      priority = "high";
    } else if (lowercaseTitle.includes("urgent") || lowercaseTitle.includes("asap") || lowercaseTitle.includes("blocker")) {
      priority = "urgent";
    } else if (lowercaseTitle.includes("refactor") || lowercaseTitle.includes("clean") || lowercaseTitle.includes("minor")) {
      priority = "low";
    }

    let suggestedAssigneeId: string | undefined;
    let reason = `Priority mapped to **${priority}** based on keywords in title.`;
    let estimatedHours: number | undefined;

    try {
      const [members, similarTasks] = await Promise.all([
        db.workspaceMember.findMany({
          where: { workspaceId, status: "active" },
          include: { user: { include: { tasks: { where: { status: { not: "done" } } } } } },
        }),
        db.task.findMany({
          where: {
            workspaceId,
            title: { contains: title.substring(0, 30) },
            status: { not: "done" },
          },
          select: { id: true, title: true, status: true },
          take: 3,
        }),
      ]);

      if (members.length > 0) {
        const sorted = members.sort((a, b) => (a.user?.tasks?.length || 0) - (b.user?.tasks?.length || 0));
        const bestCandidate = sorted[0];
        suggestedAssigneeId = bestCandidate.userId;
        reason += ` Suggesting assignment to **${bestCandidate.user?.name || "Team Member"}** who currently has the lightest active workload (${bestCandidate.user?.tasks?.length || 0} active tasks).`;
      }

      if (title.split(" ").length > 5 || (description?.split(" ").length || 0) > 20) {
        estimatedHours = Math.max(1, Math.ceil((title.split(" ").length + (description?.split(" ").length || 0)) / 10));
      }

      if (similarTasks.length > 0) {
        reason += ` Found ${similarTasks.length} similar existing task(s).`;
      }
    } catch (error) {
      console.warn("[TaskIntelligence] Failed fetching workloads:", error);
    }

    return { priority, suggestedAssigneeId, reason, estimatedHours };
  }

  public static async hasDependencyCycle(
    workspaceId: string,
    taskId: string,
    predecessorId: string
  ): Promise<boolean> {
    const db = getPrismaClient(workspaceId);

    try {
      const visited = new Set<string>();

      const checkCycle = async (currentId: string): Promise<boolean> => {
        if (currentId === taskId) return true;
        if (visited.has(currentId)) return false;
        visited.add(currentId);

        const dependencies = await db.taskDependency.findMany({
          where: { taskId: currentId },
        });

        for (const dep of dependencies) {
          if (await checkCycle(dep.predecessorId)) return true;
        }
        return false;
      };

      return await checkCycle(predecessorId);
    } catch (error) {
      console.warn("[TaskIntelligence] Error checking cycle:", error);
      return false;
    }
  }

  public static async checkTaskHealth(
    workspaceId: string,
    taskId: string
  ): Promise<TaskHealthStatus | null> {
    try {
      const db = getPrismaClient(workspaceId);
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: { predecessors: true },
      });

      if (!task) return null;

      const now = new Date();
      const daysSinceLastUpdate = Math.floor((now.getTime() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = task.dueDate ? new Date(task.dueDate) < now && task.status !== "done" : false;
      const hasBlockingDependencies = task.predecessors?.some((d: any) => d.type === "FS") ?? false;

      let status: TaskHealthStatus["status"] = "ON_TRACK";
      if (isOverdue) status = "OVERDUE";
      else if (daysSinceLastUpdate > 4 && task.status !== "done") status = "STALLED";
      else if (hasBlockingDependencies) status = "BLOCKED";
      else if (daysSinceLastUpdate > 2) status = "AT_RISK";

      return { status, daysSinceLastUpdate, isOverdue, hasBlockingDependencies };
    } catch (error) {
      console.warn("[TaskIntelligence] Error checking task health:", error);
      return null;
    }
  }

  public static async findDuplicates(
    workspaceId: string,
    title: string
  ): Promise<DuplicateCheckResult> {
    try {
      const db = getPrismaClient(workspaceId);
      const similarTasks = await db.task.findMany({
        where: {
          workspaceId,
          title: { contains: title.substring(0, 40) },
          status: { not: "done" },
        },
        select: { id: true, title: true, status: true },
        take: 5,
      });

      const confidence = similarTasks.length > 0
        ? Math.min(100, similarTasks.filter(t =>
            t.title.toLowerCase().includes(title.toLowerCase().substring(0, 10))
          ).length * 25)
        : 0;

      return {
        isDuplicate: confidence > 50,
        similarTasks,
        confidence,
      };
    } catch (error) {
      console.warn("[TaskIntelligence] Error finding duplicates:", error);
      return { isDuplicate: false, similarTasks: [], confidence: 0 };
    }
  }
}
