import { CohereClient } from "cohere-ai";
import { logger } from "./logger";

let _cohereClient: CohereClient | null = null;

function getCohereClient(): CohereClient {
  if (!_cohereClient) {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error("COHERE_API_KEY is not defined in environment variables.");
    }
    logger.info("Cohere client initialized.");
    _cohereClient = new CohereClient({ token: apiKey });
  }
  return _cohereClient;
}

export async function generateWithCohere(prompt: string, systemPrompt?: string, signal?: AbortSignal, model?: string) {
  const client = getCohereClient();
  const response = await client.chat({
    message: prompt,
    preamble: systemPrompt,
    model: model || "command-a-03-2025",
  }, { abortSignal: signal });
  if (!response || !response.text) {
    throw new Error("Empty response from Cohere");
  }
  return response.text;
}
