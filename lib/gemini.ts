import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in environment variables. Boots AI will not function.");
}

const genAI = new GoogleGenerativeAI(apiKey || "dummy_key");

// Using gemini-1.5-flash which is the standard model for project management tasks.
export const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 1.5-flash is natively multimodal, so it handles vision tasks as well
export const visionModel = model;
