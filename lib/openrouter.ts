import { createOpenAI } from "@ai-sdk/openai";

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    for (const signal of signals) {
        if (signal.aborted) {
            controller.abort(signal.reason);
            return controller.signal;
        }
        signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }
    return controller.signal;
}

export const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": "https://thetapm.site",
    "X-Title": "Nova AI",
  }
});

export async function generateWithOpenRouter(
  prompt: string,
  systemPrompt?: string,
  imageUrl?: string,
  modelName?: string,
  signal?: AbortSignal
) {
    const apiKey = process.env.OPENROUTER_API_KEY;
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

    const model = modelName || (imageUrl ? "openrouter/auto" : "openrouter/auto");

    const fetchController = new AbortController();
    const fetchTimeout = setTimeout(() => fetchController.abort("OpenRouter fetch timeout"), 25000);
    const combinedSignal = signal
        ? combineAbortSignals(signal, fetchController.signal)
        : fetchController.signal;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://thetapm.site",
                "X-Title": "Nova AI",
            },
            body: JSON.stringify({
                model,
                messages: messages,
            }),
            signal: combinedSignal,
        });

        if (!response.ok) {
            let errorMessage = "OpenRouter error";
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || `OpenRouter returned status ${response.status}`;
            } catch {
                errorMessage = `OpenRouter returned status ${response.status}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
            throw new Error("OpenRouter returned empty response");
        }

        return data.choices[0].message.content;
    } finally {
        clearTimeout(fetchTimeout);
    }
}
