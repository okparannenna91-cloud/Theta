import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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
            // TENANT ISOLATION: Filter in-memory since Prisma JSON { equals: ... } requires exact match
            const asanaIntegrations = await prisma.integration.findMany({
                where: { provider: "asana" },
            });

            const asanaIntegration = asanaIntegrations.find(i => {
                const meta = i.metadata as Record<string, unknown> | null;
                const cfg = i.config as Record<string, unknown> | null;
                return meta?.projectGid === resourceGid || cfg?.projectGid === resourceGid;
            });

            const workspaceId = asanaIntegration?.workspaceId;

            if (workspaceId) {
                const { createActivity, resolveWebhookUserId } = await import("@/lib/activity");
                const webhookUserId = await resolveWebhookUserId(workspaceId) || "system";
                await createActivity(
                    webhookUserId,
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
