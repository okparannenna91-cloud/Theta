import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exchangeSlackCode } from "@/lib/integrations/slack";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { isWorkspaceAdmin } from "@/lib/workspace";
import { getAppUrl } from "@/lib/app-url";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.redirect(new URL("/sign-in", getAppUrl()));
        }

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
            console.error("Slack OAuth returned error:", error);
            return NextResponse.redirect(new URL("/apps?status=error&provider=slack", getAppUrl()));
        }

        if (!code || !state) {
            return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
        }

        // Decode and verify signed state to prevent CSRF
        let workspaceId: string;
        let codeVerifier: string | undefined;
        try {
            const { verifyOAuthState } = await import("@/lib/crypto");
            const payload = verifyOAuthState(state);
            workspaceId = payload.workspaceId;
            codeVerifier = payload.codeVerifier as string | undefined;
        } catch (e) {
            console.error("Invalid state parameter:", state);
            return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
        }

        // Final security check: ensure user is admin of target workspace
        const isAdmin = await isWorkspaceAdmin(user.id, workspaceId);
        if (!isAdmin) {
            return NextResponse.json({ error: "You must be an admin to connect integrations" }, { status: 403 });
        }

        // Exchange code for access token (with PKCE code_verifier if available)
        const slackData = await exchangeSlackCode(code, codeVerifier);

        // Store integration in DB with refresh token for token rotation support
        const expiresAt = slackData.expires_in ? new Date(Date.now() + slackData.expires_in * 1000) : null;

        // We look for existing integration to update, or create new
        const existingIntegration = await prisma.integration.findFirst({
            where: {
                workspaceId,
                provider: "slack",
            }
        });

        if (existingIntegration) {
            await prisma.integration.update({
                where: { id: existingIntegration.id },
                data: {
                    accessToken: encrypt(slackData.access_token),
                    refreshToken: slackData.refresh_token ? encrypt(slackData.refresh_token) : undefined,
                    // @ts-ignore
                    expiresAt,
                    config: {
                        teamId: slackData.team.id,
                        teamName: slackData.team.name,
                        botUserId: slackData.bot_user_id,
                        scope: slackData.scope,
                    },
                }
            });
        } else {
            await prisma.integration.create({
                data: {
                    provider: "slack",
                    workspaceId,
                    accessToken: encrypt(slackData.access_token),
                    refreshToken: slackData.refresh_token ? encrypt(slackData.refresh_token) : null,
                    // @ts-ignore
                    expiresAt,
                    config: {
                        teamId: slackData.team.id,
                        teamName: slackData.team.name,
                        botUserId: slackData.bot_user_id,
                        scope: slackData.scope,
                    }
                }
            });
        }

        // Redirect back to the apps page (popup flow closes and refreshes)
        return NextResponse.redirect(new URL("/apps?status=success&provider=slack", getAppUrl()));

    } catch (error) {
        console.error("Slack callback handler error:", error);
        return NextResponse.redirect(new URL("/apps?status=error&provider=slack", getAppUrl()));
    }
}
