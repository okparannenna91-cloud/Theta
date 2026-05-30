import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exchangeSlackCode } from "@/lib/integrations/slack";
import { prisma } from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/workspace";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
        }

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
            console.error("Slack OAuth returned error:", error);
            return NextResponse.redirect(new URL("/dashboard?error=slack_connection_failed", process.env.NEXT_PUBLIC_APP_URL));
        }

        if (!code || !state) {
            return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
        }

        // Decode state to get workspaceId
        let workspaceId: string;
        try {
            const decodedState = JSON.parse(Buffer.from(state, "base64").toString());
            workspaceId = decodedState.workspaceId;
        } catch (e) {
            console.error("Invalid state parameter:", state);
            return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
        }

        // Final security check: ensure user is admin of target workspace
        const isAdmin = await isWorkspaceAdmin(user.id, workspaceId);
        if (!isAdmin) {
            return NextResponse.json({ error: "You must be an admin to connect integrations" }, { status: 403 });
        }

        // Exchange code for access token
        const slackData = await exchangeSlackCode(code);

        // Store integration in DB
        // We look for existing integration to update, or create new
        const existingIntegration = await prisma.integration.findFirst({
            where: {
                workspaceId,
                type: "slack",
            }
        });

        if (existingIntegration) {
            await prisma.integration.update({
                where: { id: existingIntegration.id },
                data: {
                    accessToken: slackData.access_token,
                    config: {
                        teamId: slackData.team.id,
                        teamName: slackData.team.name,
                        botUserId: slackData.bot_user_id,
                        scope: slackData.scope,
                    },
                    refreshToken: undefined // Slack bots typically use non-expiring tokens unless token rotation is enabled
                }
            });
        } else {
            await prisma.integration.create({
                data: {
                    type: "slack",
                    workspaceId,
                    accessToken: slackData.access_token,
                    config: {
                        teamId: slackData.team.id,
                        teamName: slackData.team.name,
                        botUserId: slackData.bot_user_id,
                        scope: slackData.scope,
                    }
                }
            });
        }

        // Redirect back to dashboard with success
        return NextResponse.redirect(new URL(`/dashboard/${workspaceId}/settings?success=slack_connected`, process.env.NEXT_PUBLIC_APP_URL));

    } catch (error) {
        console.error("Slack callback handler error:", error);
        return NextResponse.redirect(new URL("/dashboard?error=slack_connection_error", process.env.NEXT_PUBLIC_APP_URL));
    }
}
