import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessibleProjectIds } from "@/lib/project-permissions";
import { z } from "zod";

const querySchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  search: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeSummary: z.coerce.boolean().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
});

const ENTITY_TYPE_MAP: Record<string, string[]> = {
  tasks: ["task"],
  projects: ["project"],
  boards: ["board"],
  comments: ["comment"],
  members: ["member", "workspace_member"],
  ai: ["ai", "AI_STREAM", "nova"],
  integrations: ["woocommerce_store", "trello_board", "github_repo", "bitbucket_repo", "asana_task", "integration"],
  billing: ["billing", "payment"],
  documents: ["document"],
  files: ["file"],
  teams: ["team"],
  settings: ["workspace", "settings"],
};

async function resolveEntityNames(
  activities: Array<{ entityType: string; entityId: string; metadata: any }>
): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();

  const taskIds = new Set<string>();
  const projectIds = new Set<string>();
  const boardIds = new Set<string>();

  for (const a of activities) {
    if (a.entityType === "task" && a.entityId) taskIds.add(a.entityId);
    if (a.entityType === "project" && a.entityId) projectIds.add(a.entityId);
    if (a.entityType === "board" && a.entityId) boardIds.add(a.entityId);
  }

  if (taskIds.size > 0) {
    const tasks = await prisma.task.findMany({
      where: { id: { in: Array.from(taskIds) } },
      select: { id: true, title: true },
    });
    for (const t of tasks) nameMap.set(`task:${t.id}`, t.title);
  }

  if (projectIds.size > 0) {
    const projects = await prisma.project.findMany({
      where: { id: { in: Array.from(projectIds) } },
      select: { id: true, name: true },
    });
    for (const p of projects) nameMap.set(`project:${p.id}`, p.name);
  }

  if (boardIds.size > 0) {
    const boards = await prisma.board.findMany({
      where: { id: { in: Array.from(boardIds) } },
      select: { id: true, name: true },
    });
    for (const b of boards) nameMap.set(`board:${b.id}`, b.name);
  }

  return nameMap;
}

function getEntityDisplayName(activity: any, nameMap: Map<string, string>): string {
  if (activity.metadata?.entityName) return activity.metadata.entityName;
  if (activity.metadata?.taskTitle) return activity.metadata.taskTitle;
  if (activity.metadata?.projectName) return activity.metadata.projectName;
  if (activity.metadata?.boardName) return activity.metadata.boardName;

  const key = `${activity.entityType}:${activity.entityId}`;
  const resolved = nameMap.get(key);
  if (resolved) return resolved;

  if (activity.entityType === "task") return "Deleted Task";
  if (activity.entityType === "project") return "Deleted Project";
  if (activity.entityType === "board") return "Deleted Board";
  if (activity.entityType === "comment") return "Comment";
  if (activity.entityType === "document") return "Document";
  if (activity.entityType === "file") return "File";

  return activity.entityType.replace(/_/g, " ");
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams.entries());
    const parsed = querySchema.safeParse(rawParams);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const {
      workspaceId,
      projectId,
      userId,
      entityType,
      entityId,
      search,
      action,
      startDate,
      endDate,
      includeSummary,
    } = parsed.data;

    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = Math.min(parseInt(searchParams.get("take") || "20", 10), 100);

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      include: { workspace: true }
    });

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { getPlanLimits, isValidPlan } = await import("@/lib/plan-limits");
    const rawPlan = membership.workspace.plan || "free";
    const planName = isValidPlan(rawPlan) ? rawPlan : "free";
    const limits = getPlanLimits(planName);

    const where: Record<string, unknown> = { workspaceId };

    if (limits.activityHistoryDays !== -1) {
      const { subDays } = await import("date-fns");
      const cutoffDate = subDays(new Date(), limits.activityHistoryDays);
      where.createdAt = { gte: cutoffDate };
    }

    if (startDate) {
      where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), lte: new Date(endDate) };
    }

    const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);

    if (projectId) {
      where.projectId = projectId;
    } else {
      where.OR = [
        { projectId: null },
        { projectId: { in: accessibleProjectIds } }
      ];
    }

    if (userId) where.userId = userId;

    if (entityType) {
      const mappedTypes = ENTITY_TYPE_MAP[entityType];
      if (mappedTypes) {
        where.entityType = { in: mappedTypes };
      } else {
        where.entityType = entityType;
      }
    }

    if (entityId) where.entityId = entityId;
    if (action) where.action = action;

    if (search) {
      const searchOr = [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { "metadata.entityName": { contains: search, mode: "insensitive" } },
        { "metadata.taskTitle": { contains: search, mode: "insensitive" } },
        { "metadata.projectName": { contains: search, mode: "insensitive" } },
        { "metadata.boardName": { contains: search, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR as Array<Record<string, unknown>> },
          { OR: searchOr },
        ];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    const [activitiesRaw, total] = await Promise.all([
      prisma.activity.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          project: { select: { id: true, name: true, color: true } }
        }
      }),
      prisma.activity.count({ where: where as any })
    ]);

    const userIds = Array.from(new Set(activitiesRaw.map(a => a.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, imageUrl: true, email: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const nameMap = await resolveEntityNames(activitiesRaw);

    const activities = activitiesRaw.map(a => {
      const displayName = getEntityDisplayName(a, nameMap);
      const meta = (a.metadata as any) || {};
      return {
        ...a,
        entityName: displayName,
        user: userMap.get(a.userId) || null,
        metadata: {
          ...meta,
          entityName: meta.entityName || displayName,
        },
      };
    });

    const result: Record<string, unknown> = {
      activities,
      total,
      hasMore: skip + take < total,
    };

    if (includeSummary) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [totalToday, completedToday, commentsToday, aiToday, activeMembers] = await Promise.all([
        prisma.activity.count({
          where: { workspaceId, createdAt: { gte: todayStart } } as any,
        }),
        prisma.activity.count({
          where: { workspaceId, action: "completed", entityType: "task", createdAt: { gte: todayStart } } as any,
        }),
        prisma.activity.count({
          where: { workspaceId, entityType: "comment", createdAt: { gte: todayStart } } as any,
        }),
        prisma.activity.count({
          where: { workspaceId, entityType: { in: ["ai", "AI_STREAM", "nova"] }, createdAt: { gte: todayStart } } as any,
        }),
        prisma.activity.findMany({
          where: { workspaceId, createdAt: { gte: todayStart } } as any,
          select: { userId: true },
          distinct: ["userId"],
        }),
      ]);

      result.summary = {
        totalToday,
        completedToday,
        commentsToday,
        aiToday,
        activeMembers: activeMembers.length,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Activity GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
