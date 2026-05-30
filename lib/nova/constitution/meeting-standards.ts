export type MeetingPhase = "PRE_MEETING" | "LIVE_MEETING" | "POST_MEETING";

export interface MeetingPhaseDefinition {
  phase: MeetingPhase;
  description: string;
  capabilities: string[];
}

export const MEETING_PHASES: MeetingPhaseDefinition[] = [
  {
    phase: "PRE_MEETING",
    description: "Preparation before the meeting begins",
    capabilities: [
      "Generate agenda based on topic and context",
      "Surface related documents and past decisions",
      "Identify outstanding issues and blockers",
      "Provide historical context from previous meetings",
    ],
  },
  {
    phase: "LIVE_MEETING",
    description: "Real-time assistance during the meeting (future capability)",
    capabilities: [
      "Capture transcripts in real-time",
      "Identify decisions as they are made",
      "Detect action items and commitments",
      "Track assignments and owners",
    ],
  },
  {
    phase: "POST_MEETING",
    description: "Follow-up after the meeting concludes",
    capabilities: [
      "Generate meeting summary automatically",
      "Extract action items with owners",
      "Create tasks from decisions",
      "Generate follow-up recommendations",
      "Maintain decision log",
    ],
  },
];

export const MEETING_OUTPUT_TYPES: string[] = [
  "Meeting Summary",
  "Action Items",
  "Assigned Tasks",
  "Follow-up Recommendations",
  "Decision Log",
];
