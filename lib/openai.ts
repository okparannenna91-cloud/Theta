import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.warn("OPENAI_API_KEY is not defined in environment variables. Boots AI primary functions will be limited.");
}

export const openai = new OpenAI({
    apiKey: apiKey || "dummy_key",
});

/**
 * Generate a response using OpenAI
 */
export async function generateWithOpenAI(prompt: string, systemPrompt?: string) {
    if (!apiKey) {
        throw new Error("OpenAI API key missing");
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Efficient and high-performance model
        messages: [
            { role: "system", content: systemPrompt || "You are a helpful assistant." },
            { role: "user", content: prompt }
        ],
    });

    return response.choices[0].message.content;
}

/**
 * Generate a response with vision capabilities
 */
export async function generateWithVision(prompt: string, imageUrl: string, systemPrompt?: string) {
    if (!apiKey) {
        throw new Error("OpenAI API key missing");
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt || "You are a helpful assistant." },
            {
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
            },
        ],
    });

    return response.choices[0].message.content;
}
