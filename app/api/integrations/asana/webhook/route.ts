import { NextRequest, NextResponse } from "next/server";
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

    const data = JSON.parse(payload);

    try {
        // Handle events
        for (const event of data.events || []) {
            const resourceGid = event.resource?.gid;
            if (!resourceGid) continue;

            // Find integration by resourceGid stored in metadata/config
            const { prismaShard1, prismaShard2, prismaShard3, prismaShard4 } = await import("@/lib/prisma");
            const shards = [prismaShard1, prismaShard2, prismaShard3, prismaShard4];

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
