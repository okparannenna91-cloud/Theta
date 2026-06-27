import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { invoiceService } from "@/lib/billing/services/invoice-service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const result = await invoiceService.listForWorkspace(workspaceId, limit, offset);

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("[List Invoices] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
