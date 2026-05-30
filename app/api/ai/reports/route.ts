import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ReportingIntelligence, REPORT_TYPES, REPORT_FREQUENCIES, REPORT_CHANNELS } from "@/lib/nova/reporting-intelligence";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      types: ReportingIntelligence.getReportTypes(),
      definitions: ReportingIntelligence.getReportDefinitions(),
      frequencies: REPORT_FREQUENCIES,
      channels: REPORT_CHANNELS,
    });
  } catch (error: any) {
    console.error("[Reports API] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, workspaceId, type, scopeId, frequency, channels, recipients } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required (generate, schedule, distribute)" }, { status: 400 });
    }

    if (action === "generate") {
      if (!workspaceId || !type || !scopeId) {
        return NextResponse.json({ error: "workspaceId, type, and scopeId are required for generate" }, { status: 400 });
      }
      const report = await ReportingIntelligence.generateReport(type, scopeId, workspaceId, user.id);
      return NextResponse.json({ success: true, report });
    }

    if (action === "schedule") {
      if (!workspaceId || !type || !frequency || !scopeId) {
        return NextResponse.json({ error: "workspaceId, type, frequency, and scopeId are required for schedule" }, { status: 400 });
      }
      await ReportingIntelligence.scheduleReport(type, frequency, scopeId, workspaceId, user.id);
      return NextResponse.json({ success: true, message: `Scheduled ${type} report ${frequency}` });
    }

    if (action === "distribute") {
      if (!workspaceId || !type || !scopeId || !channels || !recipients) {
        return NextResponse.json({ error: "workspaceId, type, scopeId, channels, and recipients are required for distribute" }, { status: 400 });
      }
      const report = await ReportingIntelligence.generateReport(type, scopeId, workspaceId, user.id);
      await ReportingIntelligence.distribute(report, channels, recipients);
      return NextResponse.json({ success: true, message: `Distributed report via ${channels.join(", ")}` });
    }

    return NextResponse.json({ error: `Unknown action "${action}". Valid: generate, schedule, distribute` }, { status: 400 });
  } catch (error: any) {
    console.error("[Reports API] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
