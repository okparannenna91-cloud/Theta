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
            const { getPrismaClient } = await import("@/lib/prisma");
            const db = getPrismaClient(workspaceId);
            
            const [projects, tasks, teams, integrations] = await Promise.all([
                db.project.findMany({
                    where: { workspaceId },
                    take: 5,
                    select: { name: true }
                }),
                db.task.findMany({
                    where: { workspaceId },
                    take: 10,
                    orderBy: { updatedAt: 'desc' },
                    select: { title: true, status: true, priority: true }
                }),
                db.team.findMany({
                    where: { workspaceId },
                    take: 5,
                    select: { name: true }
                }),
                db.integration.findMany({
                    where: { workspaceId },
                    take: 10,
                    select: { provider: true }
                })
            ]);

            workspaceContext = `
CURRENT WORKSPACE CONTEXT:
Projects: ${projects.length > 0 ? projects.map((p: any) => p.name).join(", ") : "None yet"}
Recent Tasks: ${tasks.length > 0 ? tasks.map((t: any) => `${t.title} [${t.status}, ${t.priority}]`).join(", ") : "None yet"}
Teams: ${teams.length > 0 ? teams.map((t: any) => t.name).join(", ") : "None yet"}
Connected Integrations: ${integrations.length > 0 ? integrations.map((i: any) => i.provider).join(", ") : "None connected"}
---
`;
        }

        const systemPromptWithContext = `${BOOTS_SYSTEM_PROMPT}${workspaceContext}`;

        let text = "";
        try {
            // Priority 1: OpenAI
            try {
                if (imageUrl) {
                    text = await generateWithVision(prompt, imageUrl, systemPromptWithContext) || "";
                } else {
                    text = await generateWithOpenAI(prompt, systemPromptWithContext) || "";
                }
            } catch (openaiError: any) {
                // Check if it's a rate limit error (status 429)
                if (openaiError.status === 429) {
                    console.warn("OpenAI Rate limited, attempting Cohere fallback...");
                    // Try Cohere as fallback for rate limits
                    if (imageUrl) throw openaiError; // Vision can't easily fallback to Cohere

                    const { generateWithCohere } = await import("@/lib/cohere");
                    text = await generateWithCohere(prompt, systemPromptWithContext);
                } else {
                    throw openaiError; // Re-throw other errors to hit standard catch
                }
            }
        } catch (error: any) {
            console.warn("Primary AI providers failed, attempting general fallback...", error);

            if (imageUrl) {
                throw error; // Vision must stay OpenAI for now
            }

            try {
                // Last ditch attempt with Cohere if not already tried for 429 above
                if (!text) {
                    const { generateWithCohere } = await import("@/lib/cohere");
                    text = await generateWithCohere(prompt, systemPromptWithContext);
                }
            } catch (cohereError: any) {
                console.error("General fallback also failed:", cohereError);
                throw error; // Throw previous provider's error
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
                { error: "Boots is taking a short break (Rate Limit reached). Please wait about 30 seconds and try again." },
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
