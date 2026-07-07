import { getGoogleAccessToken } from "./oauth";

const SLIDES_API = "https://slides.googleapis.com/v1";

export class GoogleSlidesService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async createPresentation(title: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${SLIDES_API}/presentations`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error(`Google Slides API error: ${res.status}`);
        const presentation = await res.json();
        return {
            presentationId: presentation.presentationId,
            title: presentation.title,
            url: `https://docs.google.com/presentation/d/${presentation.presentationId}`,
        };
    }

    async getPresentation(presentationId: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${SLIDES_API}/presentations/${encodeURIComponent(presentationId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Slides API error: ${res.status}`);
        return res.json();
    }
}
