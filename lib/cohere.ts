import { CohereClient } from "cohere-ai";

const apiKey = process.env.COHERE_API_KEY;

if (!apiKey) {
    console.warn("COHERE_API_KEY is not defined in environment variables. Cohere AI fallback will not function.");
}

export const cohere = new CohereClient({
    token: apiKey || "dummy_key",
});

/**
 * Generate a response using Cohere AI
 */
export async function generateWithCohere(prompt: string, systemPrompt?: string) {
    if (!apiKey) {
        throw new Error("Cohere API key missing");
    }

    const response = await cohere.chat({
        message: prompt,
        preamble: systemPrompt,
        model: "command-r-plus", // Professional model similar to Gemini 1.5
    });

    return response.text;
}
