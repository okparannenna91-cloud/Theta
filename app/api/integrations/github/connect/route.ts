import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { enforcePlanLimit } from "@/lib/plan-limits";

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

    // Configuration for GitHub OAuth
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/github/callback`;
    const scopes = "repo,user,read:org";

    // We pass the workspaceId in the state to link the account on callback
    const state = Buffer.from(JSON.stringify({ workspaceId })).toString("base64");

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}`;

    return NextResponse.redirect(authUrl);
}
