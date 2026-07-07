import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforcePlanLimit } from "@/lib/plan-limits";
import { getGoogleAuthUrl } from "@/lib/services/google/oauth";

export async function GET(request: NextRequest) {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
        return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    try {
        const currentCount = await prisma.integration.count({
            where: { workspaceId }
        });
        await enforcePlanLimit(workspaceId, "integrations", currentCount);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const { url } = getGoogleAuthUrl(workspaceId);

    return NextResponse.redirect(url);
}
