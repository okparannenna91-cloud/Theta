import { NextResponse } from "next/server";
import { runBillingCron } from "@/lib/billing/cron";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runBillingCron();
    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error("Billing cron failed:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
