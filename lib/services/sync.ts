import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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
