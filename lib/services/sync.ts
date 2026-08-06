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

export async function importSyncedItem(
  itemId: string,
  userId: string,
  projectId: string,
  boardId?: string | null,
) {
  const item = await prisma.syncedItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Synced item not found");

  if (item.imported && item.taskId) {
    const existing = await prisma.task.findUnique({ where: { id: item.taskId } });
    if (existing) return { task: existing, alreadyImported: true };
  }

  const sourceLine = `Imported from ${item.provider} (${item.type}): ${item.url ?? item.externalId}`;
  const description = [item.description, sourceLine].filter(Boolean).join("\n\n");

  let resolvedBoardId = boardId ?? null;
  let resolvedColumnId: string | null = null;

  if (!resolvedBoardId) {
    const board = await prisma.board.findFirst({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    if (board) resolvedBoardId = board.id;
  }

  if (resolvedBoardId) {
    const matchingColumn = await prisma.column.findFirst({
      where: { boardId: resolvedBoardId, name: { equals: "todo", mode: "insensitive" } },
    });
    if (matchingColumn) {
      resolvedColumnId = matchingColumn.id;
    } else {
      const firstCol = await prisma.column.findFirst({
        where: { boardId: resolvedBoardId },
        orderBy: { order: "asc" },
      });
      if (firstCol) resolvedColumnId = firstCol.id;
    }
  }

  const task = await prisma.task.create({
    data: {
      title: item.title,
      description,
      status: "todo",
      priority: "medium",
      taskType: "task",
      workspaceId: item.workspaceId,
      projectId,
      userId,
      assigneeIds: [],
      boardId: resolvedBoardId,
      columnId: resolvedColumnId,
      link: item.url ?? null,
      customFieldMetadata: {
        provider: item.provider,
        externalId: item.externalId,
        type: item.type,
      } as object,
    },
  });

  await prisma.syncedItem.update({
    where: { id: item.id },
    data: { imported: true, taskId: task.id },
  });

  logger.info("Imported synced item as task", { itemId, taskId: task.id });
  return { task, alreadyImported: false };
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
