import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { enforcePlanLimit } from "@/lib/plan-limits";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { workspaceId, config_url } = body;

        if (!workspaceId || !config_url) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

        const integration = await prisma.integration.upsert({
            where: {
                id: (await prisma.integration.findFirst({
                    where: {
                        workspaceId,
                        // @ts-ignore
                        provider: "figma"
                    }
                }))?.id || "unfound-id-placeholder"
            },
            update: {
                config: { url: config_url },
                updatedAt: new Date(),
            },
            create: {
                workspaceId,
                // @ts-ignore
                provider: "figma",
                config: { url: config_url },
            },
        });

        return NextResponse.json(integration);
    } catch (error) {
        console.error("Figma connect error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
