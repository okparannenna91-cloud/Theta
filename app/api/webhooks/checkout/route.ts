import crypto from "crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.CHECKOUT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const headerStore = headers();
    const signature = headerStore.get("cko-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 400 }
      );
    }

    const rawBody = await req.text();
    const computedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody, "utf8")
      .digest("hex");

    if (computedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType: string | undefined = event?.type;
    const metadata = event?.data?.metadata || {};

    // We expect userId and planId in metadata from the session creation
    const userId: string | undefined = metadata.userId;
    const planId: string | undefined = metadata.planId;
    const interval: string | undefined = metadata.interval || "monthly";

    if (!userId) {
      return NextResponse.json(
        { error: "User metadata missing" },
        { status: 400 }
      );
    }

    if (eventType === "payment_approved") {
      // Find the user's workspace
      // For now, we update the user's primary workspace (or first one found)
      // Ideally, the workspaceId should be in metadata too
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: (await prisma.user.findUnique({ where: { clerkId: userId } }))?.id },
        orderBy: { createdAt: "asc" }
      });

      if (membership && planId) {
        const isLifetime = planId === "lifetime";

        await prisma.workspace.update({
          where: { id: membership.workspaceId },
          data: {
            plan: planId.replace("-monthly", "").replace("-annual", ""),
            billingInterval: isLifetime ? null : interval,
            isLifetime: isLifetime,
          }
        });
      }

      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          status: "active",
        },
        update: {
          status: "active",
        },
      });
    } else if (eventType === "payment_declined" || eventType === "payment_voided") {
      await prisma.subscription.update({
        where: { userId },
        data: { status: "inactive" }
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Checkout webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


