import { getPrismaClient } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

const BITBUCKET_API_URL = "https://api.bitbucket.org/2.0";

export class BitbucketService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    private async getIntegration() {
        const prisma = getPrismaClient(this.workspaceId);
        const integration = await prisma.integration.findFirst({
            where: {
                workspaceId: this.workspaceId,
                // @ts-ignore
                provider: "bitbucket",
            },
        });

        if (!integration || !integration.accessToken) {
            throw new Error("Bitbucket integration not found or missing access token");
        }

        return integration;
    }

    private async getAccessToken(): Promise<string> {
        const integration = await this.getIntegration();

        // @ts-ignore
        if (integration.expiresAt && new Date() > integration.expiresAt) {
            // @ts-ignore
            return this.refreshAccessToken(integration.id, integration.refreshToken!);
        }

        return decrypt(integration.accessToken!);
    }

    private async refreshAccessToken(integrationId: string, refreshTokenStr: string): Promise<string> {
        const prisma = getPrismaClient(this.workspaceId);

        const clientId = process.env.BITBUCKET_CLIENT_ID;
        const clientSecret = process.env.BITBUCKET_CLIENT_SECRET;
        const refreshToken = decrypt(refreshTokenStr);

        const params = new URLSearchParams();
        params.append("grant_type", "refresh_token");
        params.append("refresh_token", refreshToken);

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
            throw new Error(`Failed to refresh Bitbucket token: ${data.error_description || data.error}`);
        }

        const { access_token, refresh_token, expires_in } = data;
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

        await prisma.integration.update({
            where: { id: integrationId },
            data: {
                accessToken: encrypt(access_token),
                refreshToken: refresh_token ? encrypt(refresh_token) : undefined,
                // @ts-ignore
                expiresAt,
            },
        });

        return access_token;
    }

    async getRepositories() {
        const token = await this.getAccessToken();

        const response = await fetch(`${BITBUCKET_API_URL}/repositories?role=member`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Bitbucket API Error: ${response.statusText}`);
        }

        return response.json();
    }

    async getPullRequests(workspace: string, repo: string) {
        const token = await this.getAccessToken();

        const response = await fetch(`${BITBUCKET_API_URL}/repositories/${workspace}/${repo}/pullrequests`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Bitbucket API Error: ${response.statusText}`);
        }

        return response.json();
    }
}
