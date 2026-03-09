import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function HEAD() {
    // Trello initial verification
    return new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
    const payload = await request.text();
    const data = JSON.parse(payload);

    try {
        const boardId = data.model?.id;
        if (!boardId) return NextResponse.json({ message: "No model ID found" });

        // Search for integration
        const { prismaShard1, prismaShard2, prismaShard3, prismaShard4 } = await import("@/lib/prisma");
        const shards = [prismaShard1, prismaShard2, prismaShard3, prismaShard4];

        let integration = null;
        let workspaceId = null;

        for (const shard of shards) {
            if (!shard) continue;
            // @ts-ignore
            integration = await shard.integration.findFirst({
                where: {
                    provider: "trello",
                    OR: [
                        { metadata: { equals: { boardId: boardId } } },
                        { config: { equals: { boardId: boardId } } }
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
                "trello_board",
                boardId,
                {
                    action: data.action?.type,
                    member: data.action?.memberCreator?.fullName,
                    cardName: data.action?.data?.card?.name
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Trello webhook error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
