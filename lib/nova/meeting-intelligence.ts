import { getPrismaClient } from "../prisma";
import { MEETING_PHASES, type MeetingPhase } from "./constitution/meeting-standards";

export { MEETING_PHASES, type MeetingPhase } from "./constitution/meeting-standards";

export interface MeetingPreparation {
  topic: string;
  phase: MeetingPhase;
  agendaItems: string[];
  suggestedParticipants: string[];
  referenceDocuments: string[];
  contextQuestions: string[];
}

export interface MeetingPostBrief {
  summary: string;
  decisions: string[];
  actionItems: Array<{ title: string; assignee?: string; priority: string }>;
  decisionsCount: number;
  actionItemsCount: number;
}

export class MeetingIntelligence {
  public static prepareAgenda(topic: string, description?: string): MeetingPreparation {
    const agendaItems = [
      `Align on milestone objectives for: ${topic}`,
      "Review outstanding task priority list",
      "Highlight blockers and resource constraints",
      "Assign follow-up action items",
    ];

    const suggestedParticipants = ["Owner", "Lead Engineer", "Product Manager"];
    const referenceDocuments: string[] = [];
    const contextQuestions: string[] = [
      "What progress has been made since the last sync?",
      "Are there any blockers preventing task completion?",
      "What are the priorities for the next period?",
    ];

    if (description?.toLowerCase().includes("tech") || topic.toLowerCase().includes("api")) {
      agendaItems.unshift("Review architecture guidelines and schema changes");
      suggestedParticipants.push("QA Specialist");
      contextQuestions.push("Are there any technical dependencies to be aware of?");
    }

    if (description?.toLowerCase().includes("sprint") || topic.toLowerCase().includes("sprint")) {
      agendaItems.push("Review sprint velocity and capacity");
      suggestedParticipants.push("Scrum Master");
      contextQuestions.push("What is the team's capacity for the upcoming sprint?");
    }

    return {
      topic,
      phase: "PRE_MEETING",
      agendaItems,
      suggestedParticipants,
      referenceDocuments,
      contextQuestions,
    };
  }

  public static parsePostBrief(transcript: string): MeetingPostBrief {
    const decisions: string[] = [];
    const actionItems: Array<{ title: string; assignee?: string; priority: string }> = [];

    const lines = transcript.split("\n");
    for (const line of lines) {
      const clean = line.trim();
      const lower = clean.toLowerCase();

      if (lower.includes("decision:") || lower.includes("we decided to") || lower.includes("agreed:")) {
        decisions.push(clean.replace(/^(decision:|we decided to|agreed:)/i, "").trim());
      } else if (lower.includes("todo:") || lower.includes("action item:") || lower.includes("will take on")) {
        let assignee: string | undefined;
        let title = clean.replace(/^(todo:|action item:|will take on)/i, "").trim();

        if (title.includes(":")) {
          const parts = title.split(":");
          assignee = parts[0].trim();
          title = parts.slice(1).join(":").trim();
        }

        actionItems.push({
          title,
          assignee,
          priority: lower.includes("urgent") || lower.includes("asap") ? "high" : "medium",
        });
      }
    }

    return {
      summary: `Parsed sync notes. Identified ${decisions.length} decisions and ${actionItems.length} follow-up actions.`,
      decisions,
      actionItems,
      decisionsCount: decisions.length,
      actionItemsCount: actionItems.length,
    };
  }

  public static getMeetingPhases() {
    return MEETING_PHASES;
  }

  public static async createMeeting(
    workspaceId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      topic?: string;
      agendaItems?: string[];
      participants?: string[];
      contextQuestions?: string[];
    }
  ): Promise<string | null> {
    try {
      const db = getPrismaClient(workspaceId);
      const meeting = await db.meeting.create({
        data: {
          workspaceId,
          userId,
          title: data.title,
          description: data.description,
          topic: data.topic,
          agendaItems: data.agendaItems || [],
          participants: data.participants || [],
          contextQuestions: data.contextQuestions || [],
        },
      });
      return meeting.id;
    } catch (error) {
      console.warn("[MeetingIntelligence] Failed to create meeting:", error);
      return null;
    }
  }

  public static async updateMeeting(
    workspaceId: string,
    meetingId: string,
    data: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const db = getPrismaClient(workspaceId);
      await db.meeting.update({ where: { id: meetingId }, data });
      return true;
    } catch (error) {
      console.warn("[MeetingIntelligence] Failed to update meeting:", error);
      return false;
    }
  }

  public static async getMeeting(
    workspaceId: string,
    meetingId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const db = getPrismaClient(workspaceId);
      return await db.meeting.findUnique({ where: { id: meetingId } });
    } catch (error) {
      console.warn("[MeetingIntelligence] Failed to get meeting:", error);
      return null;
    }
  }

  public static async listMeetings(
    workspaceId: string,
    options: { phase?: string; limit?: number } = {}
  ): Promise<Array<{ id: string; title: string; status: string; phase: string; createdAt: Date }>> {
    try {
      const db = getPrismaClient(workspaceId);
      return await db.meeting.findMany({
        where: {
          workspaceId,
          ...(options.phase ? { phase: options.phase } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: options.limit || 50,
        select: { id: true, title: true, status: true, phase: true, createdAt: true },
      });
    } catch (error) {
      console.warn("[MeetingIntelligence] Failed to list meetings:", error);
      return [];
    }
  }
}
