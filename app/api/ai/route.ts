import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateWithOpenAI, generateWithVision } from "@/lib/openai";

const BOOTS_SYSTEM_PROMPT = `You are Boots, a helpful and efficient AI assistant for project management on thetapm.site. 
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
Projects: ${projects.length > 0 ? projects.map((p: any) => p.name).join(", ") : "None yet"}
Recent Tasks: ${tasks.length > 0 ? tasks.map((t: any) => `${t.title} [${t.status}, ${t.priority}]`).join(", ") : "None yet"}
Teams: ${teams.length > 0 ? teams.map((t: any) => t.name).join(", ") : "None yet"}
---
`;
        }

        const systemPromptWithContext = `${BOOTS_SYSTEM_PROMPT}${workspaceContext}`;

        let text = "";
        try {
            if (imageUrl) {
                text = await generateWithVision(prompt, imageUrl, systemPromptWithContext) || "";
            } else {
                text = await generateWithOpenAI(prompt, systemPromptWithContext) || "";
            }
        } catch (openaiError: any) {
            console.warn("OpenAI failed, attempting Cohere fallback...", openaiError);

            // Vision tasks cannot fallback to Cohere easily (different API/capabilities)
            if (imageUrl) {
                throw openaiError;
            }

            try {
                const { generateWithCohere } = await import("@/lib/cohere");
                text = await generateWithCohere(prompt, systemPromptWithContext);
            } catch (cohereError: any) {
                console.error("Cohere fallback also failed:", cohereError);
                throw openaiError; // Throw original error if fallback fails
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
