import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");

    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
        return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(payload).digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(payload);

    try {
        // We need to find the workspace associated with this repository
        // GitHub webhooks don't usually include our workspaceId, 
        // but the integration record in our DB should have the repo info in config/metadata

        const repoId = data.repository?.id?.toString();
        if (!repoId) return NextResponse.json({ message: "No repo ID found" });

        // TENANT ISOLATION: Fetch all GitHub integrations and match in application code
        // Prisma MongoDB's JSON { equals: ... } requires exact match, so we filter in-memory
        const githubIntegrations = await prisma.integration.findMany({
            where: { provider: "github" },
        });

        const integration = githubIntegrations.find(i => {
            const meta = i.metadata as Record<string, unknown> | null;
            const cfg = i.config as Record<string, unknown> | null;
            return meta?.repoId === repoId || cfg?.repoId === repoId;
        });

        const workspaceId = integration?.workspaceId;

        if (!workspaceId) {
            return NextResponse.json({ message: "No workspace linked to this repository" });
        }

        // Handle events
        if (event === "push") {
            // Log activity
            const { createActivity, resolveWebhookUserId } = await import("@/lib/activity");
            const webhookUserId = await resolveWebhookUserId(workspaceId) || "system";
            await createActivity(
                webhookUserId,
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
