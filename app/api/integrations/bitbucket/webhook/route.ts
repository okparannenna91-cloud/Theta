import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature") || "";
    const secret = process.env.BITBUCKET_WEBHOOK_SECRET;
    if (!secret) {
        console.error("[Bitbucket] BITBUCKET_WEBHOOK_SECRET not configured");
        return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
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

    const eventKey = request.headers.get("x-event-key"); // Bitbucket event key

    const data = JSON.parse(payload);

    try {
        const repoFullName = data.repository?.full_name;
        if (!repoFullName) return NextResponse.json({ message: "No repo full name found" });

        // TENANT ISOLATION: Filter in-memory since Prisma JSON { equals: ... } requires exact match
        const bitbucketIntegrations = await prisma.integration.findMany({
            where: { provider: "bitbucket" },
        });

        const integration = bitbucketIntegrations.find(i => {
            const meta = i.metadata as Record<string, unknown> | null;
            const cfg = i.config as Record<string, unknown> | null;
            return meta?.repoName === repoFullName || cfg?.repoName === repoFullName;
        });

        const workspaceId = integration?.workspaceId;

        if (!workspaceId) {
            return NextResponse.json({ message: "No workspace linked to this bitbucket repository" });
        }

        // Log activity based on events: repo:push, repo:pullrequest:created
        if (eventKey === "repo:push") {
            const { createActivity, resolveWebhookUserId } = await import("@/lib/activity");
            const webhookUserId = await resolveWebhookUserId(workspaceId) || "system";
            await createActivity(
                webhookUserId,
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
