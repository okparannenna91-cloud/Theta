import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  cacheKey,
} from "@/lib/cache";

// ── Types ───────────────────────────────────────────────────────────

export interface CreateDocumentInput {
  title: string;
  content?: string;
  emoji?: string;
  coverImage?: string;
  workspaceId: string;
  userId: string;
  projectId?: string;
  parentId?: string;
  status?: string;
  visibility?: string;
  tags?: string[];
  isTemplate?: boolean;
  isPinned?: boolean;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  emoji?: string;
  coverImage?: string;
  projectId?: string;
  parentId?: string;
  status?: string;
  visibility?: string;
  tags?: string[];
  isTemplate?: boolean;
  isPinned?: boolean;
  archived?: boolean;
}

export interface DocumentWithMeta {
  id: string;
  title: string;
  content: string | null;
  emoji: string | null;
  coverImage: string | null;
  projectId: string | null;
  parentId: string | null;
  status: string;
  visibility: string;
  tags: string[];
  isTemplate: boolean;
  views: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; imageUrl: string | null };
  children?: DocumentWithMeta[];
  commentCount: number;
  wordCount: number;
  lastEditedBy?: { id: string; name: string | null } | null;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  title: string;
  editedBy: string;
  editedAt: Date;
}

export interface WikiLink {
  sourceDocumentId: string;
  targetDocumentId: string;
  targetTitle: string;
  position: number;
}

export interface DocumentSearchResult {
  document: DocumentWithMeta;
  score: number;
  matchedContent: string;
}

interface DocumentStats {
  total: number;
  byStatus: Record<string, number>;
  byProject: { projectId: string | null; projectName: string | null; count: number }[];
  totalViews: number;
  totalWords: number;
}

// ── Constants ───────────────────────────────────────────────────────

const DOC_CACHE_TTL = 60;
const TREE_CACHE_TTL = 30;
const STATS_CACHE_TTL = 120;

// ── Helpers ─────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function countWords(html: string | null): number {
  if (!html) return 0;
  const stripped = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!stripped) return 0;
  return stripped.split(" ").length;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function extractSnippets(content: string, query: string, radius = 60): string {
  const lower = content.toLowerCase();
  const queryLower = query.toLowerCase();
  const idx = lower.indexOf(queryLower);
  if (idx === -1) return stripHtml(content).slice(0, 120);
  const start = Math.max(0, idx - radius);
  const end = Math.min(content.length, idx + query.length + radius);
  const snippet = content.slice(start, end);
  return `${start > 0 ? "..." : ""}${stripHtml(snippet)}${end < content.length ? "..." : ""}`;
}

async function invalidateDocCaches(
  documentId: string,
  workspaceId: string,
): Promise<void> {
  await Promise.all([
    cacheInvalidate(cacheKey("doc", documentId)),
    cacheInvalidate(cacheKey("doc-tree", workspaceId)),
    cacheInvalidate(cacheKey("doc-stats", workspaceId)),
  ]);
}

// ── Service ─────────────────────────────────────────────────────────

export async function createDocument(
  input: CreateDocumentInput,
): Promise<DocumentWithMeta> {
  const {
    title,
    content = null,
    emoji,
    coverImage,
    workspaceId,
    userId,
    projectId,
    parentId,
    status,
    visibility,
    tags,
    isTemplate,
    isPinned,
  } = input;

  const slug = slugify(title);

  const existing = await prisma.document.findFirst({
    where: { workspaceId, title: { equals: title, mode: "insensitive" }, archived: false },
  });

  const finalTitle = existing ? `${title} (${Date.now()})` : title;

  const doc = await prisma.document.create({
    data: {
      title: finalTitle,
      content,
      emoji: emoji ?? "📄",
      coverImage,
      workspaceId,
      userId,
      projectId: projectId ?? null,
      parentId: parentId ?? null,
      status: status ?? "PUBLISHED",
      visibility: visibility ?? "INTERNAL",
      tags: tags ?? [],
      isTemplate: isTemplate ?? false,
      isPinned: isPinned ?? false,
      lastEditedById: userId,
    },
    include: {
      user: { select: { id: true, name: true, imageUrl: true } },
      lastEditedBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  const result: DocumentWithMeta = {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    emoji: doc.emoji,
    coverImage: doc.coverImage,
    projectId: doc.projectId,
    parentId: doc.parentId,
    status: doc.status,
    visibility: doc.visibility,
    tags: doc.tags,
    isTemplate: doc.isTemplate,
    views: doc.views,
    isPinned: doc.isPinned,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    author: doc.user,
    commentCount: doc._count.comments,
    wordCount: countWords(doc.content),
    lastEditedBy: doc.lastEditedBy,
  };

  await invalidateDocCaches(doc.id, workspaceId);
  logger.info(`Document created: ${doc.id} "${finalTitle}" in workspace ${workspaceId}`);

  return result;
}

export async function updateDocument(
  documentId: string,
  updates: UpdateDocumentInput,
  userId?: string,
): Promise<DocumentWithMeta> {
  const existing = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!existing) {
    throw new Error(`Document not found: ${documentId}`);
  }

  if (existing.archived) {
    throw new Error("Cannot update an archived document. Restore it first.");
  }

  const data: Record<string, unknown> = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.content !== undefined) data.content = updates.content;
  if (updates.emoji !== undefined) data.emoji = updates.emoji;
  if (updates.coverImage !== undefined) data.coverImage = updates.coverImage;
  if (updates.projectId !== undefined) data.projectId = updates.projectId;
  if (updates.parentId !== undefined) data.parentId = updates.parentId;
  if (updates.status !== undefined) data.status = updates.status;
  if (updates.visibility !== undefined) data.visibility = updates.visibility;
  if (updates.tags !== undefined) data.tags = updates.tags;
  if (updates.isTemplate !== undefined) data.isTemplate = updates.isTemplate;
  if (updates.isPinned !== undefined) data.isPinned = updates.isPinned;
  if (updates.archived !== undefined) data.archived = updates.archived;
  if (userId) data.lastEditedById = userId;

  const doc = await prisma.document.update({
    where: { id: documentId },
    data,
    include: {
      user: { select: { id: true, name: true, imageUrl: true } },
      lastEditedBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  const result: DocumentWithMeta = {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    emoji: doc.emoji,
    coverImage: doc.coverImage,
    projectId: doc.projectId,
    parentId: doc.parentId,
    status: doc.status,
    visibility: doc.visibility,
    tags: doc.tags,
    isTemplate: doc.isTemplate,
    views: doc.views,
    isPinned: doc.isPinned,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    author: doc.user,
    commentCount: doc._count.comments,
    wordCount: countWords(doc.content),
    lastEditedBy: doc.lastEditedBy,
  };

  await invalidateDocCaches(doc.id, doc.workspaceId);
  return result;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { archived: true, status: "ARCHIVED" },
  });

  await invalidateDocCaches(documentId, doc.workspaceId);
  logger.info(`Document soft-deleted (archived): ${documentId}`);
}

export async function getDocument(
  documentId: string,
): Promise<DocumentWithMeta> {
  const cacheKey_ = cacheKey("doc", documentId);
  const cached = await cacheGet<DocumentWithMeta>(cacheKey_);
  if (cached) return cached;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      user: { select: { id: true, name: true, imageUrl: true } },
      lastEditedBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }

  const result: DocumentWithMeta = {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    emoji: doc.emoji,
    coverImage: doc.coverImage,
    projectId: doc.projectId,
    parentId: doc.parentId,
    status: doc.status,
    visibility: doc.visibility,
    tags: doc.tags,
    isTemplate: doc.isTemplate,
    views: doc.views,
    isPinned: doc.isPinned,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    author: doc.user,
    commentCount: doc._count.comments,
    wordCount: countWords(doc.content),
    lastEditedBy: doc.lastEditedBy,
  };

  await cacheSet(cacheKey_, result, DOC_CACHE_TTL);
  return result;
}

export async function getDocumentTree(
  workspaceId: string,
  projectId?: string,
): Promise<DocumentWithMeta[]> {
  const cacheKey_ = projectId
    ? cacheKey("doc-tree", workspaceId, projectId)
    : cacheKey("doc-tree", workspaceId);

  const cached = await cacheGet<DocumentWithMeta[]>(cacheKey_);
  if (cached) return cached;

  const where: Record<string, unknown> = {
    workspaceId,
    archived: false,
    parentId: null,
  };
  if (projectId) where.projectId = projectId;

  const rootDocs = await prisma.document.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, imageUrl: true } },
      lastEditedBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
      children: {
        where: { archived: false },
        orderBy: { title: "asc" },
        include: {
          user: { select: { id: true, name: true, imageUrl: true } },
          lastEditedBy: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
          children: {
            where: { archived: false },
            orderBy: { title: "asc" },
            include: {
              user: { select: { id: true, name: true, imageUrl: true } },
              lastEditedBy: { select: { id: true, name: true } },
              _count: { select: { comments: true } },
            },
          },
        },
      },
    },
    orderBy: [{ isPinned: "desc" }, { title: "asc" }],
  });

  function toMeta(
    d: typeof rootDocs[number] | typeof rootDocs[number]["children"][number] | typeof rootDocs[number]["children"][number]["children"][number],
  ): DocumentWithMeta {
    const children = "children" in d ? (d as { children: typeof d[] }).children : undefined;
    return {
      id: d.id,
      title: d.title,
      content: d.content,
      emoji: d.emoji,
      coverImage: d.coverImage,
      projectId: d.projectId,
      parentId: d.parentId,
      status: d.status,
      visibility: d.visibility,
      tags: d.tags,
      isTemplate: d.isTemplate,
      views: d.views,
      isPinned: d.isPinned,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      author: d.user,
      commentCount: d._count.comments,
      wordCount: countWords(d.content),
      lastEditedBy: d.lastEditedBy,
      children: children?.map(toMeta),
    };
  }

  const tree = rootDocs.map(toMeta);
  await cacheSet(cacheKey_, tree, TREE_CACHE_TTL);
  return tree;
}

export async function searchDocuments(
  workspaceId: string,
  query: string,
): Promise<DocumentSearchResult[]> {
  if (!query.trim()) return [];

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) return [];

  const regexTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const titleRegex = regexTerms.join("|");
  const contentRegex = regexTerms.join("|");

  const docs = await prisma.document.findMany({
    where: {
      workspaceId,
      archived: false,
      OR: [
        { title: { contains: titleRegex, mode: "insensitive" } },
        { content: { contains: contentRegex, mode: "insensitive" } },
      ],
    },
    include: {
      user: { select: { id: true, name: true, imageUrl: true } },
      lastEditedBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    take: 50,
  });

  const queryLower = query.toLowerCase();

  const results: DocumentSearchResult[] = docs
    .map((doc) => {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = (doc.content ?? "").toLowerCase();

      for (const term of terms) {
        if (titleLower.includes(term)) score += 10;
        if (contentLower.includes(term)) score += 1;
      }

      const titleExact = titleLower === queryLower;
      if (titleExact) score += 50;

      const titleStarts = titleLower.startsWith(queryLower);
      if (titleStarts) score += 20;

      if (doc.isPinned) score += 5;
      score += Math.min(doc.views / 10, 10);

      const content = doc.content ?? "";
      const matchedContent = content.toLowerCase().includes(queryLower)
        ? extractSnippets(content, query)
        : doc.title;

      const meta: DocumentWithMeta = {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        emoji: doc.emoji,
        coverImage: doc.coverImage,
        projectId: doc.projectId,
        parentId: doc.parentId,
        status: doc.status,
        visibility: doc.visibility,
        tags: doc.tags,
        isTemplate: doc.isTemplate,
        views: doc.views,
        isPinned: doc.isPinned,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        author: doc.user,
        commentCount: doc._count.comments,
        wordCount: countWords(doc.content),
        lastEditedBy: doc.lastEditedBy,
      };

      return { document: meta, score, matchedContent };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return results;
}

// ── Wiki Links ──────────────────────────────────────────────────────

const WIKI_LINK_PATTERN = /\[\[([^\]]+)\]\]/g;

export function parseWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match: RegExpExecArray | null;

  while ((match = WIKI_LINK_PATTERN.exec(content)) !== null) {
    links.push({
      sourceDocumentId: "",
      targetDocumentId: "",
      targetTitle: match[1].trim(),
      position: match.index,
    });
  }

  return links;
}

export async function resolveWikiLinks(
  content: string,
  workspaceId: string,
): Promise<{ content: string; unresolved: string[] }> {
  const wikiLinks = parseWikiLinks(content);
  if (wikiLinks.length === 0) return { content, unresolved: [] };

  const uniqueTitles = Array.from(
    new Set(wikiLinks.map((l) => l.targetTitle)),
  );

  const resolved = await prisma.document.findMany({
    where: {
      workspaceId,
      archived: false,
      title: { in: uniqueTitles, mode: "insensitive" },
    },
    select: { id: true, title: true },
  });

  const titleToDoc = new Map<string, { id: string; title: string }>(
    resolved.map((d) => [d.title.toLowerCase(), d]),
  );

  const unresolved: string[] = [];
  let resolvedContent = content;

  for (const link of wikiLinks) {
    const doc = titleToDoc.get(link.targetTitle.toLowerCase());
    if (doc) {
      const linkHtml = `<a href="/doc/${doc.id}" data-doc-id="${doc.id}" class="wiki-link">${link.targetTitle}</a>`;
      const original = `[[${link.targetTitle}]]`;
      resolvedContent = resolvedContent.replace(original, linkHtml);
    } else {
      unresolved.push(link.targetTitle);
      const broken = `[[${link.targetTitle}]]`;
      resolvedContent = resolvedContent.replace(
        broken,
        `<span class="wiki-link wiki-link--broken" title="Document not found">${link.targetTitle}</span>`,
      );
    }
  }

  return { content: resolvedContent, unresolved };
}

// ── Versions ────────────────────────────────────────────────────────

export async function createVersion(
  documentId: string,
): Promise<DocumentVersion> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, title: true, content: true, lastEditedById: true },
  });

  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }

  const version = await prisma.documentVersion.create({
    data: {
      documentId,
      content: doc.content ?? "",
      title: doc.title,
      editedBy: doc.lastEditedById ?? "unknown",
    },
  });

  logger.info(`Version created for document ${documentId}: ${version.id}`);
  return version;
}

export async function getVersions(
  documentId: string,
): Promise<DocumentVersion[]> {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { editedAt: "desc" },
  });

  return versions;
}

export async function restoreVersion(
  documentId: string,
  versionId: string,
): Promise<DocumentWithMeta> {
  const version = await prisma.documentVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.documentId !== documentId) {
    throw new Error(`Version ${versionId} not found for document ${documentId}`);
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      title: version.title,
      content: version.content,
      lastEditedById: version.editedBy,
    },
    include: {
      user: { select: { id: true, name: true, imageUrl: true } },
      lastEditedBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  await invalidateDocCaches(documentId, updated.workspaceId);
  logger.info(`Document ${documentId} restored to version ${versionId}`);

  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    emoji: updated.emoji,
    coverImage: updated.coverImage,
    projectId: updated.projectId,
    parentId: updated.parentId,
    status: updated.status,
    visibility: updated.visibility,
    tags: updated.tags,
    isTemplate: updated.isTemplate,
    views: updated.views,
    isPinned: updated.isPinned,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    author: updated.user,
    commentCount: updated._count.comments,
    wordCount: countWords(updated.content),
    lastEditedBy: updated.lastEditedBy,
  };
}

// ── Duplicate ───────────────────────────────────────────────────────

export async function duplicateDocument(
  documentId: string,
  newTitle?: string,
): Promise<DocumentWithMeta> {
  const source = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!source) {
    throw new Error(`Document not found: ${documentId}`);
  }

  const title = newTitle ?? `${source.title} (Copy)`;

  const doc = await prisma.document.create({
    data: {
      title,
      content: source.content,
      emoji: source.emoji,
      coverImage: source.coverImage,
      workspaceId: source.workspaceId,
      userId: source.userId,
      projectId: source.projectId,
      parentId: source.parentId,
      status: "DRAFT",
      visibility: source.visibility,
      tags: [...source.tags],
      isTemplate: source.isTemplate,
      isPinned: false,
      views: 0,
    },
    include: {
      user: { select: { id: true, name: true, imageUrl: true } },
      lastEditedBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  await invalidateDocCaches(doc.id, doc.workspaceId);
  logger.info(`Document duplicated: ${documentId} -> ${doc.id}`);

  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    emoji: doc.emoji,
    coverImage: doc.coverImage,
    projectId: doc.projectId,
    parentId: doc.parentId,
    status: doc.status,
    visibility: doc.visibility,
    tags: doc.tags,
    isTemplate: doc.isTemplate,
    views: doc.views,
    isPinned: doc.isPinned,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    author: doc.user,
    commentCount: doc._count.comments,
    wordCount: countWords(doc.content),
    lastEditedBy: doc.lastEditedBy,
  };
}

// ── Stats ───────────────────────────────────────────────────────────

export async function getDocumentStats(
  workspaceId: string,
): Promise<DocumentStats> {
  const cacheKey_ = cacheKey("doc-stats", workspaceId);
  const cached = await cacheGet<DocumentStats>(cacheKey_);
  if (cached) return cached;

  const [total, byStatus, byProject, allDocs] = await Promise.all([
    prisma.document.count({
      where: { workspaceId, archived: false },
    }),
    prisma.document.groupBy({
      by: ["status"],
      where: { workspaceId, archived: false },
      _count: { id: true },
    }),
    prisma.document.groupBy({
      by: ["projectId"],
      where: { workspaceId, archived: false },
      _count: { id: true },
    }),
    prisma.document.findMany({
      where: { workspaceId, archived: false },
      select: { views: true, content: true },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of byStatus) {
    statusMap[row.status] = row._count.id;
  }

  const projectIds = byProject.map((r) => r.projectId).filter((id): id is string => id !== null);

  let projectNames: Map<string, string> = new Map();
  if (projectIds.length > 0) {
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });
    projectNames = new Map(projects.map((p) => [p.id, p.name]));
  }

  const projectBreakdown = byProject.map((row) => ({
    projectId: row.projectId,
    projectName: row.projectId ? (projectNames.get(row.projectId) ?? null) : null,
    count: row._count.id,
  }));

  const totalViews = allDocs.reduce((sum, d) => sum + d.views, 0);
  const totalWords = allDocs.reduce((sum, d) => sum + countWords(d.content), 0);

  const stats: DocumentStats = {
    total,
    byStatus: statusMap,
    byProject: projectBreakdown,
    totalViews,
    totalWords,
  };

  await cacheSet(cacheKey_, stats, STATS_CACHE_TTL);
  return stats;
}

// ── Templates ───────────────────────────────────────────────────────

const DOCUMENT_TEMPLATES: Record<string, { title: string; content: string; emoji: string }> = {
  PRD: {
    title: "Product Requirements Document",
    emoji: "📋",
    content: `<h1>Product Requirements Document</h1>
<h2>1. Overview</h2>
<p><em>Describe the product or feature in 1-2 sentences.</em></p>
<h2>2. Problem Statement</h2>
<p><em>What problem are we solving? Who is affected?</em></p>
<h2>3. Goals &amp; Success Metrics</h2>
<ul>
  <li>Goal 1: <em>...</em></li>
  <li>Goal 2: <em>...</em></li>
</ul>
<h2>4. User Stories</h2>
<table><thead><tr><th>As a...</th><th>I want to...</th><th>So that...</th></tr></thead><tbody>
<tr><td><em>user type</em></td><td><em>action</em></td><td><em>benefit</em></td></tr>
</tbody></table>
<h2>5. Requirements</h2>
<h3>5.1 Functional Requirements</h3>
<ul><li><em>Requirement 1</em></li></ul>
<h3>5.2 Non-Functional Requirements</h3>
<ul><li><em>Performance, security, scalability</em></li></ul>
<h2>6. Design &amp; UX</h2>
<p><em>Link to mockups or describe UX flow.</em></p>
<h2>7. Out of Scope</h2>
<ul><li><em>What we are explicitly NOT building</em></li></ul>
<h2>8. Timeline &amp; Milestones</h2>
<table><thead><tr><th>Milestone</th><th>Date</th><th>Owner</th></tr></thead><tbody>
<tr><td><em>Alpha</em></td><td><em>TBD</em></td><td><em>TBD</em></td></tr>
</tbody></table>
<h2>9. Open Questions</h2>
<ul><li><em>Question 1?</em></li></ul>`,
  },

  "Technical Spec": {
    title: "Technical Specification",
    emoji: "🔧",
    content: `<h1>Technical Specification</h1>
<h2>1. Summary</h2>
<p><em>Brief technical overview of the proposed solution.</em></p>
<h2>2. Context</h2>
<p><em>Background information, constraints, and relevant existing systems.</em></p>
<h2>3. Goals / Non-Goals</h2>
<h3>Goals</h3>
<ul><li><em>Goal 1</em></li></ul>
<h3>Non-Goals</h3>
<ul><li><em>Non-goal 1</em></li></ul>
<h2>4. Architecture</h2>
<p><em>High-level architecture diagram or description.</em></p>
<h2>5. Data Model</h2>
<table><thead><tr><th>Entity</th><th>Fields</th><th>Type</th></tr></thead><tbody>
<tr><td><em>Entity</em></td><td><em>field</em></td><td><em>type</em></td></tr>
</tbody></table>
<h2>6. API Design</h2>
<pre><code>GET /api/v1/resource
POST /api/v1/resource</code></pre>
<h2>7. Implementation Plan</h2>
<ol><li><em>Step 1</em></li><li><em>Step 2</em></li></ol>
<h2>8. Testing Strategy</h2>
<ul><li><em>Unit tests, integration tests, e2e</em></li></ul>
<h2>9. Rollout &amp; Monitoring</h2>
<p><em>Feature flags, canary deployment, dashboards.</em></p>
<h2>10. Risks &amp; Mitigations</h2>
<table><thead><tr><th>Risk</th><th>Mitigation</th></tr></thead><tbody>
<tr><td><em>Risk</em></td><td><em>Mitigation</em></td></tr>
</tbody></table>`,
  },

  "Meeting Notes": {
    title: "Meeting Notes",
    emoji: "📝",
    content: `<h1>Meeting Notes</h1>
<p><strong>Date:</strong> <em>${new Date().toLocaleDateString()}</em></p>
<p><strong>Attendees:</strong> <em>@name, @name</em></p>
<p><strong>Facilitator:</strong> <em>@name</em></p>
<p><strong>Note-taker:</strong> <em>@name</em></p>
<hr>
<h2>Agenda</h2>
<ol><li><em>Topic 1</em></li><li><em>Topic 2</em></li><li><em>Topic 3</em></li></ol>
<h2>Discussion Notes</h2>
<h3>Topic 1</h3>
<p><em>Key points discussed</em></p>
<h3>Topic 2</h3>
<p><em>Key points discussed</em></p>
<h2>Decisions Made</h2>
<ul><li><em>Decision 1 — rationale</em></li></ul>
<h2>Action Items</h2>
<table><thead><tr><th>Action</th><th>Owner</th><th>Due Date</th></tr></thead><tbody>
<tr><td><em>Task</em></td><td><em>@person</em></td><td><em>date</em></td></tr>
</tbody></table>
<h2>Parking Lot</h2>
<ul><li><em>Items deferred to future discussion</em></li></ul>`,
  },

  "Project Brief": {
    title: "Project Brief",
    emoji: "🚀",
    content: `<h1>Project Brief</h1>
<h2>1. Project Name</h2>
<p><em>Name</em></p>
<h2>2. Executive Summary</h2>
<p><em>2-3 sentence overview of the project.</em></p>
<h2>3. Objectives</h2>
<ul><li><em>Objective 1</em></li><li><em>Objective 2</em></li></ul>
<h2>4. Stakeholders</h2>
<table><thead><tr><th>Role</th><th>Name</th><th>Responsibility</th></tr></thead><tbody>
<tr><td>Sponsor</td><td><em>Name</em></td><td><em>Approval &amp; funding</em></td></tr>
<tr><td>Lead</td><td><em>Name</em></td><td><em>Execution</em></td></tr>
</tbody></table>
<h2>5. Scope</h2>
<h3>In Scope</h3>
<ul><li><em>Deliverable 1</em></li></ul>
<h3>Out of Scope</h3>
<ul><li><em>Explicit exclusion</em></li></ul>
<h2>6. Budget &amp; Resources</h2>
<p><em>Estimated budget, team allocation.</em></p>
<h2>7. Timeline</h2>
<table><thead><tr><th>Phase</th><th>Start</th><th>End</th></tr></thead><tbody>
<tr><td>Discovery</td><td><em>TBD</em></td><td><em>TBD</em></td></tr>
<tr><td>Build</td><td><em>TBD</em></td><td><em>TBD</em></td></tr>
<tr><td>Launch</td><td><em>TBD</em></td><td><em>TBD</em></td></tr>
</tbody></table>
<h2>8. Risks</h2>
<ul><li><em>Risk and mitigation</em></li></ul>`,
  },

  "API Documentation": {
    title: "API Documentation",
    emoji: "📡",
    content: `<h1>API Documentation</h1>
<h2>Base URL</h2>
<pre><code>https://api.example.com/v1</code></pre>
<h2>Authentication</h2>
<p>All requests require a Bearer token:</p>
<pre><code>Authorization: Bearer &lt;token&gt;</code></pre>
<h2>Endpoints</h2>
<h3>GET /resource</h3>
<p><strong>Description:</strong> List all resources.</p>
<p><strong>Query Parameters:</strong></p>
<table><thead><tr><th>Param</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>
<tr><td>page</td><td>integer</td><td>No</td><td>Page number (default: 1)</td></tr>
<tr><td>limit</td><td>integer</td><td>No</td><td>Results per page (default: 20)</td></tr>
</tbody></table>
<p><strong>Response:</strong></p>
<pre><code>{
  "data": [],
  "meta": { "total": 0, "page": 1 }
}</code></pre>
<h3>POST /resource</h3>
<p><strong>Description:</strong> Create a new resource.</p>
<p><strong>Body:</strong></p>
<pre><code>{
  "name": "string",
  "description": "string"
}</code></pre>
<p><strong>Response:</strong> <code>201 Created</code></p>
<h3>PUT /resource/:id</h3>
<p><strong>Description:</strong> Update a resource.</p>
<h3>DELETE /resource/:id</h3>
<p><strong>Description:</strong> Delete a resource.</p>
<h2>Error Codes</h2>
<table><thead><tr><th>Code</th><th>Description</th></tr></thead><tbody>
<tr><td>400</td><td>Bad Request</td></tr>
<tr><td>401</td><td>Unauthorized</td></tr>
<tr><td>404</td><td>Not Found</td></tr>
<tr><td>500</td><td>Internal Server Error</td></tr>
</tbody></table>`,
  },

  Runbook: {
    title: "Runbook",
    emoji: "📖",
    content: `<h1>Runbook</h1>
<h2>Service Overview</h2>
<p><strong>Service:</strong> <em>service-name</em></p>
<p><strong>Owner:</strong> <em>team or individual</em></p>
<p><strong>On-call channel:</strong> <em>Slack channel</em></p>
<p><strong>Dashboard:</strong> <em>Grafana/Datadog link</em></p>
<h2>Common Alerts</h2>
<h3>Alert: High Error Rate</h3>
<p><strong>Symptom:</strong> Error rate &gt; 5% in the last 15 minutes.</p>
<p><strong>Cause:</strong> <em>Possible causes</em></p>
<p><strong>Resolution:</strong></p>
<ol><li>Check recent deployments</li><li>Review error logs</li><li>Rollback if needed</li></ol>
<h3>Alert: High Latency</h3>
<p><strong>Symptom:</strong> p99 latency &gt; 2s.</p>
<p><strong>Resolution:</strong></p>
<ol><li>Check database queries</li><li>Check external service calls</li></ol>
<h2>Scaling Procedures</h2>
<p><em>How to scale up/down the service.</em></p>
<h2>Database Maintenance</h2>
<p><em>Backup, restore, migration steps.</em></p>
<h2>Incident Response Checklist</h2>
<ol><li>Acknowledge alert</li><li>Assess severity</li><li>Notify stakeholders</li><li>Investigate &amp; mitigate</li><li>Post-mortem</li></ol>
<h2>Useful Commands</h2>
<pre><code># Check service status
kubectl get pods -l app=service-name

# View logs
kubectl logs -l app=service-name --tail=100

# Restart deployment
kubectl rollout restart deployment/service-name</code></pre>`,
  },
};

export async function generateDocumentTemplate(
  type: string,
  workspaceId: string,
  userId: string,
): Promise<DocumentWithMeta> {
  const templateKey = Object.keys(DOCUMENT_TEMPLATES).find(
    (k) => k.toLowerCase() === type.toLowerCase(),
  );

  if (!templateKey) {
    const available = Object.keys(DOCUMENT_TEMPLATES).join(", ");
    throw new Error(`Unknown template type "${type}". Available: ${available}`);
  }

  const template = DOCUMENT_TEMPLATES[templateKey];

  return createDocument({
    title: template.title,
    content: template.content,
    emoji: template.emoji,
    workspaceId,
    userId,
    isTemplate: false,
  });
}
