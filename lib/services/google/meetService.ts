import { getGoogleAccessToken } from "./oauth";

export class GoogleMeetService {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    async createMeetingLink(summary: string, startDateTime: string, endDateTime: string, timeZone?: string) {
        const { GoogleCalendarService } = await import("./calendarService");
        const cal = new GoogleCalendarService(this.workspaceId);
        const result = await cal.createMeetLink(summary, startDateTime, endDateTime, timeZone);
        return {
            meetingLink: result.hangoutLink,
            eventId: result.eventId,
            conferenceData: result.conferenceData,
        };
    }
}
