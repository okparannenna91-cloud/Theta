import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filter = searchParams.get("filter") || "active";
    const insights = await prisma.proactiveInsight.findMany({
      where: {
        workspaceId,
        ...(filter === "active"
          ? { dismissed: false }
          : filter === "dismissed"
          ? { dismissed: true }
          : {}),
      },
      orderBy: [{ dismissed: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ insights });
  } catch (error: any) {
    console.error("Nova insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
