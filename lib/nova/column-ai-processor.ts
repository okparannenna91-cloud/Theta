import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { executeWithProvider } from "@/lib/langraph/model-router";

type AIColumnType =
  | "aiSummary"
  | "aiText"
  | "aiSentiment"
  | "aiLabel"
  | "aiExtraction"
  | "aiPrioritization"
  | "aiWriting"
  | "aiTranslation";

interface ColumnAIRequest {
  columnType: AIColumnType;
  taskTitle: string;
  taskDescription?: string;
  columnSettings?: Record<string, any>;
  workspaceId: string;
  sourceColumnValues?: Record<string, any>;
}

const SYSTEM_PROMPTS: Record<AIColumnType, (settings?: Record<string, any>) => string> = {
  aiSummary: () =>
    "You are a concise summarizer. Given a task title and description, produce a 1-2 sentence summary. Be factual and brief. Return only the summary text, no labels.",

  aiText: () =>
    "You are a helpful writing assistant. Given a task title and description, generate a clear, professional written response based on the instructions in column settings. Return only the generated text.",

  aiSentiment: () =>
    "Analyze the sentiment of the given task content. Respond with exactly one word: positive, negative, or neutral. No explanation.",

  aiLabel: (settings) =>
    `You are a categorization engine. Given task content, assign a short label (2-4 words max).${settings?.allowedLabels ? ` Allowed labels: ${settings.allowedLabels.join(", ")}.` : ""} Return only the label text.`,

  aiExtraction: (settings) =>
    `You extract structured data from text. Given task content, extract the requested information.${settings?.extractFields ? ` Fields to extract: ${settings.extractFields.join(", ")}.` : ""} Return results as JSON with key-value pairs.`,

  aiPrioritization: () =>
    "You are a project prioritizer. Given task title and description, suggest a priority level and a one-line rationale. Format: 'HIGH | rationale' or 'MEDIUM | rationale' or 'LOW | rationale'.",

  aiWriting: (settings) =>
    `You are a professional writer. Given a task title and description, produce written content.${settings?.tone ? ` Use a ${settings.tone} tone.` : ""}${settings?.maxWords ? ` Keep it under ${settings.maxWords} words.` : ""} Return only the content text.`,

  aiTranslation: (settings) =>
    `You are a professional translator. Translate the given task content to ${settings?.targetLanguage || "Spanish"}. Return only the translated text.`,
};

export async function processAIColumn(request: ColumnAIRequest): Promise<string> {
  const { columnType, taskTitle, taskDescription, columnSettings, workspaceId, sourceColumnValues } = request;

  const systemPromptFn = SYSTEM_PROMPTS[columnType];
  if (!systemPromptFn) {
    throw new Error(`Unknown AI column type: ${columnType}`);
  }

  const contentParts: string[] = [];
  if (taskTitle) contentParts.push(`Title: ${taskTitle}`);
  if (taskDescription) contentParts.push(`Description: ${taskDescription}`);
  if (sourceColumnValues && Object.keys(sourceColumnValues).length > 0) {
    contentParts.push(`Additional data: ${JSON.stringify(sourceColumnValues)}`);
  }
  if (columnSettings?.prompt) {
    contentParts.push(`Instructions: ${columnSettings.prompt}`);
  }

  const userMessage = contentParts.join("\n");

  try {
    const result = (await executeWithProvider(
      "openai",
      "gpt-4o-mini",
      systemPromptFn(columnSettings),
      userMessage,
    )).trim();

    logger.info(`[ColumnAI] ${columnType} processed for task in workspace ${workspaceId}`);
    return result;
  } catch (error: any) {
    logger.error(`[ColumnAI] ${columnType} failed: ${error.message}`);
    throw new Error(`AI column processing failed: ${error.message}`);
  }
}

export async function processAIColumnBatch(
  requests: ColumnAIRequest[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  const batches = requests.reduce<ColumnAIRequest[][]>((acc, req, i) => {
    const batchIndex = Math.floor(i / 5);
    if (!acc[batchIndex]) acc[batchIndex] = [];
    acc[batchIndex].push(req);
    return acc;
  }, []);

  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map(async (req) => {
        const result = await processAIColumn(req);
        return { key: `${req.columnType}:${req.taskTitle}`, result };
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.set(r.value.key, r.value.result);
      }
    }
  }

  return results;
}

export async function autoPopulateAIColumns(taskId: string, workspaceId: string): Promise<Record<string, string>> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { board: { include: { columns: true } } },
  }) as any;

  if (!task) throw new Error(`Task ${taskId} not found`);

  const aiColumns = (task.board?.columns ?? []).filter((col: any) =>
    col.columnType?.startsWith("ai") && col.columnType !== "aiSentiment"
  );

  if (aiColumns.length === 0) return {};

  const results: Record<string, string> = {};

  for (const col of aiColumns) {
    try {
      const result = await processAIColumn({
        columnType: col.columnType as AIColumnType,
        taskTitle: task.title,
        taskDescription: task.description ?? undefined,
        columnSettings: col.settings ?? undefined,
        workspaceId,
        sourceColumnValues: typeof task.fieldValues === "object" && task.fieldValues !== null ? task.fieldValues as Record<string, any> : undefined,
      });

      results[col.id] = result;
    } catch (error: any) {
      logger.warn(`[ColumnAI] Failed for column ${col.id}: ${error.message}`);
    }
  }

  if (Object.keys(results).length > 0) {
    const currentValues = typeof task.fieldValues === "object" && task.fieldValues !== null ? task.fieldValues as Record<string, any> : {};
    const updatedFieldValues = { ...currentValues, ...results };
    await prisma.task.update({
      where: { id: taskId },
      data: { fieldValues: updatedFieldValues as any },
    });
  }

  return results;
}
