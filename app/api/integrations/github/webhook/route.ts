import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");

    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (secret && signature) {
        const hmac = crypto.createHmac("sha256", secret);
        const digest = "sha256=" + hmac.update(payload).digest("hex");

        if (signature !== digest) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
    }

    const data = JSON.parse(payload);

    try {
        // We need to find the workspace associated with this repository
        // GitHub webhooks don't usually include our workspaceId, 
        // but the integration record in our DB should have the repo info in config/metadata

        // For MVP, we might search across all integrations for this repo ID
        const { prismaShard1, prismaShard2, prismaShard3, prismaShard4 } = await import("@/lib/prisma");
        const shards = [prismaShard1, prismaShard2, prismaShard3, prismaShard4];

        let integration = null;
        let workspaceId = null;

        const repoId = data.repository?.id?.toString();
        if (!repoId) return NextResponse.json({ message: "No repo ID found" });

        for (const shard of shards) {
            if (!shard) continue;
            // @ts-ignore
            integration = await shard.integration.findFirst({
                where: {
                    provider: "github",
                    // We assume we stored tracked repo IDs in metadata or config
                    OR: [
                        { metadata: { equals: { repoId: repoId } } },
                        { config: { equals: { repoId: repoId } } }
                    ]

                }
            });
            if (integration) {
                workspaceId = integration.workspaceId;
                break;
            }
        }

        if (!workspaceId) {
            return NextResponse.json({ message: "No workspace linked to this repository" });
        }

        // Handle events
        if (event === "push") {
            // Log activity
            const { createActivity } = await import("@/lib/activity");
            await createActivity(
                "system", // Action performed by system/webhook
                workspaceId,
                "pushed",
                "github_repo",
                repoId,
                {
                    repoName: data.repository.full_name,
                    commits: data.commits?.length || 0,
                    pusher: data.pusher?.name,
                    ref: data.ref
                }
            );

            // Notify Slack if integrated
            const { notifyWorkspace } = await import("@/lib/integrations/slack");
            await notifyWorkspace(
                workspaceId,
                `New push to *${data.repository.full_name}* by *${data.pusher?.name}* (${data.commits?.length || 0} commits)`,
                "GitHub Update"
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("GitHub webhook error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
