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
 * Send a notification to Slack
 * This is a stub - implement full Slack API integration
 */
export async function sendSlackNotification(
    accessToken: string,
    channel: string,
    message: string
): Promise<void> {
    try {
        const response = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                channel,
                text: message,
            }),
        });

        const data = await response.json();

        if (!data.ok) {
            console.error("Slack API error:", data.error);
            throw new Error(data.error);
        }
    } catch (error) {
        console.error("Failed to send Slack notification:", error);
        throw error;
    }
}
