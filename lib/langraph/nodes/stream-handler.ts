import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getLangChainModel } from "../models";
import { routeModel } from "../model-router";
import { logger } from "@/lib/logger";

export interface StreamResult {
  text: string;
  finishReason?: string;
}

export async function executeStream(
  prompt: string,
  systemPrompt: string,
  _ctx: unknown,
  options?: { model?: string; signal?: AbortSignal; onToken?: (token: string) => void; onFinish?: (text: string) => void },
): Promise<StreamResult> {
  const route = options?.model
    ? await routeModel(options.model)
    : await routeModel(prompt);

  const chatModel = getLangChainModel(route.provider, route.model);

  let collectedText = "";

  const stream = await chatModel.stream(
    [
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ],
    { signal: options?.signal }
  );

  for await (const chunk of stream) {
    const content = typeof chunk.content === "string" ? chunk.content : "";
    if (content) {
      collectedText += content;
      options?.onToken?.(content);
    }
  }

  logger.info("[StreamHandler] Finished", {
    provider: route.provider,
    model: route.model,
    length: collectedText.length,
  });
  options?.onFinish?.(collectedText);

  return { text: collectedText };
}
