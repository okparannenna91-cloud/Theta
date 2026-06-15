import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature") || "";
    const secret = process.env.BITBUCKET_WEBHOOK_SECRET;
    if (secret) {
        if (!signature) {
            console.error("[Bitbucket] Webhook rejected: missing signature");
            return NextResponse.json({ error: "Missing signature" }, { status: 401 });
        }
        const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
        const actual = signature.startsWith("sha256=") ? signature.slice(7) : signature;
        const expectedBuf = Buffer.from(expected);
        const actualBuf = Buffer.from(actual);
        if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
            console.error("[Bitbucket] Webhook rejected: invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
    } else {
        console.warn("[Bitbucket] BITBUCKET_WEBHOOK_SECRET not set — signature verification disabled");
    }

    const eventKey = request.headers.get("x-event-key"); // Bitbucket event key

    const data = JSON.parse(payload);

    try {
        const repoFullName = data.repository?.full_name;
        if (!repoFullName) return NextResponse.json({ message: "No repo full name found" });

        // Search across shards for the integration
        const { prismaShard1, prismaShard2, prismaShard3 } = await import("@/lib/prisma");
        const shards = [prismaShard1, prismaShard2, prismaShard3];

        let integration = null;
        let workspaceId = null;

        for (const shard of shards) {
            if (!shard) continue;
            // @ts-ignore
            integration = await shard.integration.findFirst({
                where: {
                    provider: "bitbucket",
                    OR: [
                        { metadata: { equals: { repoName: repoFullName } } },
                        { config: { equals: { repoName: repoFullName } } }
                    ]
                }
            });
            if (integration) {
                workspaceId = integration.workspaceId;
                break;
            }
        }

        if (!workspaceId) {
            return NextResponse.json({ message: "No workspace linked to this bitbucket repository" });
        }

        // Log activity based on events: repo:push, repo:pullrequest:created
        if (eventKey === "repo:push") {
            const { createActivity } = await import("@/lib/activity");
            await createActivity(
                "system",
                workspaceId,
                "pushed",
                "bitbucket_repo",
                repoFullName,
                {
                    repoName: repoFullName,
                    pusher: data.actor?.display_name,
                    commits: data.push?.changes?.[0]?.new?.target?.message || "Changes pushed"
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Bitbucket webhook error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
