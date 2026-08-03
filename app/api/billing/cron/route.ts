import { NextResponse } from "next/server";
import { runBillingCron } from "@/lib/billing/cron";
import crypto from "crypto";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runBillingCron();
    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error("Billing cron failed:", error.message);
    return NextResponse.json({ success: false, error: "Cron job failed" }, { status: 500 });
  }
}
