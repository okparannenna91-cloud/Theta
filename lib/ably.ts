import * as Ably from "ably";

let ablyServerInstance: Ably.Rest | null = null;

/**
 * Get server-side Ably client
 */
export function getAblyServer(): Ably.Rest {
    if (!ablyServerInstance) {
        const apiKey = process.env.ABLY_API_KEY;

        if (!apiKey) {
            throw new Error("ABLY_API_KEY environment variable is not set");
        }

        ablyServerInstance = new Ably.Rest({ key: apiKey });
    }

    return ablyServerInstance;
}

/**
 * Generate channel name for workspace
 */
export function getWorkspaceChannel(workspaceId: string): string {
    return `workspace:${workspaceId}`;
}

/**
 * Generate channel name for project
 */
export function getProjectChannel(workspaceId: string, projectId: string): string {
    return `workspace:${workspaceId}:project:${projectId}`;
}

/**
 * Generate channel name for board
 */
export function getBoardChannel(workspaceId: string, boardId: string): string {
    return `workspace:${workspaceId}:board:${boardId}`;
}

/**
 * Generate channel name for chat
 */
export function getChatChannel(workspaceId: string, projectId?: string): string {
    if (projectId) {
        return `workspace:${workspaceId}:project:${projectId}:chat`;
    }
    return `workspace:${workspaceId}:chat`;
}

/**
 * Publish a message to a channel
 */
export async function publishToChannel(
    channelName: string,
    eventName: string,
    data: any
): Promise<void> {
    try {
        const ably = getAblyServer();
        const channel = ably.channels.get(channelName);
        await channel.publish(eventName, data);
    } catch (error) {
        console.error("Failed to publish to Ably:", error);
        // Don't throw - real-time features shouldn't break the main flow
    }
}
