import { prisma } from "../prisma";
import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";
import { MEETING_PHASES, type MeetingPhase } from "./constitution/meeting-standards";

export { MEETING_PHASES, type MeetingPhase } from "./constitution/meeting-standards";

// ──────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────

export interface MeetingPreparation {
  topic: string;
  phase: MeetingPhase;
  agendaItems: string[];
  suggestedParticipants: string[];
  referenceDocuments: string[];
  contextQuestions: string[];
}

export interface MeetingTranscript {
  id: string;
  meetingId: string;
  text: string;
  language: string;
  duration: number;
  speakerCount: number;
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface MeetingPostBrief {
  summary: string;
  keyTopics: string[];
  decisions: string[];
  actionItems: Array<{
    title: string;
    assignee?: string;
    priority: "low" | "medium" | "high";
    dueDate?: string;
  }>;
  risks: string[];
  followUpQuestions: string[];
  decisionsCount: number;
  actionItemsCount: number;
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  segments?: TranscriptSegment[];
  language?: string;
  duration?: number;
  error?: string;
}

// ──────────────────────────────────────────────
//  Transcription Service (AssemblyAI)
// ──────────────────────────────────────────────

async function transcribeWithAssemblyAI(
  audioUrl: string,
): Promise<TranscriptionResult> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "ASSEMBLYAI_API_KEY not configured" };
  }

  try {
    // Submit transcription job
    const submitResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        auto_chapters: true,
        summarization: false,
      }),
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      return { success: false, error: `AssemblyAI submission failed: ${error}` };
    }

    const { id } = await submitResponse.json();

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { "Authorization": apiKey },
      });

      if (!pollResponse.ok) {
        return { success: false, error: "Failed to poll transcription status" };
      }

      const transcript = await pollResponse.json();

      if (transcript.status === "completed") {
        const segments: TranscriptSegment[] = (transcript.utterances || []).map((u: { start: number; end: number; text: string; speaker?: number }) => ({
          start: u.start / 1000,
          end: u.end / 1000,
          text: u.text,
          speaker: u.speaker ? `Speaker ${u.speaker}` : undefined,
        }));

        return {
          success: true,
          text: transcript.text,
          segments,
          language: transcript.language_code,
          duration: transcript.audio_duration,
        };
      }

      if (transcript.status === "error") {
        return { success: false, error: transcript.error || "Transcription failed" };
      }

      attempts++;
    }

    return { success: false, error: "Transcription timed out" };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown transcription error" };
  }
}

async function transcribeWithWhisper(
  audioUrl: string,
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "OPENAI_API_KEY not configured" };
  }

  try {
    // Download audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return { success: false, error: "Failed to download audio file" };
    }

    const audioBlob = await audioResponse.blob();
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.mp3");
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Whisper transcription failed: ${error}` };
    }

    const result = await response.json();

    return {
      success: true,
      text: result.text,
      segments: (result.segments || []).map((s: { start: number; end: number; text: string }) => ({
        start: s.start,
        end: s.end,
        text: s.text,
      })),
      language: result.language,
      duration: result.duration,
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown Whisper error" };
  }
}

// ──────────────────────────────────────────────
//  Meeting Intelligence Engine
// ──────────────────────────────────────────────

export class MeetingIntelligence {
  /**
   * Transcribe audio from URL using available provider
   */
  static async transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
    // Try AssemblyAI first, then Whisper
    if (process.env.ASSEMBLYAI_API_KEY) {
      const result = await transcribeWithAssemblyAI(audioUrl);
      if (result.success) return result;
      logger.warn("[MeetingIntelligence] AssemblyAI failed, trying Whisper:", result.error);
    }

    if (process.env.OPENAI_API_KEY) {
      return transcribeWithWhisper(audioUrl);
    }

    return { success: false, error: "No transcription API configured" };
  }

  /**
   * Generate meeting brief from transcript using LLM
   */
  static async generatePostBrief(transcript: string): Promise<MeetingPostBrief> {
    const prompt = `You are a meeting analyst. Analyze this meeting transcript and extract key information.

Transcript:
${transcript}

Respond with ONLY a valid JSON object:
{
  "summary": "2-3 sentence executive summary",
  "keyTopics": ["topic1", "topic2"],
  "decisions": ["decision1", "decision2"],
  "actionItems": [
    {
      "title": "action item description",
      "assignee": "person name or null",
      "priority": "low|medium|high",
      "dueDate": "YYYY-MM-DD or null"
    }
  ],
  "risks": ["risk1", "risk2"],
  "followUpQuestions": ["question1", "question2"]
}

Rules:
- Extract ALL action items mentioned
- Identify clear decisions made
- Note any risks or blockers mentioned
- Be specific and actionable
- Assign priority based on urgency keywords (urgent, ASAP, critical = high)`
;

    try {
      const response = await executeWithProvider(
        "gemini",
        "gemini-2.5-flash",
        "You are a JSON-only meeting analyst. Respond with valid JSON only.",
        prompt,
      );

      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        summary: parsed.summary || "Meeting completed.",
        keyTopics: parsed.keyTopics || [],
        decisions: parsed.decisions || [],
        actionItems: (parsed.actionItems || []).map((item: { title: string; assignee?: string; priority?: string; dueDate?: string }) => ({
          title: item.title,
          assignee: item.assignee || undefined,
          priority: item.priority || "medium",
          dueDate: item.dueDate || undefined,
        })),
        risks: parsed.risks || [],
        followUpQuestions: parsed.followUpQuestions || [],
        decisionsCount: (parsed.decisions || []).length,
        actionItemsCount: (parsed.actionItems || []).length,
      };
    } catch (error) {
      logger.warn("[MeetingIntelligence] LLM brief generation failed:", error);
      return this.parsePostBrief(transcript);
    }
  }

  /**
   * Auto-create tasks from meeting action items
   */
  static async createTasksFromActionItems(
    workspaceId: string,
    userId: string,
    meetingId: string,
    actionItems: MeetingPostBrief["actionItems"],
  ): Promise<string[]> {
    const taskIds: string[] = [];

    for (const item of actionItems) {
      try {
        // Try to find assignee by name
        let assigneeId = userId;
        if (item.assignee) {
          const member = await prisma.teamMember.findFirst({
            where: {
              team: { workspaceId },
              user: {
                name: { contains: item.assignee, mode: "insensitive" },
              },
            },
            select: { userId: true },
          });
          if (member) assigneeId = member.userId;
        }

        const task = await prisma.task.create({
          data: {
            title: item.title,
            description: `Auto-created from meeting action item`,
            status: "todo",
            priority: item.priority,
            workspaceId,
            projectId: "",
            userId: assigneeId,
            assigneeIds: [assigneeId],
            dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
          },
        });

        taskIds.push(task.id);
      } catch (error) {
        logger.warn("[MeetingIntelligence] Failed to create task:", error);
      }
    }

    return taskIds;
  }

  /**
   * Process a complete meeting: transcribe + analyze + create tasks
   */
  static async processMeeting(
    workspaceId: string,
    userId: string,
    meetingId: string,
    audioUrl: string,
  ): Promise<{
    success: boolean;
    transcript?: string;
    brief?: MeetingPostBrief;
    taskIds?: string[];
    error?: string;
  }> {
    // Update meeting status
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "processing", phase: "POST_MEETING" },
    });

    // Transcribe
    const transcription = await this.transcribeAudio(audioUrl);
    if (!transcription.success) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: "failed" },
      });
      return { success: false, error: transcription.error };
    }

    // Generate brief
    const brief = await this.generatePostBrief(transcription.text!);

    // Create tasks from action items
    const taskIds = await this.createTasksFromActionItems(
      workspaceId,
      userId,
      meetingId,
      brief.actionItems,
    );

    // Update meeting with results
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: "completed",
        phase: "POST_MEETING",
        summary: brief.summary,
        decisions: brief.decisions,
        actionItems: brief.actionItems,
        endedAt: new Date(),
      },
    });

    return {
      success: true,
      transcript: transcription.text,
      brief,
      taskIds,
    };
  }

  /**
   * Prepare meeting agenda (template-based fallback)
   */
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

  /**
   * Parse post brief from text (fallback for no LLM)
   */
  public static parsePostBrief(transcript: string): MeetingPostBrief {
    const decisions: string[] = [];
    const actionItems: MeetingPostBrief["actionItems"] = [];

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
      keyTopics: [],
      decisions,
      actionItems,
      risks: [],
      followUpQuestions: [],
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
      const meeting = await prisma.meeting.create({
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
      logger.warn("[MeetingIntelligence] Failed to create meeting:", error);
      return null;
    }
  }

  public static async updateMeeting(
    workspaceId: string,
    meetingId: string,
    data: Record<string, unknown>
  ): Promise<boolean> {
    try {
      await prisma.meeting.update({ where: { id: meetingId, workspaceId }, data });
      return true;
    } catch (error) {
      logger.warn("[MeetingIntelligence] Failed to update meeting:", error);
      return false;
    }
  }

  public static async getMeeting(
    workspaceId: string,
    meetingId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      return await prisma.meeting.findFirst({ where: { id: meetingId, workspaceId } });
    } catch (error) {
      logger.warn("[MeetingIntelligence] Failed to get meeting:", error);
      return null;
    }
  }

  public static async listMeetings(
    workspaceId: string,
    options: { phase?: string; limit?: number } = {}
  ): Promise<Array<{ id: string; title: string; status: string; phase: string; createdAt: Date }>> {
    try {
      return await prisma.meeting.findMany({
        where: {
          workspaceId,
          ...(options.phase ? { phase: options.phase } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: options.limit || 50,
        select: { id: true, title: true, status: true, phase: true, createdAt: true },
      });
    } catch (error) {
      logger.warn("[MeetingIntelligence] Failed to list meetings:", error);
      return [];
    }
  }
}
