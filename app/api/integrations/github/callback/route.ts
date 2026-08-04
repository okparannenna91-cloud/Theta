import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, verifyOAuthState } from "@/lib/crypto";
import { getAppUrl } from "@/lib/app-url";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

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

        // Exchange code for token
        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        const redirectUri = getAppUrl("/api/integrations/github/callback");

        const tokenBody: Record<string, string> = {
            client_id: clientId!,
            client_secret: clientSecret!,
            code,
            redirect_uri: redirectUri,
        };

        // PKCE: include code_verifier in token exchange
        if (codeVerifier) {
            tokenBody.code_verifier = codeVerifier;
        }

        const response = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(tokenBody),
        });

        const data = await response.json();

        if (data.error) {
            console.error("GitHub OAuth exchange failed:", data.error);
            return NextResponse.json({ error: data.error_description || data.error }, { status: 400 });
        }

        const { access_token, refresh_token, expires_in } = data;
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

        const existingIntegration = await prisma.integration.findFirst({
            where: {
                workspaceId,
                // @ts-ignore
                provider: "github"
            }
        });

        // Save or update the integration
        if (existingIntegration) {
            await prisma.integration.update({
                where: { id: existingIntegration.id },
                data: {
                    accessToken: encrypt(access_token),
                    refreshToken: refresh_token ? encrypt(refresh_token) : null,
                    // @ts-ignore
                    expiresAt,
                    updatedAt: new Date(),
                },
            });
        } else {
            await prisma.integration.create({
                data: {
                    workspaceId,
                    // @ts-ignore
                    provider: "github",
                    accessToken: encrypt(access_token),
                    refreshToken: refresh_token ? encrypt(refresh_token) : null,
                    // @ts-ignore
                    expiresAt,
                    config: {},
                },
            });
        }

        // Redirect to frontend integrations page
        return NextResponse.redirect(getAppUrl("/settings?tab=integrations&status=success&provider=github"));
    } catch (error) {
        console.error("GitHub callback error:", error);
        return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
}
