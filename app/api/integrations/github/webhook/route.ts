import { NextResponse } from "next/server";
import crypto from "crypto";
import { handleWebhook } from "@/lib/integrations/github";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // Verify signature
    if (secret && signature) {
      const expectedSignature = `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const eventType = req.headers.get("x-github-event") || "unknown";
    const payload = JSON.parse(body);
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    await handleWebhook(
      { "x-github-event": eventType } as Record<string, string>,
      payload,
      workspaceId
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("GitHub webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
