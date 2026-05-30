import { NextResponse } from "next/server";
import { generateWithOpenAI } from "@/lib/openai";
import { generateWithOpenRouter } from "@/lib/openrouter";
import { generateWithCohere } from "@/lib/cohere";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const results: any = {
        openai: { status: "pending" },
        openrouter: { status: "pending" },
        cohere: { status: "pending" }
    };

    const prompt = "Say 'OpenAI is working'";
    const sys = "Be extremely concise.";

    // Test OpenAI
    try {
        const text = await generateWithOpenAI(prompt, sys);
        results.openai = { status: "ok", response: text };
    } catch (e: any) {
        results.openai = { status: "error", message: e.message };
    }

    // Test OpenRouter
    try {
        const text = await generateWithOpenRouter(prompt, sys);
        results.openrouter = { status: "ok", response: text };
    } catch (e: any) {
        results.openrouter = { status: "error", message: e.message };
    }

    // Test Cohere
    try {
        const text = await generateWithCohere(prompt, sys);
        results.cohere = { status: "ok", response: text };
    } catch (e: any) {
        results.cohere = { status: "error", message: e.message };
    }

    return NextResponse.json(results);
}
