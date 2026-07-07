import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, verifyOAuthState } from "@/lib/crypto";
import { exchangeGoogleCode } from "@/lib/services/google/oauth";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
        console.error("Google OAuth error:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&status=error&provider=google`);
    }

    if (!code || !state) {
        return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    try {
        let workspaceId: string;
        let codeVerifier: string | undefined;
        try {
            const payload = verifyOAuthState(state);
            workspaceId = payload.workspaceId;
            codeVerifier = payload.codeVerifier as string | undefined;
        } catch {
            return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
        }

        if (!workspaceId) {
            return NextResponse.json({ error: "Invalid state" }, { status: 400 });
        }

        const data = await exchangeGoogleCode(code, codeVerifier);

        const { access_token, refresh_token, expires_in } = data;
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

        const integration = await prisma.integration.upsert({
            where: {
                id: (await prisma.integration.findFirst({
                    where: { workspaceId, provider: "google" }
                }))?.id || "unfound-id-placeholder"
            },
            update: {
                accessToken: encrypt(access_token),
                refreshToken: refresh_token ? encrypt(refresh_token) : undefined,
                // @ts-ignore
                expiresAt,
                updatedAt: new Date(),
                config: { scopes: data.scope },
            },
            create: {
                workspaceId,
                // @ts-ignore
                provider: "google",
                accessToken: encrypt(access_token),
                refreshToken: refresh_token ? encrypt(refresh_token) : null,
                // @ts-ignore
                expiresAt,
                config: { scopes: data.scope },
            },
        });

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&status=success&provider=google`);
    } catch (error) {
        console.error("Google callback error:", error);
        return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
}
