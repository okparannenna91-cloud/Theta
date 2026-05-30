import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const payload = await request.text();
    const topic = request.headers.get("x-wc-webhook-topic");
    const signature = request.headers.get("x-wc-webhook-signature");
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    const data = JSON.parse(payload);

    try {
        if (!workspaceId) {
            return NextResponse.json({ message: "No workspaceId in callback URL" }, { status: 400 });
        }

        const prisma = getPrismaClient(workspaceId);
        const integration = await prisma.integration.findFirst({
            where: {
                workspaceId,
                // @ts-ignore
                provider: "woocommerce"
            }
        });

        if (!integration) {
            return NextResponse.json({ message: "Integration not found" }, { status: 404 });
        }

        // WooCommerce verification: if config has a webhookSecret
        const config = integration.config as any;
        if (config?.webhookSecret && signature) {
            const hmac = crypto.createHmac("sha256", config.webhookSecret);
            const digest = hmac.update(payload).digest("base64");
            if (signature !== digest) {
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
        }

        // Handle events
        if (topic === "order.created") {
            const { createActivity } = await import("@/lib/activity");
            await createActivity(
                "system",
                workspaceId,
                "ordered",
                "woocommerce_store",
                data.id?.toString(),
                {
                    orderId: data.id,
                    total: data.total,
                    currency: data.currency,
                    customer: data.billing?.first_name + " " + data.billing?.last_name
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("WooCommerce webhook error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
