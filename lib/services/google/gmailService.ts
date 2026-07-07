import { getGoogleAccessToken } from "./oauth";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export class GoogleGmailService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async sendEmail(to: string, subject: string, bodyText: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const utf8Bytes = new TextEncoder().encode(
            `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${bodyText}`
        );
        const base64Encoded = btoa(String.fromCharCode(...utf8Bytes))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const res = await fetch(`${GMAIL_API}/messages/send`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ raw: base64Encoded }),
        });
        if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
        return res.json();
    }

    async listLabels() {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${GMAIL_API}/labels`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
        return res.json();
    }

    async listMessages(maxResults: number = 20, labelIds?: string[]) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const params = new URLSearchParams({ maxResults: maxResults.toString() });
        if (labelIds?.length) labelIds.forEach(id => params.append("labelIds", id));
        const res = await fetch(`${GMAIL_API}/messages?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
        return res.json();
    }

    async getMessage(messageId: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${GMAIL_API}/messages/${encodeURIComponent(messageId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
        return res.json();
    }
}
