import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { exportData, type ExportType, type ExportFormat } from "@/lib/export/export-service";

const VALID_TYPES: ExportType[] = [
  "tasks", "projects", "boards", "documents", "chat", "activities", "time_logs", "analytics",
];
const VALID_FORMATS: ExportFormat[] = ["csv", "json", "pdf"];

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const type = searchParams.get("type") as ExportType | null;
    const format = (searchParams.get("format") || "json") as ExportFormat;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: `format must be one of: ${VALID_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const filters: Record<string, string> = {};
    for (const key of ["projectId", "status", "priority", "assigneeId", "startDate", "endDate"]) {
      const val = searchParams.get(key);
      if (val) filters[key] = val;
    }

    const result = await exportData({
      type,
      format,
      workspaceId,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });

    // Handle both string (CSV/JSON) and Buffer (PDF) responses
    const responseData = typeof result.data === "string" ? result.data : String(result.data);

    return new NextResponse(responseData, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Export-Count": String(result.count),
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
