import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforcePlanLimit } from "@/lib/plan-limits";
import { signOAuthState } from "@/lib/crypto";

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

    // Configuration for GitHub OAuth
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/github/callback`;
    const scopes = "repo,user,read:org";

    // We pass the workspaceId in the state (HMAC-signed to prevent CSRF)
    const state = signOAuthState({ workspaceId });

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}`;

    return NextResponse.redirect(authUrl);
}
