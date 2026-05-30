import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code || !state) {
        return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    try {
        const { workspaceId } = JSON.parse(Buffer.from(state, "base64").toString());

        if (!workspaceId) {
            return NextResponse.json({ error: "Invalid state" }, { status: 400 });
        }

        // Exchange code for token
        const clientId = process.env.BITBUCKET_CLIENT_ID;
        const clientSecret = process.env.BITBUCKET_CLIENT_SECRET;

        const params = new URLSearchParams();
        params.append("grant_type", "authorization_code");
        params.append("code", code);

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        const response = await fetch("https://bitbucket.org/site/oauth2/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${auth}`,
            },
            body: params,
        });

        const data = await response.json();

        if (data.error) {
            console.error("Bitbucket OAuth exchange failed:", data.error);
            return NextResponse.json({ error: data.error_description || data.error }, { status: 400 });
        }

        const { access_token, refresh_token, expires_in } = data;
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

        const prisma = getPrismaClient(workspaceId);

        // Save or update the integration
        await prisma.integration.upsert({
            where: {
                id: (await prisma.integration.findFirst({
                    where: {
                        workspaceId,
                        // @ts-ignore
                        provider: "bitbucket"
                    }
                }))?.id || "unfound-id-placeholder"
            },
            update: {
                accessToken: encrypt(access_token),
                refreshToken: refresh_token ? encrypt(refresh_token) : null,
                // @ts-ignore
                expiresAt,
                updatedAt: new Date(),
            },
            create: {
                workspaceId,
                // @ts-ignore
                provider: "bitbucket",
                accessToken: encrypt(access_token),
                refreshToken: refresh_token ? encrypt(refresh_token) : null,
                // @ts-ignore
                expiresAt,
                config: {},
            },
        });

        // Redirect to settings
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&status=success&provider=bitbucket`);
    } catch (error) {
        console.error("Bitbucket callback error:", error);
        return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
}
