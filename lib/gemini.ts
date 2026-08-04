import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    logger.info("Gemini client initialized.");
    _genAI = new GoogleGenerativeAI(apiKey);
  }
  return _genAI;
}

export function getModel(model?: string) {
  return getGenAI().getGenerativeModel({ model: model || "gemini-2.5-flash" });
}

export function getVisionModel(model?: string) {
  return getModel(model);
}

export async function generateWithGemini(
  prompt: string,
  systemPrompt?: string,
  signal?: AbortSignal,
  model?: string
): Promise<string> {
  const genModel = getModel(model);
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const response = await genModel.generateContent(fullPrompt, { signal });
  return response.response.text();
}
