import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { enforcePlanLimit } from "@/lib/plan-limits";
import { signOAuthState } from "@/lib/crypto";

export async function GET(request: NextRequest) {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
        return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    try {
        const prisma = getPrismaClient(workspaceId);
        const currentCount = await prisma.integration.count({
            where: { workspaceId }
        });

        await enforcePlanLimit(workspaceId, "integrations", currentCount);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const clientId = process.env.ASANA_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/asana/callback`;

    // Pass workspaceId in the state (HMAC-signed to prevent CSRF)
    const state = signOAuthState({ workspaceId });

    const authUrl = `https://app.asana.com/-/oauth_authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;

    return NextResponse.redirect(authUrl);
}
