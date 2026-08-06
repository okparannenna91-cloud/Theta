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

async function resolveBoardAndColumn(
  projectId: string,
  boardId: string | null | undefined,
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
  const resolvedColumnId = await resolveColumnForStatus(resolvedBoardId, status);
  return { boardId: resolvedBoardId, columnId: resolvedColumnId };
}

// GitHub issues map their state to Theta statuses on import/sync.
// Closed -> done (terminal status), open -> todo.
function githubStatusMapping(item: {
  provider: string;
  type: string;
  status?: string | null;
}): { status: string; completedAt: Date | null } | null {
  if (item.provider !== "github" || item.type !== "issue") return null;
  if (item.status === "closed") return { status: "done", completedAt: new Date() };
  return { status: "todo", completedAt: null };
}

export async function createTaskForSyncedItem(
  item: any,
  userId: string,
  projectId: string,
  boardId?: string | null,
) {
  const mapping = githubStatusMapping(item);
  const status = mapping?.status ?? "todo";
  const completedAt = mapping?.completedAt ?? null;

  const { boardId: resolvedBoardId, columnId: resolvedColumnId } = await resolveBoardAndColumn(
    projectId,
    boardId,
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

// Find the SyncedItem for a repo (matched by full name) so callers can read its
// linked project. Uses a JS filter to avoid fragile Mongo JSON-path queries.
async function findRepoItem(workspaceId: string, repoFullName: string): Promise<any | null> {
  const repos = await prisma.syncedItem.findMany({
    where: { workspaceId, type: "repo" },
  });
  return repos.find((r) => r.title === repoFullName) ?? null;
}

export async function importSyncedItem(
  itemId: string,
  userId: string,
  projectId: string,
  boardId?: string | null,
) {
  const item = await prisma.syncedItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Synced item not found");

  if (item.type === "repo") {
    throw new Error("Repositories are linked to projects, not imported as tasks.");
  }

  if (item.imported && item.taskId) {
    const existing = await prisma.task.findUnique({ where: { id: item.taskId } });
    if (existing) return { task: existing, alreadyImported: true };
  }

  // Default to the linked project when the issue's repo is already linked.
  let targetProjectId = projectId;
  if (!targetProjectId && item.provider === "github" && item.type === "issue") {
    const repoFullName = (item.extra as any)?.repo as string | undefined;
    if (repoFullName) {
      const repoItem = await findRepoItem(item.workspaceId, repoFullName);
      const linked = (repoItem?.extra as any)?.linkedProjectId as string | undefined;
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

// Push the latest GitHub issue state into an already-linked task.
export async function updateTaskFromSyncedItem(item: any): Promise<any | null> {
  if (!item.taskId) return null;

  const task = await prisma.task.findUnique({ where: { id: item.taskId } });
  if (!task) return null;

  const data: any = {
    title: item.title,
    description: buildDescription(item),
  };

  if (item.provider === "github" && item.type === "issue") {
    if (item.status === "closed" && task.status !== "done") {
      data.status = "done";
      data.completedAt = new Date();
      data.columnId = await resolveColumnForStatus(task.boardId, "done");
    } else if (item.status === "open" && (task.status === "done" || task.completedAt)) {
      data.status = "todo";
      data.completedAt = null;
      data.columnId = await resolveColumnForStatus(task.boardId, "todo");
    }
  }

  return prisma.task.update({ where: { id: task.id }, data });
}

// Reconcile synced GitHub data with Theta tasks:
// - issues already imported are updated (title/description, closed -> done)
// - open issues of a repo linked to a project are auto-imported into that project
// - repositories themselves never become tasks
export async function syncGithubTasks(
  workspaceId: string,
  userId: string,
): Promise<{ created: number; updated: number }> {
  const [repoItems, issueItems] = await Promise.all([
    prisma.syncedItem.findMany({ where: { workspaceId, provider: "github", type: "repo" } }),
    prisma.syncedItem.findMany({ where: { workspaceId, provider: "github", type: "issue" } }),
  ]);

  const linkedByRepo = new Map<string, string>();
  for (const repo of repoItems) {
    const linked = (repo.extra as any)?.linkedProjectId as string | undefined;
    if (linked) linkedByRepo.set(repo.title, linked);
  }

  let created = 0;
  let updated = 0;

  for (const issue of issueItems) {
    const repoFullName = (issue.extra as any)?.repo as string | undefined;
    const linkedProjectId = repoFullName ? linkedByRepo.get(repoFullName) : undefined;

    if (issue.taskId) {
      const result = await updateTaskFromSyncedItem(issue);
      if (result) updated++;
    } else if (linkedProjectId && issue.status === "open") {
      const task = await createTaskForSyncedItem(issue, userId, linkedProjectId);
      await prisma.syncedItem.update({
        where: { id: issue.id },
        data: { imported: true, taskId: task.id },
      });
      created++;
    }
  }

  logger.info("Synced GitHub issues to tasks", { workspaceId, created, updated });
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
