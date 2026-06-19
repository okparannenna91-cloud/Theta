const AI_TIMEOUT_MS = 55000;

export interface AiCallOptions {
  prompt: string;
  workspaceId?: string;
  conversationId?: string;
  projectId?: string;
}

export interface AiCallResult {
  text: string;
  stream: ReadableStream<Uint8Array> | null;
}

export class AiCallError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AiCallError";
    this.status = status;
  }
}

function isRateLimitError(status: number, body: any): boolean {
  return status === 429 || (status === 403 && body?.error?.includes("limit"));
}

function isPlanLimitError(status: number, body: any): boolean {
  return status === 403 && (body?.error?.includes("plan") || body?.error?.includes("upgrade"));
}

export async function callAi(options: AiCallOptions): Promise<AiCallResult> {
  const { prompt, workspaceId, conversationId, projectId } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("Request timeout"), AI_TIMEOUT_MS);

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        workspaceId,
        conversationId,
        projectId,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (isRateLimitError(res.status, body)) {
        throw new AiCallError("Rate limit reached. Please wait a moment before trying again.", res.status);
      }
      if (isPlanLimitError(res.status, body)) {
        throw new AiCallError("Request limit reached for your plan. Please upgrade to continue.", res.status);
      }
      throw new AiCallError(body.error || `Request failed with status ${res.status}`, res.status);
    }

    return { text: "", stream: res.body };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function* streamAiText(options: AiCallOptions): AsyncGenerator<string> {
  const { stream } = await callAi(options);
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export async function generateAiText(options: AiCallOptions): Promise<string> {
  let result = "";
  try {
    for await (const chunk of streamAiText(options)) {
      result += chunk;
    }
  } catch (err: any) {
    if (err?.name === "AbortError" || err?.message?.includes("timeout")) {
      throw new AiCallError("The request took too long. Please try a simpler query.", 0);
    }
    throw err;
  }
  return result;
}
