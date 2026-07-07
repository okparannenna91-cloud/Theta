import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, verifyOAuthState } from "@/lib/crypto";

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
        const clientId = process.env.ASANA_CLIENT_ID;
        const clientSecret = process.env.ASANA_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/asana/callback`;

        const tokenParams: Record<string, string> = {
            grant_type: "authorization_code",
            client_id: clientId!,
            client_secret: clientSecret!,
            redirect_uri: redirectUri,
            code: code,
        };

        // PKCE: include code_verifier in token exchange
        if (codeVerifier) {
            tokenParams.code_verifier = codeVerifier;
        }

        const response = await fetch("https://app.asana.com/-/oauth_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(tokenParams),
        });

        const data = await response.json();

        if (data.error) {
            console.error("Asana OAuth exchange failed:", data.error);
            return NextResponse.json({ error: data.error_description || data.error }, { status: 400 });
        }

        const { access_token, refresh_token, expires_in } = data;
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;



        // Save or update the integration
        await prisma.integration.upsert({
            where: {
                id: (await prisma.integration.findFirst({
                    where: {
                        workspaceId,
                        // @ts-ignore
                        provider: "asana"
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
                provider: "asana",
                accessToken: encrypt(access_token),
                refreshToken: refresh_token ? encrypt(refresh_token) : null,
                // @ts-ignore
                expiresAt,
                config: {},
            },
        });

        // Redirect back to dashboard
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&status=success&provider=asana`);
    } catch (error) {
        console.error("Asana callback error:", error);
        return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
}
