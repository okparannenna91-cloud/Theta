import { getPrismaClient } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

const ASANA_API_URL = "https://app.asana.com/api/1.0";

export class AsanaService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    private async getAccessToken(): Promise<string> {
        const prisma = getPrismaClient(this.workspaceId);
        const integration = await prisma.integration.findFirst({
            where: {
                workspaceId: this.workspaceId,
                // @ts-ignore
                provider: "asana",
            },
        });

        if (!integration || !integration.accessToken) {
            throw new Error("Asana integration not found");
        }

        // @ts-ignore
        if (integration.expiresAt && new Date() > integration.expiresAt) {
            // @ts-ignore
            return this.refreshAccessToken(integration.id, integration.refreshToken!);
        }

        return decrypt(integration.accessToken!);
    }

    private async refreshAccessToken(integrationId: string, refreshTokenStr: string): Promise<string> {
        const prisma = getPrismaClient(this.workspaceId);
        const refreshToken = decrypt(refreshTokenStr);

        const response = await fetch("https://app.asana.com/-/oauth_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: process.env.ASANA_CLIENT_ID!,
                client_secret: process.env.ASANA_CLIENT_SECRET!,
                refresh_token: refreshToken,
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(`Asana Refresh Error: ${data.error}`);

        const { access_token, expires_in } = data;
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        await prisma.integration.update({
            where: { id: integrationId },
            data: {
                accessToken: encrypt(access_token),
                // @ts-ignore
                expiresAt,
            },
        });

        return access_token;
    }

    async getProjects() {
        const token = await this.getAccessToken();
        const response = await fetch(`${ASANA_API_URL}/projects`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return (await response.json()).data;
    }

    async getTasks(projectGid: string) {
        const token = await this.getAccessToken();
        const response = await fetch(`${ASANA_API_URL}/projects/${projectGid}/tasks?opt_fields=name,completed,due_on,notes`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return (await response.json()).data;
    }
}
