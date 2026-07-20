import { NextResponse } from "next/server";
import crypto from "crypto";
import { handleSlashCommand, handleInteractiveAction, handleMessageAction } from "@/lib/integrations/slack";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signingSecret = process.env.SLACK_SIGNING_SECRET;

    // Verify Slack request signature
    if (signingSecret) {
      const timestamp = req.headers.get("x-slack-request-timestamp");
      const slackSignature = req.headers.get("x-slack-signature");

      if (timestamp && slackSignature) {
        const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
        if (parseInt(timestamp) < fiveMinutesAgo) {
          return NextResponse.json({ error: "Request too old" }, { status: 403 });
        }

        const baseString = `v0:${timestamp}:${body}`;
        const expectedSignature = `v0=${crypto.createHmac("sha256", signingSecret).update(baseString).digest("hex")}`;

        if (slackSignature !== expectedSignature) {
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      }
    }

    // Determine content type
    const contentType = req.headers.get("content-type") || "";

    let payload: Record<string, unknown>;
    if (contentType.includes("application/json")) {
      payload = JSON.parse(body);
    } else {
      // application/x-www-form-urlencoded (slash commands)
      const formData = new URLSearchParams(body);
      payload = Object.fromEntries(formData.entries());
    }

    // Route based on payload type
    const type = payload.type as string;

    if (type === "slash_commands" || payload.command) {
      const result = await handleSlashCommand(payload as any);
      return NextResponse.json(result);
    }

    if (type === "interactive" || payload.actions) {
      const result = await handleInteractiveAction(payload as any);
      return NextResponse.json(result);
    }

    if (type === "message_action") {
      const result = await handleMessageAction(payload as any);
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Slack webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
