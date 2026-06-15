import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const payload = await request.text();
    const signature = request.headers.get("x-asana-request-signature");
    const secret = process.env.ASANA_WEBHOOK_SECRET;

    // Asana initial handshake: return the X-Hook-Secret
    const hookSecret = request.headers.get("x-hook-secret");
    if (hookSecret) {
        return new NextResponse(null, {
            status: 200,
            headers: {
                "X-Hook-Secret": hookSecret,
            },
        });
    }

    // Verify HMAC-SHA256 signature
    if (!secret) {
        return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(payload);

    try {
        // Handle events
        for (const event of data.events || []) {
            const resourceGid = event.resource?.gid;
            if (!resourceGid) continue;

            // Find integration by resourceGid stored in metadata/config
            const { prismaShard1, prismaShard2, prismaShard3 } = await import("@/lib/prisma");
            const shards = [prismaShard1, prismaShard2, prismaShard3];

            let integration = null;
            let workspaceId = null;

            for (const shard of shards) {
                if (!shard) continue;
                // @ts-ignore
                integration = await shard.integration.findFirst({
                    where: {
                        provider: "asana",
                        OR: [
                            { metadata: { equals: { projectGid: resourceGid } } },
                            { config: { equals: { projectGid: resourceGid } } }
                        ]
                    }
                });
                if (integration) {
                    workspaceId = integration.workspaceId;
                    break;
                }
            }

            if (workspaceId) {
                const { createActivity } = await import("@/lib/activity");
                await createActivity(
                    "system",
                    workspaceId,
                    "updated",
                    "asana_task",
                    resourceGid,
                    {
                        action: event.action,
                        resourceType: event.resource.resource_type,
                        user: event.user?.name
                    }
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Asana webhook error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
