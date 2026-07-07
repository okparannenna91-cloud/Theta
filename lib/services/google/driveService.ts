import { getGoogleAccessToken } from "./oauth";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export class GoogleDriveService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async listFiles(pageSize: number = 20, query?: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const params = new URLSearchParams({
            pageSize: pageSize.toString(),
            fields: "files(id,name,mimeType,webViewLink,size,createdTime,modifiedTime)",
        });
        if (query) params.set("q", query);
        const res = await fetch(`${DRIVE_API}/files?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Drive API error: ${res.status}`);
        return res.json();
    }

    async uploadFile(name: string, mimeType: string, body: Blob | Buffer, parentId?: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const metadata: any = { name, mimeType };
        if (parentId) metadata.parents = [parentId];

        const form = new FormData();
        form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
        form.append("file", body instanceof Blob ? body : new Blob([(body as any).buffer ?? body as any], { type: mimeType }));

        const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink,mimeType`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        if (!res.ok) throw new Error(`Google Drive upload error: ${res.status}`);
        return res.json();
    }

    async downloadFile(fileId: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Drive download error: ${res.status}`);
        return res.blob();
    }

    async getFile(fileId: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,webViewLink,size,createdTime,modifiedTime,owners`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Drive API error: ${res.status}`);
        return res.json();
    }
}
