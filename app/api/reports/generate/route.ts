import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ReportingIntelligence, ReportType, ReportFrequency } from "@/lib/nova/reporting-intelligence";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, scopeId, workspaceId, frequency, channels, recipients } = body as {
    type: ReportType;
    scopeId: string;
    workspaceId: string;
    frequency?: ReportFrequency;
    channels?: string[];
    recipients?: string[];
  };

  if (!type || !workspaceId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validTypes = ["PROJECT", "SPRINT", "TEAM", "EXECUTIVE", "CLIENT"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  try {
    if (frequency && channels && recipients) {
      await ReportingIntelligence.scheduleReport(
        type,
        frequency,
        scopeId || workspaceId,
        workspaceId,
        user.id,
      );

      const report = await ReportingIntelligence.generateReport(
        type,
        scopeId || workspaceId,
        workspaceId,
        user.id,
      );

      await ReportingIntelligence.distribute(
        report,
        channels as any,
        recipients,
        workspaceId,
      );

      return NextResponse.json({ report, scheduled: true });
    }

    const report = await ReportingIntelligence.generateReport(
      type,
      scopeId || workspaceId,
      workspaceId,
      user.id,
    );

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}
