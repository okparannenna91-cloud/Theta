/**
 * Slack integration foundation
 * This provides the structure for Slack OAuth and notifications
 */

export interface SlackConfig {
    teamId: string;
    teamName: string;
    channelId?: string;
    channelName?: string;
}

// Basic Slack OAuth scopes for a bot
const SLACK_SCOPES = [
    "chat:write",
    "channels:read",
    "groups:read",
    "commands"
].join(",");

export function getSlackAuthUrl(workspaceId: string): string {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`;
    // We pass the workspaceId in the state so we know which workspace to link the token to on callback
    const state = Buffer.from(JSON.stringify({ workspaceId })).toString("base64");

    return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${SLACK_SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
}

/**
 * Exchange the temporary code from Slack for an access token
 */
export async function exchangeSlackCode(code: string): Promise<any> {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`;

    const formData = new URLSearchParams();
    formData.append("code", code);
    formData.append("client_id", clientId!);
    formData.append("client_secret", clientSecret!);
    formData.append("redirect_uri", redirectUri);

    const response = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
    });

    const data = await response.json();

    if (!data.ok) {
        console.error("Slack OAuth exchange failed:", data.error);
        throw new Error(data.error || "Failed to exchange Slack code");
    }

    return data;
}

/**
 * Send a notification to a specific workspace if they have Slack integrated
 */
export async function notifyWorkspace(
    workspaceId: string,
    message: string,
    title?: string
): Promise<void> {
    try {
        const { prisma } = await import("@/lib/prisma");
        const integration = await prisma.integration.findFirst({
            where: {
                workspaceId,
                type: "slack",   // Integration model uses `type` not `provider`
            },
        });

        if (!integration || !integration.accessToken) return;

        const config = integration.config as any;
        const channel = config?.channelId || config?.channel || "general";

        if (!channel) return;

        // Richly formatted message with blocks
        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: title ? `*${title}*\n${message}` : message,
                },
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Sent from *Theta Platform* at ${new Date().toLocaleTimeString()}`,
                    },
                ],
            },
        ];

        const response = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${integration.accessToken}`,
            },
            body: JSON.stringify({
                channel,
                text: title ? `${title}: ${message}` : message,
                blocks,
            }),
        });

        const data = await response.json();
        if (!data.ok) {
            console.error("Slack notification error:", data.error);
        }
    } catch (error) {
        console.error("Failed to notify workspace via Slack:", error);
    }
}
