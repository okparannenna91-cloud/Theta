import { getGoogleAccessToken } from "./oauth";

const CHAT_API = "https://chat.googleapis.com/v1";

export class GoogleChatService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async sendMessage(spaceName: string, text: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${CHAT_API}/${spaceName}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`Google Chat API error: ${res.status}`);
        return res.json();
    }

    async listSpaces(pageSize: number = 50) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const params = new URLSearchParams({ pageSize: pageSize.toString() });
        const res = await fetch(`${CHAT_API}/spaces?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Chat API error: ${res.status}`);
        return res.json();
    }
}
