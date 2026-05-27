import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MeetingIntelligence, MEETING_PHASES } from "@/lib/nova/meeting-intelligence";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phase = searchParams.get("phase");

    if (phase) {
      const phaseDef = MEETING_PHASES.find(p => p.phase === phase.toUpperCase());
      if (!phaseDef) {
        return NextResponse.json({ error: `Phase "${phase}" not found. Valid: PRE_MEETING, LIVE_MEETING, POST_MEETING` }, { status: 404 });
      }
      return NextResponse.json({ data: phaseDef });
    }

    return NextResponse.json({
      phases: MeetingIntelligence.getMeetingPhases(),
      totalPhases: MEETING_PHASES.length,
    });
  } catch (error: any) {
    console.error("[Meetings API] GET error:", error);
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
    const { action, topic, description, transcript } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required (prepare or parse)" }, { status: 400 });
    }

    if (action === "prepare") {
      if (!topic) {
        return NextResponse.json({ error: "topic is required for prepare action" }, { status: 400 });
      }
      const preparation = MeetingIntelligence.prepareAgenda(topic, description);
      return NextResponse.json({ success: true, data: preparation });
    }

    if (action === "parse") {
      if (!transcript) {
        return NextResponse.json({ error: "transcript is required for parse action" }, { status: 400 });
      }
      const brief = MeetingIntelligence.parsePostBrief(transcript);
      return NextResponse.json({ success: true, data: brief });
    }

    return NextResponse.json({ error: `Unknown action "${action}". Valid: prepare, parse` }, { status: 400 });
  } catch (error: any) {
    console.error("[Meetings API] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
