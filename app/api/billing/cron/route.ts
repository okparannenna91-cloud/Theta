import { NextResponse } from "next/server";
import { runBillingCron } from "@/lib/billing/cron";
import { isBillingCronEnabled } from "@/lib/billing/cron-enabled";
import crypto from "crypto";

export async function GET(req: Request) {
  // Billing cron is optional — if disabled or not configured, return success no-op
  // instead of 500 so the app can run without CRON_SECRET.
  if (!isBillingCronEnabled()) {
    return NextResponse.json({ success: true, message: "Billing cron disabled", disabled: true });
  }

  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Should not happen when isBillingCronEnabled() is true, but keep as graceful no-op
    return NextResponse.json({ success: true, message: "Billing cron disabled - CRON_SECRET not configured", disabled: true });
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
