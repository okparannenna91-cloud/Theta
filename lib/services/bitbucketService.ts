import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

const BITBUCKET_API_URL = "https://api.bitbucket.org/2.0";

export class BitbucketService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    private async getIntegration() {
        
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

        // CHANGE-2770 (April 14, 2026): Bitbucket removed cross-workspace
        // GET /2.0/repositories?role=member (now 410 Gone).
        // Replacement: list workspaces the user is member of, then list
        // repositories per workspace. See:
        // https://developer.atlassian.com/cloud/bitbucket/changelog#CHANGE-2770
        const workspaces = await this.getWorkspaces(token);
        if (workspaces.length === 0) {
            return { values: [] };
        }

        const allRepos: any[] = [];
        for (const workspace of workspaces) {
            const repos = await this.getRepositoriesForWorkspace(token, workspace);
            allRepos.push(...repos);
        }

        // Keep shape compatible with sync route: { values: [...] }
        return { values: allRepos, pagelen: allRepos.length, size: allRepos.length, page: 1 };
    }

    private async getWorkspaces(token: string): Promise<string[]> {
        // Try endpoints in order:
        // 1) GET /2.0/workspaces?role=member (primary, documented)
        // 2) GET /2.0/user/workspaces (new cross-workspace endpoint per CHANGE-2770)
        const candidates = [
            `${BITBUCKET_API_URL}/workspaces?role=member&pagelen=100`,
            `${BITBUCKET_API_URL}/user/workspaces?pagelen=100`,
        ];

        for (const initialUrl of candidates) {
            let url: string | null = initialUrl;
            const collected: string[] = [];
            let attempted = false;
            let lastError: string | null = null;

            while (url) {
                attempted = true;
                const response: Response = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) {
                    let detail = response.statusText;
                    try {
                        const body: any = await response.clone().json();
                        detail = body?.error?.message || body?.error?.detail || body?.message || JSON.stringify(body);
                    } catch {
                        try { detail = await response.clone().text(); } catch {}
                    }
                    lastError = `Bitbucket API Error: ${response.status} ${detail}`;
                    // If first page of first candidate fails with 404/410, try next candidate
                    if (url === initialUrl) break;
                    throw new Error(lastError);
                }

                const data: any = await response.json();
                const values: any[] = data.values ?? [];
                for (const ws of values) {
                    if (ws.slug) collected.push(ws.slug);
                    else if (ws.workspace?.slug) collected.push(ws.workspace.slug);
                }
                url = data.next ?? null;
            }

            if (collected.length > 0) return collected;
            // If we got an empty list without error, still try next candidate
            if (attempted && collected.length === 0 && lastError === null) continue;
            // If first candidate errored, try next candidate
            if (lastError && initialUrl.includes("/workspaces?role")) continue;
            if (lastError) throw new Error(lastError);
        }

        return [];
    }

    private async getRepositoriesForWorkspace(token: string, workspace: string): Promise<any[]> {
        const repos: any[] = [];
        const wsEnc = encodeURIComponent(workspace);
        let url: string | null = `${BITBUCKET_API_URL}/repositories/${wsEnc}?pagelen=100&role=member`;

        while (url) {
            const response: Response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                // Some tokens/workspaces may not support role=member filter; fallback without it
                if (url.includes("role=member") && (response.status === 400 || response.status === 404)) {
                    url = `${BITBUCKET_API_URL}/repositories/${wsEnc}?pagelen=100`;
                    continue;
                }
                let detail = response.statusText;
                try {
                    const body: any = await response.clone().json();
                    detail = body?.error?.message || body?.error?.detail || body?.message || JSON.stringify(body);
                } catch {
                    try { detail = await response.clone().text(); } catch {}
                }
                throw new Error(`Bitbucket API Error: ${response.status} ${detail}`);
            }

            const data: any = await response.json();
            repos.push(...(data.values ?? []));
            url = data.next ?? null;
        }

        return repos;
    }

    async getPullRequests(workspace: string, repo: string) {
        const token = await this.getAccessToken();

        const response: Response = await fetch(`${BITBUCKET_API_URL}/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/pullrequests`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            let detail = response.statusText;
            try {
                const body: any = await response.clone().json();
                detail = body?.error?.message || body?.error?.detail || body?.message || JSON.stringify(body);
            } catch {
                try { detail = await response.clone().text(); } catch {}
            }
            throw new Error(`Bitbucket API Error: ${response.status} ${detail}`);
        }

        return response.json();
    }
}
