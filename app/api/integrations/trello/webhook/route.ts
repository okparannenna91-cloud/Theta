import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function HEAD(request: NextRequest) {
    // Trello initial verification: respond 200 to confirm endpoint exists
    return new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
    const payload = await request.text();

    // Optional shared secret verification for Trello webhooks
    const trelloSecret = process.env.TRELLO_WEBHOOK_SECRET;
    if (trelloSecret) {
        const signature = request.headers.get("x-trello-webhook") || "";
        if (!signature) {
            console.error("[Trello] Webhook rejected: missing x-trello-webhook header");
            return NextResponse.json({ error: "Missing signature" }, { status: 401 });
        }
        const expected = crypto.createHmac("sha256", trelloSecret).update(payload).digest("hex");
        const expectedBuf = Buffer.from(expected);
        const actualBuf = Buffer.from(signature);
        if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
            console.error("[Trello] Webhook rejected: invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
    }

    const data = JSON.parse(payload);

    try {
        const boardId = data.model?.id;
        if (!boardId) return NextResponse.json({ message: "No model ID found" });

        const integration = await prisma.integration.findFirst({
            where: {
                provider: "trello",
                OR: [
                    { metadata: { equals: { boardId: boardId } } },
                    { config: { equals: { boardId: boardId } } }
                ]
            }
        });

        const workspaceId = integration?.workspaceId;

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
