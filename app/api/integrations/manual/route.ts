import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { enforcePlanLimit } from "@/lib/plan-limits";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { workspaceId, provider, accessToken, refreshToken, config } = body;

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

        if (!workspaceId || !provider || !accessToken) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const prisma = getPrismaClient(workspaceId);

        // Save or update the integration
        const integration = await prisma.integration.upsert({
            where: {
                id: (await prisma.integration.findFirst({
                    where: {
                        workspaceId,
                        // @ts-ignore
                        provider
                    }
                }))?.id || "unfound-id-placeholder"
            },
            update: {
                accessToken: encrypt(accessToken),
                refreshToken: refreshToken ? encrypt(refreshToken) : null,
                config: config || {},
                updatedAt: new Date(),
            },
            create: {
                workspaceId,
                // @ts-ignore
                provider,
                accessToken: encrypt(accessToken),
                refreshToken: refreshToken ? encrypt(refreshToken) : null,
                config: config || {},
            },
        });

        return NextResponse.json(integration);
    } catch (error) {
        console.error("Manual integration error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
