import { getGoogleAccessToken } from "./oauth";

const SHEETS_API = "https://sheets.googleapis.com/v4";

export class GoogleSheetsService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async getSpreadsheet(spreadsheetId: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${SHEETS_API}/spreadsheets/${encodeURIComponent(spreadsheetId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Sheets API error: ${res.status}`);
        return res.json();
    }

    async getValues(spreadsheetId: string, range: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${SHEETS_API}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Sheets API error: ${res.status}`);
        return res.json();
    }

    async exportReport(spreadsheetId: string, range: string) {
        const data = await this.getValues(spreadsheetId, range);
        return data.values as string[][];
    }
}
