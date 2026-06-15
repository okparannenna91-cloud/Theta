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

export function getModel() {
  return getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });
}

export function getVisionModel() {
  return getModel();
}
