import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id?: string | number;
}

const JSONRPC_INTERNAL_ERROR = -32603;
const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INVALID_PARAMS = -32602;
const JSONRPC_PARSE_ERROR = -32700;

export class ThetaMCPServer {
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  getTools(): MCPTool[] {
    return [
      {
        name: "search_tasks",
        description:
          "Search tasks by title, status, priority, or assignee within the workspace",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Title search term (partial match)" },
            status: {
              type: "string",
              enum: ["todo", "in_progress", "in_review", "done", "cancelled"],
              description: "Filter by task status",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              description: "Filter by priority",
            },
            assigneeId: {
              type: "string",
              description: "Filter by assignee user ID",
            },
            projectId: {
              type: "string",
              description: "Filter by project ID",
            },
            taskType: {
              type: "string",
              enum: ["task", "bug", "feature", "story", "epic", "improvement"],
              description: "Filter by task type",
            },
            limit: { type: "number", description: "Max results (default 25, max 100)" },
          },
          required: [],
        },
      },
      {
        name: "get_task",
        description: "Get a single task by its ID with full details",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "The task ID" },
          },
          required: ["taskId"],
        },
      },
      {
        name: "create_task",
        description: "Create a new task in a project",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Task title" },
            description: { type: "string", description: "Task description (markdown supported)" },
            projectId: { type: "string", description: "Project ID to create the task in" },
            status: {
              type: "string",
              enum: ["todo", "in_progress", "in_review", "done"],
              description: "Initial status (default: todo)",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              description: "Priority level (default: medium)",
            },
            taskType: {
              type: "string",
              enum: ["task", "bug", "feature", "story", "epic", "improvement"],
              description: "Task type (default: task)",
            },
            dueDate: { type: "string", description: "Due date in ISO 8601 format" },
            assigneeIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of user IDs to assign",
            },
          },
          required: ["title", "projectId"],
        },
      },
      {
        name: "update_task",
        description: "Update fields on an existing task",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "The task ID to update" },
            title: { type: "string", description: "New title" },
            description: { type: "string", description: "New description" },
            status: {
              type: "string",
              enum: ["todo", "in_progress", "in_review", "done", "cancelled"],
              description: "New status",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              description: "New priority",
            },
            dueDate: { type: "string", description: "New due date (ISO 8601, or null to clear)" },
            assigneeIds: {
              type: "array",
              items: { type: "string" },
              description: "Replace assignee list",
            },
            progress: { type: "number", description: "Progress percentage (0-100)" },
          },
          required: ["taskId"],
        },
      },
      {
        name: "get_project_stats",
        description: "Get statistics for a project including task counts, completion rate, and breakdowns",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "Project ID" },
          },
          required: ["projectId"],
        },
      },
      {
        name: "list_projects",
        description: "List all projects in the workspace with basic info",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_team_workload",
        description:
          "Get workload distribution across team members — how many tasks each person has and by status",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "Optional: scope to a specific project",
            },
          },
          required: [],
        },
      },
      {
        name: "get_overdue_tasks",
        description: "Get all tasks that are past their due date and not completed",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "Optional: scope to a specific project" },
            limit: { type: "number", description: "Max results (default 50)" },
          },
          required: [],
        },
      },
      {
        name: "get_recent_activity",
        description: "Get recent activity feed for the workspace",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Number of activity entries (default 20, max 100)" },
            projectId: { type: "string", description: "Optional: scope to a specific project" },
            entityType: {
              type: "string",
              description: "Filter by entity type (e.g., 'Task', 'Project', 'Document')",
            },
          },
          required: [],
        },
      },
      {
        name: "query_knowledge",
        description:
          "Search workspace documents by title or content — useful for finding knowledge base entries, specs, notes",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search term" },
            projectId: { type: "string", description: "Optional: scope to a project" },
            limit: { type: "number", description: "Max results (default 10)" },
          },
          required: ["query"],
        },
      },
    ];
  }

  getResources(): MCPResource[] {
    return [
      {
        uri: "theta://workspace",
        name: "Workspace Info",
        description: "Workspace name, plan, and basic metadata",
        mimeType: "application/json",
      },
      {
        uri: "theta://tasks",
        name: "All Tasks",
        description: "Tasks in the workspace, filterable by status",
        mimeType: "application/json",
      },
      {
        uri: "theta://projects",
        name: "All Projects",
        description: "Projects with task count summaries",
        mimeType: "application/json",
      },
      {
        uri: "theta://team",
        name: "Team Members",
        description: "Team members and their current workload",
        mimeType: "application/json",
      },
      {
        uri: "theta://documents",
        name: "Documents",
        description: "All workspace documents (knowledge base)",
        mimeType: "application/json",
      },
      {
        uri: "theta://activity",
        name: "Recent Activity",
        description: "Recent activity feed",
        mimeType: "application/json",
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case "search_tasks":
        return this.searchTasks(args);
      case "get_task":
        return this.getTask(args);
      case "create_task":
        return this.createTask(args);
      case "update_task":
        return this.updateTask(args);
      case "get_project_stats":
        return this.getProjectStats(args);
      case "list_projects":
        return this.listProjects();
      case "get_team_workload":
        return this.getTeamWorkload(args);
      case "get_overdue_tasks":
        return this.getOverdueTasks(args);
      case "get_recent_activity":
        return this.getRecentActivity(args);
      case "query_knowledge":
        return this.queryKnowledge(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async readResource(uri: string): Promise<string> {
    switch (uri) {
      case "theta://workspace":
        return this.readWorkspaceResource();
      case "theta://tasks":
        return this.readTasksResource();
      case "theta://projects":
        return this.readProjectsResource();
      case "theta://team":
        return this.readTeamResource();
      case "theta://documents":
        return this.readDocumentsResource();
      case "theta://activity":
        return this.readActivityResource();
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { method, params, id } = request;

    try {
      switch (method) {
        case "initialize":
          return {
            jsonrpc: "2.0",
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {},
                resources: { listChanged: false },
              },
              serverInfo: {
                name: "theta-mcp",
                version: "1.0.0",
              },
            },
            id,
          };

        case "notifications/initialized":
          return { jsonrpc: "2.0", id };

        case "tools/list":
          return {
            jsonrpc: "2.0",
            result: { tools: this.getTools() },
            id,
          };

        case "tools/call": {
          const { name, arguments: args } = (params || {}) as {
            name: string;
            arguments?: Record<string, unknown>;
          };
          const result = await this.callTool(name, args || {});
          return {
            jsonrpc: "2.0",
            result: {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            },
            id,
          };
        }

        case "resources/list":
          return {
            jsonrpc: "2.0",
            result: { resources: this.getResources() },
            id,
          };

        case "resources/read": {
          const { uri } = (params || {}) as { uri: string };
          const content = await this.readResource(uri);
          return {
            jsonrpc: "2.0",
            result: {
              contents: [{ uri, mimeType: "application/json", text: content }],
            },
            id,
          };
        }

        case "ping":
          return { jsonrpc: "2.0", result: {}, id };

        default:
          return {
            jsonrpc: "2.0",
            error: {
              code: JSONRPC_METHOD_NOT_FOUND,
              message: `Method not found: ${method}`,
            },
            id,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`MCP error handling ${method}:`, message);
      return {
        jsonrpc: "2.0",
        error: {
          code: JSONRPC_INTERNAL_ERROR,
          message,
        },
        id,
      };
    }
  }

  // ── Tool implementations ──────────────────────────────────────────────

  private async searchTasks(args: Record<string, unknown>) {
    const query = args.query as string | undefined;
    const status = args.status as string | undefined;
    const priority = args.priority as string | undefined;
    const assigneeId = args.assigneeId as string | undefined;
    const projectId = args.projectId as string | undefined;
    const taskType = args.taskType as string | undefined;
    const limit = Math.min(Number(args.limit) || 25, 100);

    const where: Record<string, unknown> = { workspaceId: this.workspaceId };

    if (query) {
      where.title = { contains: query, mode: "insensitive" };
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeIds = { has: assigneeId };
    if (projectId) where.projectId = projectId;
    if (taskType) where.taskType = taskType;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        taskType: true,
        dueDate: true,
        projectId: true,
        assigneeIds: true,
        progress: true,
        createdAt: true,
        completedAt: true,
      },
    });

    logger.info(`MCP search_tasks: found ${tasks.length} tasks`);
    return tasks;
  }

  private async getTask(args: Record<string, unknown>) {
    const taskId = args.taskId as string;
    if (!taskId) throw new Error("taskId is required");

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true } },
        subtasks: { select: { id: true, title: true, completed: true } },
        comments: {
          select: { id: true, content: true, userId: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        tags: { select: { id: true, name: true, color: true } },
      },
    });

    if (!task) throw new Error(`Task not found: ${taskId}`);
    return task;
  }

  private async createTask(args: Record<string, unknown>) {
    const title = args.title as string;
    const projectId = args.projectId as string;
    if (!title || !projectId) throw new Error("title and projectId are required");

    const task = await prisma.task.create({
      data: {
        title,
        description: (args.description as string) || null,
        status: (args.status as string) || "todo",
        priority: (args.priority as string) || "medium",
        taskType: (args.taskType as string) || "task",
        dueDate: args.dueDate ? new Date(args.dueDate as string) : null,
        assigneeIds: (args.assigneeIds as string[]) || [],
        workspaceId: this.workspaceId,
        projectId,
        userId: (args.assigneeIds as string[])?.[0] || "",
      },
    });

    logger.info(`MCP create_task: created task ${task.id} "${task.title}"`);
    return task;
  }

  private async updateTask(args: Record<string, unknown>) {
    const taskId = args.taskId as string;
    if (!taskId) throw new Error("taskId is required");

    const data: Record<string, unknown> = {};
    if (args.title !== undefined) data.title = args.title;
    if (args.description !== undefined) data.description = args.description;
    if (args.status !== undefined) {
      data.status = args.status;
      if (args.status === "done") data.completedAt = new Date();
    }
    if (args.priority !== undefined) data.priority = args.priority;
    if (args.dueDate !== undefined)
      data.dueDate = args.dueDate ? new Date(args.dueDate as string) : null;
    if (args.assigneeIds !== undefined) data.assigneeIds = args.assigneeIds;
    if (args.progress !== undefined) data.progress = Math.min(Math.max(Number(args.progress), 0), 100);

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
    });

    logger.info(`MCP update_task: updated task ${task.id}`);
    return task;
  }

  private async getProjectStats(args: Record<string, unknown>) {
    const projectId = args.projectId as string;
    if (!projectId) throw new Error("projectId is required");

    const [project, totalTasks, statusCounts, priorityCounts] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, description: true },
      }),
      prisma.task.count({ where: { projectId, workspaceId: this.workspaceId } }),
      prisma.task.groupBy({
        by: ["status"],
        where: { projectId, workspaceId: this.workspaceId },
        _count: { id: true },
      }),
      prisma.task.groupBy({
        by: ["priority"],
        where: { projectId, workspaceId: this.workspaceId },
        _count: { id: true },
      }),
    ]);

    if (!project) throw new Error(`Project not found: ${projectId}`);

    const statusBreakdown: Record<string, number> = {};
    statusCounts.forEach((s) => (statusBreakdown[s.status] = s._count.id));

    const priorityBreakdown: Record<string, number> = {};
    priorityCounts.forEach((p) => (priorityBreakdown[p.priority] = p._count.id));

    const completedCount = statusBreakdown["done"] || 0;
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    return {
      project,
      totalTasks,
      completionRate,
      statusBreakdown,
      priorityBreakdown,
    };
  }

  private async listProjects() {
    const projects = await prisma.project.findMany({
      where: { workspaceId: this.workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        createdAt: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return projects;
  }

  private async getTeamWorkload(args: Record<string, unknown>) {
    const projectId = args.projectId as string | undefined;

    const taskWhere: Record<string, unknown> = {
      workspaceId: this.workspaceId,
      status: { notIn: ["done", "cancelled"] },
    };
    if (projectId) taskWhere.projectId = projectId;

    const activeTasks = await prisma.task.findMany({
      where: taskWhere,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        assigneeIds: true,
        dueDate: true,
        projectId: true,
      },
    });

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: this.workspaceId },
      include: { user: { select: { id: true, name: true, email: true, imageUrl: true } } },
    });

    const workloadMap: Record<
      string,
      {
        user: { id: string; name: string | null; email: string; imageUrl: string | null };
        totalTasks: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        overdue: number;
      }
    > = {};

    for (const member of members) {
      workloadMap[member.user.id] = {
        user: member.user,
        totalTasks: 0,
        byStatus: {},
        byPriority: {},
        overdue: 0,
      };
    }

    const now = new Date();
    for (const task of activeTasks) {
      for (const uid of task.assigneeIds) {
        if (!workloadMap[uid]) {
          workloadMap[uid] = {
            user: { id: uid, name: null, email: "", imageUrl: null },
            totalTasks: 0,
            byStatus: {},
            byPriority: {},
            overdue: 0,
          };
        }
        const entry = workloadMap[uid];
        entry.totalTasks++;
        entry.byStatus[task.status] = (entry.byStatus[task.status] || 0) + 1;
        entry.byPriority[task.priority] = (entry.byPriority[task.priority] || 0) + 1;
        if (task.dueDate && task.dueDate < now) entry.overdue++;
      }
    }

    const team = Object.values(workloadMap)
      .filter((w) => w.totalTasks > 0)
      .sort((a, b) => b.totalTasks - a.totalTasks);

    return { totalActiveTasks: activeTasks.length, team };
  }

  private async getOverdueTasks(args: Record<string, unknown>) {
    const projectId = args.projectId as string | undefined;
    const limit = Math.min(Number(args.limit) || 50, 100);

    const where: Record<string, unknown> = {
      workspaceId: this.workspaceId,
      dueDate: { lt: new Date() },
      status: { notIn: ["done", "cancelled"] },
    };
    if (projectId) where.projectId = projectId;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeIds: true,
        projectId: true,
        project: { select: { name: true } },
        createdAt: true,
      },
    });

    const now = new Date();
    const tasksWithDaysOverdue = tasks.map((t) => ({
      ...t,
      daysOverdue: t.dueDate
        ? Math.ceil((now.getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    return tasksWithDaysOverdue;
  }

  private async getRecentActivity(args: Record<string, unknown>) {
    const limit = Math.min(Number(args.limit) || 20, 100);
    const projectId = args.projectId as string | undefined;
    const entityType = args.entityType as string | undefined;

    const where: Record<string, unknown> = { workspaceId: this.workspaceId };
    if (projectId) where.projectId = projectId;
    if (entityType) where.entityType = entityType;

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return activities;
  }

  private async queryKnowledge(args: Record<string, unknown>) {
    const query = args.query as string;
    const projectId = args.projectId as string | undefined;
    const limit = Math.min(Number(args.limit) || 10, 50);

    if (!query) throw new Error("query is required");

    const where: Record<string, unknown> = {
      workspaceId: this.workspaceId,
      archived: false,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
        { tags: { has: query } },
      ],
    };
    if (projectId) where.projectId = projectId;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        emoji: true,
        tags: true,
        projectId: true,
        status: true,
        views: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return documents;
  }

  // ── Resource implementations ──────────────────────────────────────────

  private async readWorkspaceResource(): Promise<string> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: this.workspaceId },
      select: {
        id: true,
        name: true,
        plan: true,
        createdAt: true,
        _count: {
          select: { projects: true, tasks: true, members: true, documents: true },
        },
      },
    });

    return JSON.stringify(workspace, null, 2);
  }

  private async readTasksResource(): Promise<string> {
    const tasks = await prisma.task.findMany({
      where: { workspaceId: this.workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        taskType: true,
        dueDate: true,
        projectId: true,
        assigneeIds: true,
        progress: true,
        createdAt: true,
      },
    });

    return JSON.stringify(tasks, null, 2);
  }

  private async readProjectsResource(): Promise<string> {
    const projects = await prisma.project.findMany({
      where: { workspaceId: this.workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        createdAt: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return JSON.stringify(projects, null, 2);
  }

  private async readTeamResource(): Promise<string> {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: this.workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, imageUrl: true } },
      },
    });

    const taskCounts = await prisma.task.groupBy({
      by: ["assigneeIds"],
      where: {
        workspaceId: this.workspaceId,
        status: { notIn: ["done", "cancelled"] },
      },
      _count: { id: true },
    });

    const workload: Record<string, number> = {};
    for (const tc of taskCounts) {
      for (const uid of tc.assigneeIds) {
        workload[uid] = (workload[uid] || 0) + tc._count.id;
      }
    }

    const team = members.map((m) => ({
      ...m.user,
      role: m.role,
      activeTasks: workload[m.user.id] || 0,
    }));

    return JSON.stringify(team, null, 2);
  }

  private async readDocumentsResource(): Promise<string> {
    const documents = await prisma.document.findMany({
      where: { workspaceId: this.workspaceId, archived: false },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        emoji: true,
        tags: true,
        projectId: true,
        status: true,
        views: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return JSON.stringify(documents, null, 2);
  }

  private async readActivityResource(): Promise<string> {
    const activities = await prisma.activity.findMany({
      where: { workspaceId: this.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return JSON.stringify(activities, null, 2);
  }
}
