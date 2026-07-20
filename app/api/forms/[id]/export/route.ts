import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { exportFormResponses, getForm } from "@/lib/services/forms-service";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await getForm(params.id);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, (form as any).workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") as "csv" | "json") ?? "json";

    if (format !== "csv" && format !== "json") {
      return NextResponse.json(
        { error: "format must be 'csv' or 'json'" },
        { status: 400 },
      );
    }

    const data = await exportFormResponses(params.id, format);
    const contentType = format === "csv" ? "text/csv" : "application/json";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="form-responses.${format}"`,
      },
    });
  } catch (error) {
    console.error("Export form responses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
