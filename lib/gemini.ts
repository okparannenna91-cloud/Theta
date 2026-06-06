import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    logger.warn("GEMINI_API_KEY is not defined in environment variables. Boots AI will not function.");
}

const genAI = new GoogleGenerativeAI(apiKey!);

// Using gemini-1.5-flash which is the standard model for project management tasks.
export const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 1.5-flash is natively multimodal, so it handles vision tasks as well
export const visionModel = model;
