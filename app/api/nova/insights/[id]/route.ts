import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insight = await prisma.proactiveInsight.findUnique({
      where: { id: params.id },
    });

    if (!insight) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, insight.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dismissed = body.dismissed !== undefined ? !!body.dismissed : true;

    const updated = await prisma.proactiveInsight.update({
      where: { id: params.id },
      data: {
        dismissed,
        resolvedAt: dismissed ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Nova insight update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
