import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getFormStats, getForm } from "@/lib/services/forms-service";

export async function GET(
  _req: Request,
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

    const stats = await getFormStats(params.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Get form stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
