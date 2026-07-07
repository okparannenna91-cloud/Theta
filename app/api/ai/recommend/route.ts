import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": "https://thetapm.site",
    "X-Title": "Nova AI",
  }
});

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { title, workspaceId } = await req.json();
        if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

        // Fetch projects to allow AI to choose one
        const projects = await prisma.project.findMany({
            where: { workspaceId },
            select: { id: true, name: true }
        });

        const prompt = `Task Title: "${title}"
Projects: ${JSON.stringify(projects)}
Based on the title, recommend the most likely Project ID and Priority (low, medium, high, urgent). 
If none of the projects fit, return "no-project".`;

        // Use a simpler approach for now since I can't easily do experimental_generateObject without knowing the exact version
        // I'll just use generateText and parse or similar
        const responseText = (await generateText({
            model: openrouter("openrouter/free"),
            system: "You are a metadata recommender. Return ONLY a JSON object with keys 'priority' and 'projectId'.",
            prompt: prompt,
        })).text;

        try {
            // Try extracting JSON from markdown code block first
            const codeBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
            const jsonStr = codeBlockMatch?.[1]?.trim() || responseText.match(/\{(?:[^{}]|(?!\})\{|(?<=\})\})*?\}/)?.[0];
            if (!jsonStr) throw new Error("No JSON found in response");
            const result = JSON.parse(jsonStr);
            return NextResponse.json(result);
        } catch (e) {
            return NextResponse.json({ priority: "medium", projectId: "no-project" });
        }

    } catch (error: any) {
        console.error("Recommendation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
