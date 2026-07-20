import { NextResponse } from "next/server";
import crypto from "crypto";
import { handleSlashCommand } from "@/lib/integrations/slack";

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

    // Slash commands are always application/x-www-form-urlencoded
    const formData = new URLSearchParams(body);
    const payload = Object.fromEntries(formData.entries());

    const result = await handleSlashCommand(payload as any);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Slack commands error:", error);
    return NextResponse.json({ error: "Command processing failed" }, { status: 500 });
  }
}
