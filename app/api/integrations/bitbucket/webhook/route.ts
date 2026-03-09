import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const payload = await request.text();
    const eventKey = request.headers.get("x-event-key"); // Bitbucket event key

    const data = JSON.parse(payload);

    try {
        const repoFullName = data.repository?.full_name;
        if (!repoFullName) return NextResponse.json({ message: "No repo full name found" });

        // Search across shards for the integration
        const { prismaShard1, prismaShard2, prismaShard3, prismaShard4 } = await import("@/lib/prisma");
        const shards = [prismaShard1, prismaShard2, prismaShard3, prismaShard4];

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
