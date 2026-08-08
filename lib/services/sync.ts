import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { enforcePlanLimit } from "@/lib/plan-limits";
import { getProjectCount } from "@/lib/usage-tracking";
import { createActivity } from "@/lib/activity";

export interface NormalizedSyncItem {
  externalId: string;
  type: string;
  title: string;
  description?: string;
  url?: string;
  status?: string;
  extra?: Record<string, unknown>;
}

// Containers link to Theta projects; their children become tasks.
export const CONTAINER_TYPES = ["repo", "board", "project"];
export const WORK_ITEM_TYPES = ["issue", "card", "task"];
export const CATALOG_TYPES = ["product"];

type JsonRecord = Record<string, any>;

const trim = (s: unknown): string | undefined => {
  if (typeof s !== "string" || !s.trim()) return undefined;
  return s.trim();
};

export function normalizeGithubRepo(repo: JsonRecord): NormalizedSyncItem {
  return {
    externalId: String(repo.id),
    type: "repo",
    title: repo.full_name || repo.name,
    description: trim(repo.description),
    url: repo.html_url,
    status: repo.private ? "private" : "public",
    extra: { language: repo.language, stars: repo.stargazers_count, fork: repo.fork },
  };
}

export function normalizeGithubIssue(issue: JsonRecord): NormalizedSyncItem {
  return {
    externalId: `issue-${issue.id}`,
    type: "issue",
    title: `[${issue.repository?.full_name ?? "repo"}] #${issue.number} ${issue.title}`,
    description: trim(issue.body),
    url: issue.html_url,
    status: issue.state,
    extra: {
      parentId: issue.repository?.id != null ? String(issue.repository.id) : undefined,
      number: issue.number,
      repo: issue.repository?.full_name,
      labels: Array.isArray(issue.labels) ? issue.labels.map((l: any) => l?.name).filter(Boolean) : [],
      assignees: Array.isArray(issue.assignees) ? issue.assignees.map((a: any) => a?.login).filter(Boolean) : [],
    },
  };
}

export function normalizeBitbucketRepo(repo: JsonRecord): NormalizedSyncItem {
  return {
    externalId: repo.uuid || repo.slug || repo.full_name,
    type: "repo",
    title: repo.full_name || repo.name || repo.slug,
    description: trim(repo.description),
    url: repo.links?.html?.href,
    status: repo.is_private ? "private" : "public",
    extra: { language: repo.language, slug: repo.slug },
  };
}

export function normalizeAsanaProject(project: JsonRecord): NormalizedSyncItem {
  return {
    externalId: project.gid,
    type: "project",
    title: project.name,
    description: trim(project.notes),
    url: project.html_url || project.permalink_url,
    status: project.archived ? "archived" : "active",
    extra: { color: project.color, owner: project.owner?.name },
  };
}

export function normalizeAsanaTask(task: JsonRecord, projectGid: string): NormalizedSyncItem {
  return {
    externalId: task.gid,
    type: "task",
    title: task.name,
    description: trim(task.notes),
    url: task.permalink_url,
    status: task.completed ? "closed" : "open",
    extra: { parentId: projectGid, dueOn: task.due_on },
  };
}

export function normalizeTrelloBoard(board: JsonRecord): NormalizedSyncItem {
  return {
    externalId: board.id,
    type: "board",
    title: board.name,
    description: trim(board.desc),
    url: board.url,
    status: board.closed ? "closed" : "open",
    extra: { organization: board.idOrganization },
  };
}

export function normalizeTrelloCard(card: JsonRecord, boardId: string): NormalizedSyncItem {
  return {
    externalId: card.id,
    type: "card",
    title: card.name,
    description: trim(card.desc),
    url: card.url,
    status: card.closed ? "closed" : "open",
    extra: { parentId: boardId, list: card.list?.name, listId: card.idList },
  };
}

export function normalizeWooProduct(product: JsonRecord): NormalizedSyncItem {
  return {
    externalId: String(product.id),
    type: "product",
    title: product.name,
    description: trim(product.short_description?.replace(/<[^>]*>/g, "") || product.description?.replace(/<[^>]*>/g, "")),
    url: product.permalink,
    status: product.status,
    extra: { price: product.price, sku: product.sku, stock: product.stock_status },
  };
}

export function normalizeGoogleEvent(event: JsonRecord): NormalizedSyncItem {
  return {
    externalId: event.id,
    type: "event",
    title: event.summary || "(No title)",
    description: trim(event.description),
    url: event.htmlLink,
    status: event.status,
    extra: {
      start: event.start?.dateTime ?? event.start?.date,
      end: event.end?.dateTime ?? event.end?.date,
      location: event.location,
    },
  };
}

export async function persistSyncedItems(
  workspaceId: string,
  integrationId: string,
  provider: string,
  items: NormalizedSyncItem[],
): Promise<number> {
  if (items.length === 0) return 0;

  const upserts = items.map((item) =>
    prisma.syncedItem.upsert({
      where: {
        provider_externalId_type: { provider, externalId: item.externalId, type: item.type },
      },
      update: {
        integrationId,
        workspaceId,
        title: item.title,
        description: item.description ?? null,
        url: item.url ?? null,
        status: item.status ?? null,
        extra: (item.extra ?? {}) as object,
        syncedAt: new Date(),
      },
      create: {
        integrationId,
        workspaceId,
        provider,
        type: item.type,
        externalId: item.externalId,
        title: item.title,
        description: item.description ?? null,
        url: item.url ?? null,
        status: item.status ?? null,
        extra: (item.extra ?? {}) as object,
      },
    }),
  );

  await Promise.all(upserts);
  logger.info(`Persisted ${items.length} synced items`, { workspaceId, provider });
  return items.length;
}

export async function listSyncedItems(
  workspaceId: string,
  provider?: string,
): Promise<any[]> {
  return prisma.syncedItem.findMany({
    where: { workspaceId, ...(provider ? { provider } : {}) },
    orderBy: [{ syncedAt: "desc" }, { createdAt: "desc" }],
  });
}

const sourceLineFor = (item: {
  provider: string;
  type: string;
  url?: string | null;
  externalId: string;
}): string => `Imported from ${item.provider} (${item.type}): ${item.url ?? item.externalId}`;

function buildDescription(item: {
  description?: string | null;
  provider: string;
  type: string;
  url?: string | null;
  externalId: string;
}): string {
  return [item.description, sourceLineFor(item)].filter(Boolean).join("\n\n");
}

async function resolveColumnForStatus(
  boardId: string | null,
  status: string,
): Promise<string | null> {
  if (!boardId) return null;
  const statusName = status.replace(/_/g, " ");
  const match = await prisma.column.findFirst({
    where: { boardId, name: { equals: statusName, mode: "insensitive" } },
  });
  if (match) return match.id;
  const first = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { order: "asc" },
  });
  return first?.id ?? null;
}

// Trello cards prefer a column named after their list; everything else falls
// back to the status column.
async function resolveColumnForItem(
  boardId: string | null,
  item: any,
  status: string,
): Promise<string | null> {
  if (item.provider === "trello" && item.extra?.list && boardId) {
    const listCol = await prisma.column.findFirst({
      where: { boardId, name: { equals: item.extra.list, mode: "insensitive" } },
    });
    if (listCol) return listCol.id;
  }
  return resolveColumnForStatus(boardId, status);
}

async function resolveBoardAndColumn(
  projectId: string,
  boardId: string | null | undefined,
  item: any,
  status: string,
): Promise<{ boardId: string | null; columnId: string | null }> {
  let resolvedBoardId = boardId ?? null;
  if (!resolvedBoardId) {
    const board = await prisma.board.findFirst({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    if (board) resolvedBoardId = board.id;
  }
  const resolvedColumnId = await resolveColumnForItem(resolvedBoardId, item, status);
  return { boardId: resolvedBoardId, columnId: resolvedColumnId };
}

// Work items (issues, cards, tasks) map their state to Theta statuses.
// Closed -> done (terminal status), open -> todo.
function workItemStatusMapping(item: {
  type: string;
  status?: string | null;
}): { status: string; completedAt: Date | null } | null {
  if (!WORK_ITEM_TYPES.includes(item.type)) return null;
  if (item.status === "closed") return { status: "done", completedAt: new Date() };
  return { status: "todo", completedAt: null };
}

export async function createTaskForSyncedItem(
  item: any,
  userId: string,
  projectId: string,
  boardId?: string | null,
) {
  const mapping = workItemStatusMapping(item);
  const status = mapping?.status ?? "todo";
  const completedAt = mapping?.completedAt ?? null;

  const { boardId: resolvedBoardId, columnId: resolvedColumnId } = await resolveBoardAndColumn(
    projectId,
    boardId,
    item,
    status,
  );

  const task = await prisma.task.create({
    data: {
      title: item.title,
      description: buildDescription(item),
      status,
      priority: "medium",
      taskType: "task",
      workspaceId: item.workspaceId,
      projectId,
      userId,
      assigneeIds: [],
      boardId: resolvedBoardId,
      columnId: resolvedColumnId,
      completedAt,
      link: item.url ?? null,
      customFieldMetadata: {
        provider: item.provider,
        externalId: item.externalId,
        type: item.type,
      } as object,
    },
  });

  return task;
}

// Create a project (with a default board and statuses/columns) to host a linked
// container. Trello board lists can be passed in as the column names.
export async function createLinkedProject(
  workspaceId: string,
  userId: string,
  name: string,
  columns?: string[],
) {
  const columnNames = columns?.length ? columns : ["Todo", "In Progress", "Done"];

  const projectCount = await getProjectCount(workspaceId);
  await enforcePlanLimit(workspaceId, "projects", projectCount);

  const project = await prisma.project.create({
    data: {
      name,
      workspaceId,
      userId,
      members: { create: { userId, role: "manager" } },
    },
  });

  const board = await prisma.board.create({
    data: {
      name: project.name,
      projectId: project.id,
      workspaceId: project.workspaceId,
      description: "",
    },
  });

  for (let i = 0; i < columnNames.length; i++) {
    const existingStatus = await prisma.status.findFirst({
      where: { projectId: project.id, name: { equals: columnNames[i], mode: "insensitive" } },
    });
    const status =
      existingStatus ||
      (await prisma.status.create({
        data: {
          name: columnNames[i],
          order: i,
          projectId: project.id,
          workspaceId: project.workspaceId,
        },
      }));

    await prisma.column.create({
      data: {
        name: columnNames[i],
        boardId: board.id,
        order: i,
      },
    });
  }

  await createActivity(userId, workspaceId, "created", "project", project.id, {
    projectName: project.name,
    entityName: project.name,
  });

  return project;
}

export async function importSyncedItem(
  itemId: string,
  userId: string,
  projectId: string,
  boardId?: string | null,
) {
  const item = await prisma.syncedItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Synced item not found");

  if (!WORK_ITEM_TYPES.includes(item.type)) {
    throw new Error("This item is a container or catalog item — it cannot be imported as a task.");
  }

  if (item.imported && item.taskId) {
    const existing = await prisma.task.findUnique({ where: { id: item.taskId } });
    if (existing) return { task: existing, alreadyImported: true };
  }

  // Default to the linked project when the item's parent container is linked.
  let targetProjectId = projectId;
  if (!targetProjectId) {
    const parentId = (item.extra as any)?.parentId as string | undefined;
    if (parentId) {
      const container = await prisma.syncedItem.findFirst({
        where: {
          workspaceId: item.workspaceId,
          provider: item.provider,
          externalId: parentId,
          type: { in: CONTAINER_TYPES },
        },
      });
      const linked = (container?.extra as any)?.linkedProjectId as string | undefined;
      if (linked) targetProjectId = linked;
    }
  }
  if (!targetProjectId) throw new Error("Missing projectId");

  const task = await createTaskForSyncedItem(item, userId, targetProjectId, boardId);

  await prisma.syncedItem.update({
    where: { id: item.id },
    data: { imported: true, taskId: task.id },
  });

  logger.info("Imported synced item as task", { itemId, taskId: task.id });
  return { task, alreadyImported: false };
}

// Push the latest external state into an already-linked task.
export async function updateTaskFromSyncedItem(item: any): Promise<any | null> {
  if (!item.taskId) return null;

  const task = await prisma.task.findUnique({ where: { id: item.taskId } });
  if (!task) return null;

  const data: any = {
    title: item.title,
    description: buildDescription(item),
  };

  if (WORK_ITEM_TYPES.includes(item.type)) {
    if (item.status === "closed" && task.status !== "done") {
      data.status = "done";
      data.completedAt = new Date();
      data.columnId = await resolveColumnForItem(task.boardId, item, "done");
    } else if (item.status === "open" && (task.status === "done" || task.completedAt)) {
      data.status = "todo";
      data.completedAt = null;
      data.columnId = await resolveColumnForItem(task.boardId, item, "todo");
    }
  }

  return prisma.task.update({ where: { id: task.id }, data });
}

// Reconcile synced data with Theta tasks for a provider:
// - imported children are updated (title/description, closed -> done, reopened -> todo)
// - open children of a linked container are auto-imported into that project
// - containers themselves never become tasks
export async function syncLinkedChildren(
  workspaceId: string,
  userId: string,
  provider: string,
): Promise<{ created: number; updated: number }> {
  const [containers, children] = await Promise.all([
    prisma.syncedItem.findMany({
      where: { workspaceId, provider, type: { in: CONTAINER_TYPES } },
    }),
    prisma.syncedItem.findMany({
      where: { workspaceId, provider, type: { in: WORK_ITEM_TYPES } },
    }),
  ]);

  const linkedByParent = new Map<string, string>();
  for (const container of containers) {
    const linked = (container.extra as any)?.linkedProjectId as string | undefined;
    if (linked) linkedByParent.set(container.externalId, linked);
  }

  let created = 0;
  let updated = 0;

  for (const child of children) {
    const parentId = (child.extra as any)?.parentId as string | undefined;
    const linkedProjectId = parentId ? linkedByParent.get(parentId) : undefined;

    if (child.taskId) {
      const result = await updateTaskFromSyncedItem(child);
      if (result) updated++;
    } else if (linkedProjectId && child.status !== "closed") {
      const task = await createTaskForSyncedItem(child, userId, linkedProjectId);
      await prisma.syncedItem.update({
        where: { id: child.id },
        data: { imported: true, taskId: task.id },
      });
      created++;
    }
  }

  logger.info("Synced children to tasks", { workspaceId, provider, created, updated });
  return { created, updated };
}

export async function importGoogleEventToCalendar(item: NormalizedSyncItem, workspaceId: string, userId: string) {
  const start = item.extra?.start as string | undefined;
  const end = item.extra?.end as string | undefined;
  if (!start) return null;

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + 60 * 60 * 1000);

  const existing = await prisma.calendarEvent.findFirst({
    where: {
      userId,
      metadata: { equals: { externalId: item.externalId, provider: "google" } },
    },
  });
  if (existing) return existing;

  return prisma.calendarEvent.create({
    data: {
      title: item.title,
      description: item.description ?? null,
      start: startDate,
      end: endDate,
      type: "event",
      workspaceId,
      userId,
      metadata: { externalId: item.externalId, provider: "google", url: item.url },
    },
  });
}

// ---------------------------------------------------------------------------
// One-off migration: convert legacy container/catalog tasks (created before
// containers were linked to projects) into their correct representation.
//   - container tasks (repo/board/project): link the container to a project
//     (match by name, else create a new project named after the container)
//     and delete the task.
//   - catalog tasks (product): just delete — products are never tasks.
// Idempotent: tasks with a work-item type, or containers already linked, are
// skipped. After converting, already-synced open children are imported into
// the newly linked projects (no API calls needed).
// ---------------------------------------------------------------------------
// Delete a task along with every record that references it, since the schema
// uses onDelete: NoAction for task relations (no automatic cascade).
async function deleteTaskAndDependents(taskId: string) {
  const comments = await prisma.comment.findMany({
    where: { taskId },
    select: { id: true },
  });
  const commentIds = comments.map((c) => c.id);
  if (commentIds.length) {
    await prisma.comment.deleteMany({ where: { parentId: { in: commentIds } } });
    await prisma.comment.deleteMany({ where: { taskId } });
  }

  await prisma.subtask.deleteMany({ where: { taskId } });
  await prisma.checklistItem.deleteMany({ where: { taskId } });
  await prisma.timeLog.deleteMany({ where: { taskId } });
  await prisma.taskDependency.deleteMany({
    where: { OR: [{ taskId }, { predecessorId: taskId }] },
  });
  await prisma.syncedItem.updateMany({
    where: { taskId },
    data: { taskId: null },
  });
  await prisma.task.delete({ where: { id: taskId } });
}

export async function migrateLegacyContainerTasks(workspaceId?: string) {
  const stats = {
    found: 0,
    linked: 0,
    createdProjects: 0,
    deleted: 0,
    skipped: 0,
    errors: 0,
  };
  const reconcile: { workspaceId: string; userId: string; provider: string }[] = [];

  const tasks = await prisma.task.findMany({
    where: workspaceId ? { workspaceId } : undefined,
    select: {
      id: true,
      title: true,
      workspaceId: true,
      projectId: true,
      userId: true,
      customFieldMetadata: true,
    },
  });
  const legacy = tasks.filter((t) => {
    const type = (t.customFieldMetadata as any)?.type;
    return CONTAINER_TYPES.includes(type) || CATALOG_TYPES.includes(type);
  });
  stats.found = legacy.length;

  for (const task of legacy) {
    try {
      const meta = task.customFieldMetadata as any;
      const synced = meta?.provider && meta?.externalId
        ? await prisma.syncedItem.findFirst({
            where: {
              workspaceId: task.workspaceId,
              provider: meta.provider,
              externalId: meta.externalId,
              type: meta.type,
            },
          })
        : null;

      if (synced && CONTAINER_TYPES.includes(meta.type) && !(synced.extra as any)?.linkedProjectId) {
        let project = await prisma.project.findFirst({
          where: { workspaceId: task.workspaceId, name: { equals: synced.title, mode: "insensitive" } },
        });

        if (!project) {
          try {
            project = await createLinkedProject(task.workspaceId, task.userId, synced.title);
            stats.createdProjects++;
          } catch {
            // Plan limit or other error: fall back to the task's existing project.
            project = await prisma.project.findUnique({ where: { id: task.projectId } });
          }
        }

        if (project && project.workspaceId === task.workspaceId) {
          await prisma.syncedItem.update({
            where: { id: synced.id },
            data: {
              extra: {
                ...((synced.extra as any) ?? {}),
                linkedProjectId: project.id,
                linkedProjectName: project.name,
              },
            },
          });
          stats.linked++;
          reconcile.push({ workspaceId: task.workspaceId, userId: task.userId, provider: meta.provider });
        }
      }

      await deleteTaskAndDependents(task.id);
      stats.deleted++;
    } catch (error: any) {
      stats.errors++;
      logger.error("Legacy container task migration failed", {
        taskId: task.id,
        error: error.message,
      });
    }
  }

  for (const { workspaceId: wid, userId, provider } of reconcile) {
    try {
      await syncLinkedChildren(wid, userId, provider);
    } catch {
      // best-effort reconciliation of already-synced children
    }
  }

  logger.info("Legacy container task migration complete", { workspaceId, stats });
  return stats;
}
