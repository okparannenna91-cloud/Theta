import { getGoogleAccessToken } from "./oauth";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export class GoogleCalendarService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async listEvents(calendarId: string = "primary", maxResults: number = 50, timeMin?: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const params = new URLSearchParams({
            maxResults: maxResults.toString(),
            orderBy: "startTime",
            singleEvents: "true",
        });
        if (timeMin) params.set("timeMin", timeMin);
        const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);
        return res.json();
    }

    async createEvent(calendarId: string = "primary", event: {
        summary: string; description?: string; start: { dateTime: string; timeZone?: string };
        end: { dateTime: string; timeZone?: string }; location?: string;
    }) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(event),
        });
        if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);
        return res.json();
    }

    async updateEvent(calendarId: string = "primary", eventId: string, event: any) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(event),
        });
        if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);
        return res.json();
    }

    async deleteEvent(calendarId: string = "primary", eventId: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);
    }

    async createMeetLink(summary: string, startDateTime: string, endDateTime: string, timeZone?: string) {
        const token = await getGoogleAccessToken(this.workspaceId);
        const event = {
            summary,
            start: { dateTime: startDateTime, timeZone: timeZone || "UTC" },
            end: { dateTime: endDateTime, timeZone: timeZone || "UTC" },
            conferenceData: {
                createRequest: {
                    requestId: crypto.randomUUID(),
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                },
            },
        };
        const res = await fetch(`${CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(event),
        });
        if (!res.ok) throw new Error(`Google Meet API error: ${res.status}`);
        const data = await res.json();
        return {
            eventId: data.id,
            hangoutLink: data.hangoutLink,
            conferenceData: data.conferenceData,
        };
    }
}
