import { getPrismaClient } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

const GITHUB_API_URL = "https://api.github.com";

export class GitHubService {
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
                provider: "github",
            },
        });

        if (!integration || !integration.accessToken) {
            throw new Error("GitHub integration not found or missing access token");
        }

        return integration;
    }

    private async getAccessToken(): Promise<string> {
        const integration = await this.getIntegration();

        // Logic for refreshing token if expired
        // @ts-ignore
        if (integration.expiresAt && new Date() > integration.expiresAt) {
            // @ts-ignore
            return this.refreshAccessToken(integration.id, integration.refreshToken!);
        }

        return decrypt(integration.accessToken!);
    }

    private async refreshAccessToken(integrationId: string, refreshTokenStr: string): Promise<string> {
        const prisma = getPrismaClient(this.workspaceId);

        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        const refreshToken = decrypt(refreshTokenStr);

        const response = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`Failed to refresh GitHub token: ${data.error_description || data.error}`);
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

    /**
     * Fetch all repositories for the authenticated user
     */
    async getRepositories() {
        const token = await this.getAccessToken();

        const response = await fetch(`${GITHUB_API_URL}/user/repos?sort=updated&per_page=100`, {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`GitHub API Error: ${error.message || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetch recent commits for a repository
     */
    async getCommits(owner: string, repo: string) {
        const token = await this.getAccessToken();

        const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/commits?per_page=10`, {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`GitHub API Error: ${error.message || response.statusText}`);
        }

        return response.json();
    }
}
