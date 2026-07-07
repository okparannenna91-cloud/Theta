import { getGoogleAccessToken } from "./oauth";

const DOCS_API = "https://docs.googleapis.com/v1";

export class GoogleDocsService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async createDocument(title: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${DOCS_API}/documents`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error(`Google Docs API error: ${res.status}`);
        const doc = await res.json();
        return { documentId: doc.documentId, title: doc.title, url: `https://docs.google.com/document/d/${doc.documentId}` };
    }

    async getDocument(documentId: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${DOCS_API}/documents/${encodeURIComponent(documentId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Docs API error: ${res.status}`);
        return res.json();
    }
}
