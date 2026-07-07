export type StatusKey =
  | "UNDERSTANDING"
  | "PLANNING"
  | "SEARCHING"
  | "READING"
  | "LOADING"
  | "CHECKING"
  | "ANALYZING"
  | "FINDING_TEAM"
  | "CREATING_TASKS"
  | "UPDATING_TASKS"
  | "SCHEDULING"
  | "GATHERING_CONTEXT"
  | "ORGANIZING"
  | "RUNNING_WORKFLOW"
  | "USING_AI_TOOLS"
  | "DRAFTING"
  | "SENDING_NOTIFICATIONS"
  | "SAVING"
  | "VERIFYING"
  | "FINALIZING"
  | "DONE";

export interface StatusDef {
  emoji: string;
  label: string;
}

export const STATUSES: Record<StatusKey, StatusDef> = {
  UNDERSTANDING: { emoji: "🧠", label: "Understanding your request..." },
  PLANNING: { emoji: "📋", label: "Planning the best approach..." },
  SEARCHING: { emoji: "🔍", label: "Searching your workspace..." },
  READING: { emoji: "📄", label: "Reading project data..." },
  LOADING: { emoji: "🗂️", label: "Loading projects..." },
  CHECKING: { emoji: "✅", label: "Checking task status..." },
  ANALYZING: { emoji: "📊", label: "Analyzing project timeline..." },
  FINDING_TEAM: { emoji: "👥", label: "Finding team members..." },
  CREATING_TASKS: { emoji: "📝", label: "Creating new tasks..." },
  UPDATING_TASKS: { emoji: "✏️", label: "Updating existing tasks..." },
  SCHEDULING: { emoji: "📅", label: "Scheduling work..." },
  GATHERING_CONTEXT: { emoji: "📎", label: "Gathering context..." },
  ORGANIZING: { emoji: "🔄", label: "Organizing information..." },
  RUNNING_WORKFLOW: { emoji: "⚡", label: "Running workflow..." },
  USING_AI_TOOLS: { emoji: "🤖", label: "Using AI tools..." },
  DRAFTING: { emoji: "💬", label: "Drafting response..." },
  SENDING_NOTIFICATIONS: { emoji: "📤", label: "Sending notifications..." },
  SAVING: { emoji: "💾", label: "Saving changes..." },
  VERIFYING: { emoji: "🔐", label: "Verifying permissions..." },
  FINALIZING: { emoji: "✨", label: "Finalizing response..." },
  DONE: { emoji: "✅", label: "Done" },
};

function classifyIntent(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (/create\s+(a\s+|an\s+|new\s+)?task|add\s+(a\s+)?task|make\s+(a\s+)?task|new\s+task/i.test(lower))
    return "create_task";

  if (/update|edit|change|modify|rename|move|assign|delete|remove/i.test(lower))
    return "update";

  if (/search|find|look\s+(up|for)|show|list|get\s+|what\s+(is|are)|where|how\s+(many|much)/i.test(lower) || /\b(find|search)\b/i.test(lower))
    return "search";

  if (/notif|alert|remind|send\s+(a\s+)?message|email|invite/i.test(lower))
    return "notify";

  if (/analyze|report|status|health|velocity|metrics|analytics|summary|overview|audit/i.test(lower))
    return "analysis";

  if (/plan|schedule|sprint|milestone|timeline/i.test(lower))
    return "planning";

  if (/draft|write|compose|generate|spec|doc|prd|document/i.test(lower))
    return "drafting";

  return "chat";
}

export function getStatusSequence(prompt: string): StatusKey[] {
  const intent = classifyIntent(prompt);

  switch (intent) {
    case "create_task":
      return ["UNDERSTANDING", "PLANNING", "READING", "CREATING_TASKS", "SAVING", "FINALIZING", "DONE"];

    case "update":
      return ["UNDERSTANDING", "READING", "UPDATING_TASKS", "SAVING", "FINALIZING", "DONE"];

    case "search":
      return ["UNDERSTANDING", "SEARCHING", "READING", "GATHERING_CONTEXT", "DRAFTING", "DONE"];

    case "notify":
      return ["UNDERSTANDING", "SENDING_NOTIFICATIONS", "FINALIZING", "DONE"];

    case "analysis":
      return ["UNDERSTANDING", "READING", "ANALYZING", "GATHERING_CONTEXT", "DRAFTING", "DONE"];

    case "planning":
      return ["UNDERSTANDING", "PLANNING", "READING", "SCHEDULING", "DRAFTING", "DONE"];

    case "drafting":
      return ["UNDERSTANDING", "READING", "GATHERING_CONTEXT", "DRAFTING", "DONE"];

    default:
      return ["UNDERSTANDING", "DRAFTING", "DONE"];
  }
}

export function getPreStreamStatuses(sequence: StatusKey[]): StatusKey[] {
  const draftIdx = sequence.indexOf("DRAFTING");
  return draftIdx >= 0 ? sequence.slice(0, draftIdx) : sequence.slice(0, -1);
}
