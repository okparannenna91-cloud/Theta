import { prisma } from "../prisma";
import { TASK_QUALITY_STANDARDS, TASK_CREATION_FLOW, TASK_INTELLIGENCE_CAPABILITIES } from "./constitution/task-standards";
import { STATUS_DONE } from "../constants/status";
import { logger } from "../logger";

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
    
    const keywordResult = TaskIntelligence.keywordAnalysis(title, description);
    let enhancedResult = keywordResult;

    try {
      const llmResult = await TaskIntelligence.llmAnalysis(title, description);
      if (llmResult) {
        enhancedResult = {
          ...keywordResult,
          priority: llmResult.priority ?? keywordResult.priority,
          estimatedHours: llmResult.estimatedHours ?? keywordResult.estimatedHours,
          reason: `AI analysis: ${llmResult.reasoning}\n\nFallback: ${keywordResult.reason}`,
        };
      }
    } catch (error) {
      logger.warn("[TaskIntelligence] LLM analysis unavailable, using keyword fallback:", error);
    }

    let suggestedAssigneeId: string | undefined;
    let reason = enhancedResult.reason;

    try {
      const [members, similarTasks] = await Promise.all([
        prisma.workspaceMember.findMany({
          where: { workspaceId, status: "active" },
          include: { user: { include: { tasks: { where: { status: { not: STATUS_DONE } } } } } },
        }),
        prisma.task.findMany({
          where: {
            workspaceId,
            title: { contains: title.substring(0, 30) },
            status: { not: STATUS_DONE },
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

      if (similarTasks.length > 0) {
        reason += ` Found ${similarTasks.length} similar existing task(s).`;
      }
    } catch (error) {
      console.warn("[TaskIntelligence] Failed fetching workloads:", error);
    }

    return { priority: enhancedResult.priority, suggestedAssigneeId, reason, estimatedHours: enhancedResult.estimatedHours };
  }

  private static keywordAnalysis(title: string, description?: string): Pick<TaskRecommendation, "priority" | "estimatedHours" | "reason"> {
    const lowercaseTitle = title.toLowerCase();
    const lowercaseDesc = (description || "").toLowerCase();

    let priority: "low" | "medium" | "high" | "urgent" = "medium";

    if (lowercaseTitle.includes("fix") || lowercaseTitle.includes("broken") || lowercaseTitle.includes("critical") || lowercaseTitle.includes("crash") ||
        lowercaseDesc.includes("fix") || lowercaseDesc.includes("critical") || lowercaseDesc.includes("crash")) {
      priority = "high";
    }
    if (lowercaseTitle.includes("urgent") || lowercaseTitle.includes("asap") || lowercaseTitle.includes("blocker") ||
        lowercaseDesc.includes("urgent") || lowercaseDesc.includes("asap") || lowercaseDesc.includes("blocker")) {
      priority = "urgent";
    }
    if (lowercaseTitle.includes("refactor") || lowercaseTitle.includes("clean") || lowercaseTitle.includes("minor") ||
        lowercaseDesc.includes("refactor") || lowercaseDesc.includes("cleanup") || lowercaseDesc.includes("cosmetic")) {
      priority = "low";
    }

    let estimatedHours: number | undefined;
    if (title.split(" ").length > 5 || (description?.split(" ").length || 0) > 20) {
      estimatedHours = Math.max(1, Math.ceil((title.split(" ").length + (description?.split(" ").length || 0)) / 10));
    }

    const reason = `Priority mapped to **${priority}** based on keyword analysis of title and description.`;
    return { priority, estimatedHours, reason };
  }

  private static async llmAnalysis(title: string, description?: string): Promise<{ priority?: TaskRecommendation["priority"]; estimatedHours?: number; reasoning: string } | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const { generateWithOpenAI } = await import("@/lib/openai");
    const prompt = `Analyze this task and provide a priority recommendation and effort estimate.

Title: "${title}"
Description: "${description || "(no description)"}"

Respond in JSON format:
{
  "priority": "low|medium|high|urgent",
  "estimatedHours": <number or null>,
  "reasoning": "<brief explanation>"
}

Consider: urgency, complexity, impact, and keywords. Be conservative with estimates.`;

    const response = await generateWithOpenAI(prompt, "You are a task intelligence analyzer. Respond only with valid JSON.");
    if (!response) return null;

    try {
      const parsed = JSON.parse(response);
      const validPriorities = ["low", "medium", "high", "urgent"];
      return {
        priority: validPriorities.includes(parsed.priority) ? parsed.priority : undefined,
        estimatedHours: typeof parsed.estimatedHours === "number" ? parsed.estimatedHours : undefined,
        reasoning: parsed.reasoning || "LLM analysis completed.",
      };
    } catch {
      return null;
    }
  }

  public static async hasDependencyCycle(
    workspaceId: string,
    taskId: string,
    predecessorId: string
  ): Promise<boolean> {
    

    try {
      const visited = new Set<string>();

      const checkCycle = async (currentId: string): Promise<boolean> => {
        if (currentId === taskId) return true;
        if (visited.has(currentId)) return false;
        visited.add(currentId);

        const dependencies = await prisma.taskDependency.findMany({
          where: { taskId: currentId },
          include: { task: { select: { workspaceId: true } } },
        });

        for (const dep of dependencies) {
          if (dep.task?.workspaceId !== workspaceId) return false;
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
      
      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: { predecessors: true },
      });

      if (!task) return null;

      const now = new Date();
      const daysSinceLastUpdate = Math.floor((now.getTime() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = task.dueDate ? new Date(task.dueDate) < now && task.status !== STATUS_DONE : false;
      const hasBlockingDependencies = task.predecessors?.some((d: any) => d.type === "FS") ?? false;

      let status: TaskHealthStatus["status"] = "ON_TRACK";
      if (isOverdue) status = "OVERDUE";
      else if (daysSinceLastUpdate > 4 && task.status !== STATUS_DONE) status = "STALLED";
      else if (hasBlockingDependencies) status = "BLOCKED";
      else if (daysSinceLastUpdate > 2) status = "AT_RISK";

      return { status, daysSinceLastUpdate, isOverdue, hasBlockingDependencies };
    } catch (error) {
      logger.warn("[TaskIntelligence] Error checking task health:", error);
      return null;
    }
  }

  public static async findDuplicates(
    workspaceId: string,
    title: string
  ): Promise<DuplicateCheckResult> {
    try {
      
      const similarTasks = await prisma.task.findMany({
        where: {
          workspaceId,
          title: { contains: title.substring(0, 40) },
          status: { not: STATUS_DONE },
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
      logger.warn("[TaskIntelligence] Error finding duplicates:", error);
      return { isDuplicate: false, similarTasks: [], confidence: 0 };
    }
  }
}
