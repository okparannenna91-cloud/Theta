import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { enforcePlanLimit } from "@/lib/plan-limits";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { workspaceId, siteUrl, consumerKey, consumerSecret } = body;

        if (!workspaceId || !siteUrl || !consumerKey || !consumerSecret) {
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

        // WooCommerce siteUrl goes in config, keys go in encrypted tokens
        const integration = await prisma.integration.upsert({
            where: {
                id: (await prisma.integration.findFirst({
                    where: {
                        workspaceId,
                        // @ts-ignore
                        provider: "woocommerce"
                    }
                }))?.id || "unfound-id-placeholder"
            },
            update: {
                accessToken: encrypt(consumerKey),
                refreshToken: encrypt(consumerSecret),
                config: { siteUrl },
                updatedAt: new Date(),
            },
            create: {
                workspaceId,
                // @ts-ignore
                provider: "woocommerce",
                accessToken: encrypt(consumerKey),
                refreshToken: encrypt(consumerSecret),
                config: { siteUrl },
            },
        });

        return NextResponse.json(integration);
    } catch (error) {
        console.error("WooCommerce connect error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
