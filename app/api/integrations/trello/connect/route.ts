import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { enforcePlanLimit } from "@/lib/plan-limits";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { workspaceId, apiKey, token } = body;

        if (!workspaceId || !token) {
            return NextResponse.json({ error: "Missing workspaceId or Token" }, { status: 400 });
        }

        const prisma = getPrismaClient(workspaceId);

        // Check limits
        try {
            const currentCount = await prisma.integration.count({
                where: { workspaceId }
            });

            await enforcePlanLimit(workspaceId, "integrations", currentCount);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        // Trello uses API key from ENV (usually global) and user token.
        // But for multi-workspace isolation, maybe we store the key too if provided.
        const integration = await prisma.integration.upsert({
            where: {
                id: (await prisma.integration.findFirst({
                    where: {
                        workspaceId,
                        // @ts-ignore
                        provider: "trello"
                    }
                }))?.id || "unfound-id-placeholder"
            },
            update: {
                accessToken: encrypt(token),
                // We could store the apiKey in config if it's per-user
                config: { apiKey: apiKey || process.env.TRELLO_API_KEY },
                updatedAt: new Date(),
            },
            create: {
                workspaceId,
                // @ts-ignore
                provider: "trello",
                accessToken: encrypt(token),
                config: { apiKey: apiKey || process.env.TRELLO_API_KEY },
            },
        });

        return NextResponse.json(integration);
    } catch (error) {
        console.error("Trello connect error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
