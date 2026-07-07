import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

function verifyWebhookSignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string
): boolean {
  if (!CLERK_WEBHOOK_SECRET) {
    logger.warn("[Clerk Webhook] CLERK_WEBHOOK_SECRET not set — skipping signature verification");
    return true;
  }

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", CLERK_WEBHOOK_SECRET).update(signedContent).digest("base64");

  const signatures = svixSignature.split(" ").map((s) => s.trim());
  for (const sig of signatures) {
    const [version, sigValue] = sig.split(",");
    if (version !== "v1") continue;
    try {
      if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigValue))) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const svixId = req.headers.get("svix-id") ?? "";
    const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
    const svixSignature = req.headers.get("svix-signature") ?? "";

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
    }

    const payload = await req.text();

    if (!verifyWebhookSignature(payload, svixId, svixTimestamp, svixSignature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(payload);
    const { type, data } = event;

    switch (type) {
      case "user.created": {
        const { id, email_addresses, first_name, last_name, image_url } = data;
        const email = email_addresses?.[0]?.email_address ?? "";
        const name = [first_name, last_name].filter(Boolean).join(" ") || null;

        await prisma.user.upsert({
          where: { clerkId: id },
          update: { email, name, imageUrl: image_url },
          create: {
            clerkId: id,
            email,
            name,
            imageUrl: image_url,
          },
        });

        logger.info(`[Clerk Webhook] User created: ${id} (${email})`);
        break;
      }

      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } = data;
        const email = email_addresses?.[0]?.email_address ?? "";
        const name = [first_name, last_name].filter(Boolean).join(" ") || null;

        await prisma.user.update({
          where: { clerkId: id },
          data: { email, name, imageUrl: image_url },
        });

        logger.info(`[Clerk Webhook] User updated: ${id}`);
        break;
      }

      case "user.deleted": {
        const { id } = data;

        await prisma.user.delete({
          where: { clerkId: id },
        });

        logger.info(`[Clerk Webhook] User deleted: ${id}`);
        break;
      }

      default:
        logger.info(`[Clerk Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error("[Clerk Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
