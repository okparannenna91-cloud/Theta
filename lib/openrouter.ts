import { createOpenAI } from "@ai-sdk/openai";

/**
 * OpenRouter Provider for Vercel AI SDK
 */
export const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": "https://thetapm.site",
    "X-Title": "Nova AI",
  }
});

/**
 * Generate a response using OpenRouter (Standard Fetch)
 */
export async function generateWithOpenRouter(prompt: string, systemPrompt?: string, imageUrl?: string) {
    const apiKey = process.env.OPENROUTER;
    if (!apiKey) {
        throw new Error("OpenRouter API key missing");
    }

    const messages: any[] = [
        { role: "system", content: systemPrompt || "You are a helpful assistant." }
    ];

    if (imageUrl) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: prompt },
                {
                    type: "image_url",
                    image_url: {
                        url: imageUrl,
                    },
                },
            ],
        });
    } else {
        messages.push({ role: "user", content: prompt });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://thetapm.site",
            "X-Title": "Nova AI",
        },
        body: JSON.stringify({
            model: imageUrl ? "google/gemini-flash-1.5" : "google/gemini-flash-1.5",
            messages: messages,
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || "OpenRouter error");
    }

    return data.choices[0].message.content;
}
