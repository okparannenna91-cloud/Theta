import { getGoogleAccessToken } from "./oauth";

const PEOPLE_API = "https://people.googleapis.com/v1";

export class GoogleContactsService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async listConnections(pageSize: number = 100) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const params = new URLSearchParams({
            pageSize: pageSize.toString(),
            personFields: "names,emailAddresses,phoneNumbers,organizations,photos",
        });
        const res = await fetch(`${PEOPLE_API}/people/me/connections?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google People API error: ${res.status}`);
        return res.json();
    }

    async syncContacts() {
        const data = await this.listConnections();
        const contacts = (data.connections || []).map((person: any) => ({
            resourceName: person.resourceName,
            name: person.names?.[0]?.displayName || "Unknown",
            email: person.emailAddresses?.[0]?.value || null,
            phone: person.phoneNumbers?.[0]?.value || null,
            organization: person.organizations?.[0]?.name || null,
            photoUrl: person.photos?.[0]?.url || null,
        }));
        return contacts;
    }
}
