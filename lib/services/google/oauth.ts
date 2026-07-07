import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, signOAuthState, generateCodeVerifier, generateCodeChallenge } from "@/lib/crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/chat.messages.create",
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/forms.body.readonly",
    "https://www.googleapis.com/auth/forms.responses.readonly",
    "https://www.googleapis.com/auth/presentations",
].join(" ");

export function getGoogleAuthUrl(workspaceId: string): { url: string; codeVerifier: string } {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`;

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const state = signOAuthState({ workspaceId, codeVerifier });

    const url = `${GOOGLE_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(GOOGLE_SCOPES)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&access_type=offline&prompt=consent`;

    return { url, codeVerifier };
}

export async function exchangeGoogleCode(code: string, codeVerifier?: string): Promise<any> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`;

    const body: Record<string, string> = {
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
    };

    if (codeVerifier) {
        body.code_verifier = codeVerifier;
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
    });

    const data = await response.json();

    if (data.error) {
        console.error("Google OAuth exchange failed:", data.error, data.error_description);
        throw new Error(data.error_description || data.error);
    }

    return data;
}

export async function refreshGoogleToken(integrationId: string, refreshToken: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const body = new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    const data = await response.json();

    if (data.error) {
        console.error("Google token refresh failed:", data.error, data.error_description);
        throw new Error(`Google token refresh failed: ${data.error}`);
    }

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

export async function getGoogleAccessToken(workspaceId: string): Promise<string> {
    const integration = await prisma.integration.findFirst({
        where: {
            workspaceId,
            provider: "google",
        },
    });

    if (!integration || !integration.accessToken) {
        throw new Error("Google integration not found");
    }

    if (integration.expiresAt && new Date() > integration.expiresAt) {
        return refreshGoogleToken(integration.id, decrypt(integration.refreshToken!));
    }

    return decrypt(integration.accessToken);
}

export async function revokeGoogleToken(workspaceId: string): Promise<void> {
    const token = await getGoogleAccessToken(workspaceId);
    try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: "POST" });
    } catch {
        // Revocation is best-effort
    }
}
