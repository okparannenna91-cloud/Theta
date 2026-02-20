import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { model, visionModel } from "@/lib/gemini";

const BOOTS_SYSTEM_PROMPT = `You are Boots, a helpful and efficient AI assistant for project management. 
Your name comes from "you get it - work!" Keep responses concise, actionable, and professional. 
Focus on helping users get work done faster. Be friendly but direct.`;

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { prompt, imageUrl, workspaceId } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Boots needs a prompt to help you" }, { status: 400 });
        }

        // Check limits if workspaceId is provided
        if (workspaceId) {
            const { getBootsRequestCount } = await import("@/lib/usage-tracking");
            const currentUsage = await getBootsRequestCount(workspaceId);

            try {
                const { enforcePlanLimit } = await import("@/lib/plan-limits");
                await enforcePlanLimit(workspaceId, "boots", currentUsage);
            } catch (error: any) {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }
        }

        let workspaceContext = "";
        if (workspaceId) {
            const { prisma } = await import("@/lib/prisma");
            const [projects, tasks, teams] = await Promise.all([
                prisma.project.findMany({
                    where: { workspaceId },
                    take: 5,
                    select: { name: true }
                }),
                prisma.task.findMany({
                    where: { workspaceId },
                    take: 10,
                    orderBy: { updatedAt: 'desc' },
                    select: { title: true, status: true, priority: true }
                }),
                prisma.team.findMany({
                    where: { workspaceId },
                    take: 5,
                    select: { name: true }
                })
            ]);

            workspaceContext = `
CURRENT WORKSPACE CONTEXT:
Projects: ${projects.length > 0 ? projects.map(p => p.name).join(", ") : "None yet"}
Recent Tasks: ${tasks.length > 0 ? tasks.map(t => `${t.title} [${t.status}, ${t.priority}]`).join(", ") : "None yet"}
Teams: ${teams.length > 0 ? teams.map(t => t.name).join(", ") : "None yet"}
---
`;
        }

        let text = "";
        const finalPrompt = `${BOOTS_SYSTEM_PROMPT}${workspaceContext}\n\nUser Question: ${prompt}`;

        try {
            if (imageUrl) {
                // Fetch image data
                const imageResp = await fetch(imageUrl);
                const arrayBuffer = await imageResp.arrayBuffer();
                const base64Data = Buffer.from(arrayBuffer).toString("base64");
                const mimeType = imageResp.headers.get("content-type") || "image/jpeg";

                const result = await visionModel.generateContent([
                    finalPrompt,
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType,
                        },
                    },
                ]);
                text = result.response.text();
            } else {
                const result = await model.generateContent(finalPrompt);
                text = result.response.text();
            }
        } catch (geminiError: any) {
            console.warn("Gemini AI failed, attempting Cohere fallback...", geminiError);

            // Vision tasks cannot fallback to Cohere easily (different API/capabilities)
            if (imageUrl) {
                throw geminiError;
            }

            try {
                const { generateWithCohere } = await import("@/lib/cohere");
                text = await generateWithCohere(prompt, `${BOOTS_SYSTEM_PROMPT}${workspaceContext}`);
            } catch (cohereError: any) {
                console.error("Cohere fallback also failed:", cohereError);
                throw geminiError; // Throw original error if fallback fails
            }
        }

        // Increment usage if workspaceId is provided
        if (workspaceId) {
            const { incrementBootsUsage } = await import("@/lib/usage-tracking");
            await incrementBootsUsage(workspaceId, user.id);
        }

        return NextResponse.json({ text });
    } catch (error: any) {
        if (error.status === 429) {
            return NextResponse.json(
                { error: "Boots is taking a short break (Rate Limit reached). Please try again in a moment." },
                { status: 429 }
            );
        }

        console.error("Boots AI error:", error);
        return NextResponse.json(
            { error: error.message || "Boots encountered an error. Please try again." },
            { status: 500 }
        );
    }
}
