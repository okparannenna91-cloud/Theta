import OpenAI from "openai";
import { logger } from "./logger";

let _openaiClient: OpenAI | null = null;
let _apiKeyChecked = false;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined in environment variables.");
    }
    if (!_apiKeyChecked) {
      logger.info("OpenAI client initialized.");
      _apiKeyChecked = true;
    }
    _openaiClient = new OpenAI({
      apiKey,
      timeout: 30000,
      maxRetries: 2,
    });
  }
  return _openaiClient;
}

export async function generateWithOpenAI(prompt: string, systemPrompt?: string, signal?: AbortSignal, model?: string) {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: model || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt || "You are a helpful assistant." },
      { role: "user", content: prompt }
    ],
  }, { signal });
  return response.choices[0].message.content;
}

export async function generateWithVision(prompt: string, imageUrl: string, systemPrompt?: string, signal?: AbortSignal, model?: string) {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: model || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt || "You are a helpful assistant." },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
  }, { signal });
  return response.choices[0].message.content;
}

export async function streamWithOpenAI(prompt: string, systemPrompt?: string, signal?: AbortSignal, model?: string) {
  const client = getOpenAIClient();
  return await client.chat.completions.create({
    model: model || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt || "You are a helpful assistant." },
      { role: "user", content: prompt }
    ],
    stream: true,
  }, { signal });
}
