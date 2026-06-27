import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { buildLangGraphTools, type LangGraphToolContext } from "../tools";
import { logger } from "@/lib/logger";

export interface StreamResult {
  text: string;
  finishReason?: string;
}

export async function executeStream(
  prompt: string,
  systemPrompt: string,
  ctx: LangGraphToolContext,
  options?: { model?: string; signal?: AbortSignal; onToken?: (token: string) => void; onFinish?: (text: string) => void },
): Promise<StreamResult> {
  const apiKey = process.env.OPENROUTER;
  if (!apiKey) throw new Error("No AI provider API key configured for streaming");

  const provider = createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    headers: { "HTTP-Referer": "https://thetapm.site", "X-Title": "Nova AI" },
  });

  const tools = buildLangGraphTools(ctx);
  const toolDefs: Record<string, any> = {};
  for (const t of tools) toolDefs[t.name] = t;

  const collected: string[] = [];
  const result = await streamText({
    model: provider(options?.model || "openai/gpt-4o-mini"),
    system: systemPrompt,
    prompt,
    tools: Object.keys(toolDefs).length > 0 ? toolDefs : undefined,
    abortSignal: options?.signal,
    onFinish: ({ text, finishReason }) => {
      collected.push(text);
      logger.info("[StreamHandler] Finished", { finishReason, length: text.length });
      options?.onFinish?.(text);
    },
  });

  for await (const chunk of result.textStream) {
    collected.push(chunk);
    options?.onToken?.(chunk);
  }

  return { text: collected.join("") };
}
