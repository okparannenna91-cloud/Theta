import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const creditBalance = await prisma.creditBalance.findUnique({
      where: { workspaceId_currency: { workspaceId, currency: "USD" } },
    });

    return NextResponse.json({
      balance: creditBalance?.balance ?? 0,
      currency: creditBalance?.currency ?? "USD",
    });
  } catch (error: any) {
    logger.error("[Credit Balance] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
