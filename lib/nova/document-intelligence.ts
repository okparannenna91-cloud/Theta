import { prisma } from "../prisma";
import { logger } from "../logger";

export type DocumentType = "PRD" | "TECHNICAL_SPEC" | "MEETING_NOTES" | "SOP" | "KNOWLEDGE_ARTICLE" | "PROJECT_BRIEF" | "RETROSPECTIVE" | "RESEARCH_REPORT" | "GENERAL";

export const DOCUMENT_TYPES = [
  { type: "PRD", description: "Product Requirements Document" },
  { type: "TECHNICAL_SPEC", description: "Technical Specification" },
  { type: "MEETING_NOTES", description: "Meeting Notes" },
  { type: "SOP", description: "Standard Operating Procedures" },
  { type: "KNOWLEDGE_ARTICLE", description: "Knowledge Base Article" },
  { type: "PROJECT_BRIEF", description: "Project Brief" },
  { type: "RETROSPECTIVE", description: "Sprint Retrospective" },
  { type: "RESEARCH_REPORT", description: "Research Report" },
  { type: "GENERAL", description: "General document" },
];

export const DOCUMENT_UNDERSTANDING_PIPELINE = [
  "Identify document type", "Understand purpose", "Extract key information",
  "Identify actionable content", "Connect to workspace entities",
];

export const DOCUMENT_ACTIONS = [
  { name: "Summarize", description: "Generate a concise summary" },
  { name: "Rewrite", description: "Improve clarity and structure" },
  { name: "Convert to Tasks", description: "Extract actionable items as tasks" },
  { name: "Extract Decisions", description: "Identify all decisions made" },
];

export const DOCUMENT_WORKSPACE_LINK_TYPES = [
  "Projects", "Tasks", "Sprints", "Goals", "Dashboards",
];

const GENERATION_MODEL = "openrouter/google/gemini-2.0-flash-001";

interface DocumentSummary {
  summary: string;
  keyPoints: string[];
  actionItems: { title: string; assignee?: string; priority?: string; dueDate?: string }[];
  decisions: string[];
  risks: string[];
  relatedDocumentIds: string[];
  linkedTaskTitles: string[];
  linkedProjectIds: string[];
}

interface SearchResult {
  documentId: string;
  title: string;
  relevance: number;
  snippet: string;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    });
    return response.data[0].embedding;
  } catch (error) {
    logger.warn("[DocumentIntelligence] Embedding generation failed:", error);
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function parseJsonFromLLM(text: string): unknown {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in LLM response");
  const raw = jsonMatch[1] ?? jsonMatch[0];
  return JSON.parse(raw.trim());
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export class DocumentIntelligence {
  static async onDocumentCreated(documentId: string): Promise<void> {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc?.content) return;

    const plainText = stripHtml(doc.content);
    if (plainText.length < 20) return;

    const embedding = await generateEmbedding(plainText);
    if (!embedding) return;

    await prisma.$runCommandRaw({
      update: "documents",
      updates: [{ q: { _id: { $oid: documentId } }, u: { $set: { embedding: JSON.stringify(embedding) } } }],
    });

    logger.info(`[DocumentIntelligence] Embedding generated for document ${documentId}`);
  }

  static async searchDocuments(workspaceId: string, query: string, limit = 5): Promise<SearchResult[]> {
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) return [];

    const response = await prisma.$runCommandRaw({
      find: "documents",
      filter: { workspaceId: { $oid: workspaceId }, status: "PUBLISHED", embedding: { $exists: true } },
      projection: { _id: 1, title: 1, content: 1, embedding: 1 },
    }) as { cursor?: { firstBatch?: Array<{ _id: { $oid: string }; title: string; content?: string; embedding?: string }> } };

    const docs = response.cursor?.firstBatch ?? [];
    const results: SearchResult[] = [];

    for (const doc of docs) {
      if (!doc.embedding) continue;
      const docEmbedding: number[] = JSON.parse(doc.embedding);
      const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
      if (similarity < 0.5) continue;

      const plainText = doc.content ? stripHtml(doc.content) : "";
      const snippet = plainText.slice(0, 200);

      results.push({
        documentId: (doc._id as { $oid: string }).$oid,
        title: doc.title,
        relevance: similarity,
        snippet,
      });
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }

  static async generateDocumentSummary(documentId: string): Promise<DocumentSummary | null> {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc?.content) return null;

    const plainText = stripHtml(doc.content);

    const relevantDocs = await this.searchDocuments(doc.workspaceId, plainText, 3);

    const relatedContext = relevantDocs
      .filter((d) => d.documentId !== documentId)
      .map((d) => `- "${d.title}": ${d.snippet}`)
      .join("\n");

    const existingTasks = await prisma.task.findMany({
      where: { workspaceId: doc.workspaceId },
      select: { id: true, title: true },
      take: 20,
    });

    const existingProjects = await prisma.project.findMany({
      where: { workspaceId: doc.workspaceId },
      select: { id: true, name: true },
    });

    const taskList = existingTasks.map((t) => `- [${t.id}] ${t.title}`).join("\n");
    const projectList = existingProjects.map((p) => `- [${p.id}] ${p.name}`).join("\n");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GENERATION_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a document analysis engine. Analyze the document and return a JSON object with these fields:
- summary: 2-3 sentence summary
- keyPoints: array of key points (max 10)
- actionItems: array of objects { title, assignee?, priority?: "low"|"medium"|"high", dueDate? }
- decisions: array of decisions made
- risks: array of risks or concerns
- linkedTaskTitles: array of existing task titles from the provided list that are relevant
- linkedProjectIds: array of project IDs from the provided list that are relevant

Return ONLY valid JSON. Do not add commentary.`,
          },
          {
            role: "user",
            content: `Document title: ${doc.title}
Tags: ${doc.tags.join(", ")}

Content:
${plainText.slice(0, 6000)}

Related documents in workspace:
${relatedContext || "None"}

Existing tasks (match relevant ones):
${taskList || "None"}

Existing projects (match relevant ones):
${projectList || "None"}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      logger.warn(`[DocumentIntelligence] LLM call failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    try {
      const parsed = parseJsonFromLLM(raw) as Omit<DocumentSummary, "relatedDocumentIds">;
      return {
        ...parsed,
        relatedDocumentIds: relevantDocs.filter((d) => d.documentId !== documentId).map((d) => d.documentId),
      };
    } catch (error) {
      logger.warn("[DocumentIntelligence] Failed to parse LLM response:", error);
      return null;
    }
  }

  static classifyDocumentType(title: string, content: string): DocumentType {
    const combinedText = `${title} ${content}`.toLowerCase();

    if (combinedText.includes("prd") || combinedText.includes("requirements") || combinedText.includes("product requirement")) return "PRD";
    if (combinedText.includes("technical spec") || combinedText.includes("architecture") || combinedText.includes("design specification")) return "TECHNICAL_SPEC";
    if (combinedText.includes("meeting notes") || combinedText.includes("sync notes") || combinedText.includes("minutes")) return "MEETING_NOTES";
    if (combinedText.includes("sop") || combinedText.includes("standard operating") || combinedText.includes("procedure")) return "SOP";
    if (combinedText.includes("retro") || combinedText.includes("post-mortem") || combinedText.includes("lessons learned")) return "RETROSPECTIVE";

    return "GENERAL";
  }

  static async createTasksFromDocument(documentId: string, userId: string): Promise<string[]> {
    const summary = await this.generateDocumentSummary(documentId);
    if (!summary?.actionItems.length) return [];

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return [];

    const createdTaskIds: string[] = [];

    for (const item of summary.actionItems) {
      let assigneeId = userId;
      if (item.assignee) {
        const member = await prisma.teamMember.findFirst({
          where: {
            team: { workspaceId: doc.workspaceId },
            user: { name: { contains: item.assignee, mode: "insensitive" } },
          },
          select: { userId: true },
        });
        if (member) assigneeId = member.userId;
      }

      const task = await prisma.task.create({
        data: {
          title: item.title,
          description: `Auto-created from document: ${doc.title}`,
          status: "todo",
          priority: (item.priority as "low" | "medium" | "high") ?? "medium",
          workspaceId: doc.workspaceId,
          projectId: doc.projectId ?? "",
          userId: assigneeId,
          assigneeIds: [assigneeId],
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        },
      });

      createdTaskIds.push(task.id);
    }

    return createdTaskIds;
  }

  static async analyze(title: string, content: string): Promise<DocumentSummary> {
    const plainText = stripHtml(content);
    return {
      summary: plainText.slice(0, 300),
      keyPoints: [],
      actionItems: [],
      decisions: [],
      risks: [],
      relatedDocumentIds: [],
      linkedTaskTitles: [],
      linkedProjectIds: [],
    };
  }
}
