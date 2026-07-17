import { logger } from "../logger";
import { detectPromptInjection, detectSecretLeakage } from "./security-guard";

const HARMFUL_PATTERNS = [
  /how\s+to\s+(build|make|create|synthesize|manufacture)\s+(a\s+)?(bomb|weapon|explosive|poison|drug)/i,
  /instructions?\s+(for|to)\s+(self[\s-]?harm|suicide|harmful)/i,
  /(child\s+)?(abuse|exploitation)\s+materia/i,
  /illegal\s+(activity|substance|operation|content)/i,
  /instructions?\s+(on\s+)?how\s+to\s+(hack|crack|exploit|bypass|circumvent)/i,
  /(malware|ransomware|trojan|keylogger|spyware)\s+(code|script|program|creation)/i,
  /generate\s+(fake|forged|counterfeit)\s+(documents?|ids?|passports?|license)/i,
  /instructions?\s+(for\s+)?(unlawful|illegal|criminal)\s+/i,
];

const HALLUCINATION_PATTERNS = [
  /i\s+(don'?t|do\s+not)\s+(know|understand|have\s+access)/i,
  /(sorry|apologize).*(cannot|can'?t|unable)/i,
  /as\s+(an\s+)?AI\s+(model|assistant|language\s+model)/i,
  /(let\s+me\s+clarify|it\s+seems|i\s+believe|i\s+think)\s+/i,
];

const INCOHERENT_PATTERNS = [
  /[^\w\s]{10,}/,
];

const INTERNAL_LEAKAGE_PATTERNS = [
  /\bContextSystem\b/,
  /\bMemorySystem\b/,
  /\bPhilosophyEngine\b/,
  /\bDecisionFramework\b/,
  /\bAgentFramework\b/,
  /\bNovaAgent\b/,
  /\bLangGraph\b/,
  /\bTaskIntelligence\b/,
  /\bProjectIntelligence\b/,
  /\bDocumentIntelligence\b/,
  /\bSecurityGuard\b/,
  /\bOutputValidator\b/,
  /\bExecutionGuard\b/,
  /\bexecuteWithFallback\b/,
  /\brouteModel\b/,
  /\bloadWorkspaceContext\b/,
  /\bloadMemory\b/,
  /\btryDirectAction\b/,
  /\bplanAndExecute\b/,
  /\bstreamText\b/,
  /\benforcePermission\b/,
  /\bsaveConversationMemory\b/,
  /\bvalidateAndSanitize\b/,
  /\boptimizeResponse\b/,
  /\bdetectPromptInjection\b/,
  /\bsanitizeUserInput\b/,
  /\bOpenRouter\b/,
  /\bOpenAI\b/,
  /\bGoogle Gemini\b/,
  /\bCohere\b/,
  /\bAnthropic\b/,
  /\bchain of thought\b/i,
  /\breasoning step\b/i,
  /\bexecution plan\b/i,
  /\btool call\b/i,
];

const TOOL_NAME_PATTERNS = [
  /\bcreate_task\b/,
  /\blist_tasks\b/,
  /\bupdate_task\b/,
  /\bdelete_task\b/,
  /\bbreakdown_task\b/,
  /\bcreate_dependency\b/,
  /\bset_estimation\b/,
  /\blog_time\b/,
  /\bset_task_metadata\b/,
  /\bcreate_epic\b/,
  /\blist_projects\b/,
  /\bcreate_project\b/,
  /\bupdate_project\b/,
  /\bdelete_project\b/,
  /\bproject_health_analysis\b/,
  /\bcreate_sprint_board\b/,
  /\blist_workspaces\b/,
  /\bupdate_workspace\b/,
  /\blist_members\b/,
  /\binvite_member\b/,
  /\bcreate_client_invite\b/,
  /\bexport_workspace_data\b/,
  /\bsend_team_announcement\b/,
  /\bset_workspace_goal\b/,
  /\bcheck_billing_history\b/,
  /\bcreate_document\b/,
  /\bread_document\b/,
  /\bdelete_document\b/,
  /\bsearch_workspace\b/,
  /\blist_prompt_templates\b/,
  /\bget_suggestions\b/,
  /\bgenerate_daily_brief\b/,
  /\bgenerate_meeting_prep\b/,
  /\bgenerate_standup\b/,
  /\bcreate_automation\b/,
  /\bcreate_form\b/,
  /\blist_forms\b/,
  /\bget_form_responses\b/,
  /\bbrowse_templates\b/,
  /\bpropose_custom_module\b/,
  /\blist_integrations\b/,
  /\blist_team_members\b/,
  /\bteam_performance\b/,
  /\bteam_activity\b/,
  /\bsaved_searches\b/,
  /\bsave_search\b/,
  /\bdelete_saved_search\b/,
  /\bpin_search\b/,
  /\bsave_conversation\b/,
  /\bremember_preference\b/,
  /\bdispatch_ui_action\b/,
  /\bupdate_board_layout\b/,
];

const AGENT_NAME_PATTERNS = [
  /\bSprint Agent\b/,
  /\bTask Agent\b/,
  /\bReporting Agent\b/,
  /\bRisk Agent\b/,
  /\bDocumentation Agent\b/,
  /\bAutomation Agent\b/,
  /\bResearch Agent\b/,
  /\bExecutive Agent\b/,
];

const IDENTITY_LEAKAGE_PATTERNS = [
  /\b(?:I'?m an AI|as an AI|as a language model|I'?m a language model)\b/i,
  /\bI don'?t have (?:real[- ]time |access to|the ability to)\b/i,
  /\bI (?:can'?t|cannot) (?:access|see|read|view) your\b/i,
];

const MIN_OUTPUT_LENGTH = 5;

export interface ValidationResult {
  valid: boolean;
  issues: Array<{ type: "harmful" | "hallucination" | "injection" | "leakage" | "incoherent" | "length"; message: string }>;
}

export class OutputValidator {
  static validate(response: string): string {
    if (!response || response.trim().length < MIN_OUTPUT_LENGTH) {
      throw new Error("Output validation failed: response is empty or too short.");
    }

    for (const pattern of HARMFUL_PATTERNS) {
      if (pattern.test(response)) {
        throw new Error("Output validation failed: response contains prohibited content.");
      }
    }

    if (detectSecretLeakage(response)) {
      throw new Error("Output validation failed: response contains potential secret leakage.");
    }

    if (detectPromptInjection(response)) {
      logger.error("[OutputValidator] Prompt injection patterns detected in output.");
    }

    for (const pattern of HALLUCINATION_PATTERNS) {
      if (pattern.test(response)) {
        logger.warn("[OutputValidator] Possible hallucination detected in model output.");
      }
    }

    return response;
  }

  static validateDetailed(response: string): ValidationResult {
    const issues: ValidationResult["issues"] = [];

    if (!response || response.trim().length < MIN_OUTPUT_LENGTH) {
      issues.push({ type: "length", message: "Response is empty or too short." });
    }

    for (const pattern of HARMFUL_PATTERNS) {
      if (pattern.test(response)) {
        issues.push({ type: "harmful", message: `Matched harmful pattern: ${pattern}` });
      }
    }

    if (detectSecretLeakage(response)) {
      issues.push({ type: "leakage", message: "Potential secret leakage detected." });
    }

    if (detectPromptInjection(response)) {
      issues.push({ type: "injection", message: "Prompt injection patterns detected." });
    }

    for (const pattern of HALLUCINATION_PATTERNS) {
      if (pattern.test(response)) {
        issues.push({ type: "hallucination", message: `Possible hallucination pattern: ${pattern}` });
      }
    }

    for (const pattern of INCOHERENT_PATTERNS) {
      if (pattern.test(response)) {
        issues.push({ type: "incoherent", message: "Response contains incoherent content." });
      }
    }

    return { valid: issues.length === 0, issues };
  }
}

export function sanitizeUserInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

export function detectInternalLeakage(text: string): boolean {
  return INTERNAL_LEAKAGE_PATTERNS.some(p => p.test(text));
}

export function detectToolNameExposure(text: string): boolean {
  return TOOL_NAME_PATTERNS.some(p => p.test(text));
}

export function detectAgentNameExposure(text: string): boolean {
  return AGENT_NAME_PATTERNS.some(p => p.test(text));
}

export function detectIdentityLeakage(text: string): boolean {
  return IDENTITY_LEAKAGE_PATTERNS.some(p => p.test(text));
}

export function detectRawToolCalls(text: string): boolean {
  return RAW_TOOL_CALL_PATTERNS.some(p => p.test(text));
}

export function extractToolCallsFromText(text: string): Array<{ tool: string; params: Record<string, unknown> }> {
  const calls: Array<{ tool: string; params: Record<string, unknown> }> = [];

  const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const toolCode = item.tool_code || item.function || item.tool_name || "";
          const toolMatch = toolCode.match(/(?:nova\.tools\.|print\s*\(\s*nova\.tools\.)(\w+)\s*\(([^)]*)\)/);
          if (toolMatch) {
            const toolName = toolMatch[1];
            const paramStr = toolMatch[2];
            const params: Record<string, unknown> = {};
            if (paramStr) {
              for (const param of paramStr.split(",")) {
                const [key, val] = param.split("=").map((s: string) => s?.trim().replace(/^['"]|['"]$/g, ""));
                if (key && val) params[key] = val;
              }
            }
            calls.push({ tool: toolName, params });
          }
        }
      }
    } catch {}
  }

  if (calls.length === 0) {
    const printMatch = text.match(/print\s*\(\s*nova\.tools\.(\w+)\s*\(([^)]*)\)\s*\)/);
    if (printMatch) {
      const toolName = printMatch[1];
      const params: Record<string, unknown> = {};
      if (printMatch[2]) {
        for (const param of printMatch[2].split(",")) {
          const [key, val] = param.split("=").map((s: string) => s?.trim().replace(/^['"]|['"]$/g, ""));
          if (key && val) params[key] = val;
        }
      }
      calls.push({ tool: toolName, params });
    }
  }

  return calls;
}

export interface ReviewContext {
  route: string;
  workspaceContext?: string;
  userPrompt: string;
  conversationHistory?: string;
  __extractedToolCalls?: Array<{ tool: string; params: Record<string, unknown> }>;
}

export interface ReviewResult {
  passed: boolean;
  revisedResponse: string;
  issues: string[];
}

const ROBOTIC_OPENINGS = [
  /^(sure|of course|absolutely|certainly|great question|excellent question|that's a great question)[!.]*\s*/i,
  /^(i would be happy to|i'?d be happy to)\s+[^.]*[.]\s*/i,
  /^(here is (?:a |the )?(?:summary|result|answer|output))[^.]*\.\s*/i,
];

const ROBOTIC_ENDINGS = [
  /let me know if (?:you need|there'?s anything|you have)[^.]*[!.]*\s*$/i,
  /feel free to (?:reach out|ask|contact|let me know)[^.]*[!.]*\s*$/i,
  /i'?m (?:here |always )?(?:to help|available|for you)[^.]*[!.]*\s*$/i,
  /is there anything else (?:i can|i should|you need)[^.]*[!.]*\s*$/i,
  /don'?t hesitate to (?:ask|reach out|contact)[^.]*[!.]*\s*$/i,
];

const TOOL_NAME_REGEX = /\b(?:create_task|list_tasks|update_task|delete_task|breakdown_task|create_dependency|set_estimation|log_time|set_task_metadata|create_epic|list_projects|create_project|update_project|delete_project|project_health_analysis|create_sprint_board|list_workspaces|update_workspace|list_members|invite_member|create_client_invite|export_workspace_data|send_team_announcement|set_workspace_goal|check_billing_history|create_document|read_document|delete_document|search_workspace|list_prompt_templates|get_suggestions|generate_daily_brief|generate_meeting_prep|generate_standup|create_automation|create_form|list_forms|get_form_responses|browse_templates|propose_custom_module|list_integrations|list_team_members|team_performance|team_activity|saved_searches|save_search|delete_saved_search|pin_search|save_conversation|remember_preference|dispatch_ui_action|update_board_layout)\b/;

const RAW_TOOL_CALL_PATTERNS = [
  /\[\s*\{\s*"?tool_code"?\s*:/i,
  /\[\s*\{\s*"?tool_name"?\s*:/i,
  /\[\s*\{\s*"?function"?\s*:/i,
  /print\s*\(\s*nova\.tools\./i,
  /\btool_call\s*[:=]/i,
  /\bfunction_call\s*[:=]/i,
];

const AGENT_NAME_REGEX = /\b(?:Sprint Agent|Task Agent|Reporting Agent|Risk Agent|Documentation Agent|Automation Agent|Research Agent|Executive Agent)\b/;

const UNNECESSARY_QUESTION_PATTERNS = [
  /which project/i,
  /which sprint/i,
  /which workspace/i,
  /what(?:'s| is) the project name/i,
  /can you tell me the project/i,
];

export class ResponseQualityGate {
  static review(response: string, context: ReviewContext): ReviewResult {
    const issues: string[] = [];
    let revised = response.trim();

    if (detectRawToolCalls(revised)) {
      issues.push("Detected raw tool call text in response");
      const extracted = extractToolCallsFromText(revised);
      if (extracted.length > 0) {
        context.__extractedToolCalls = extracted;
      }
      revised = "Let me look into that for you.";
    }

    revised = this.stripRoboticPatterns(revised, issues);
    revised = this.stripToolNames(revised, issues);
    revised = this.stripAgentNames(revised, issues);
    revised = this.stripIdentityLeaks(revised, issues);
    revised = this.checkUnnecessaryQuestions(revised, context, issues);
    revised = this.ensureConciseness(revised, context, issues);
    revised = this.stripInternalLeakage(revised, issues);

    return {
      passed: issues.length === 0,
      revisedResponse: revised,
      issues,
    };
  }

  private static stripRoboticPatterns(text: string, issues: string[]): string {
    let result = text;

    for (const pattern of ROBOTIC_OPENINGS) {
      const cleaned = result.replace(pattern, "");
      if (cleaned !== result && cleaned.trim().length > 0) {
        issues.push("Stripped robotic opening");
        result = cleaned.trim();
      }
    }

    const lines = result.split("\n");
    if (lines.length > 1) {
      const lastLine = lines[lines.length - 1].trim();
      for (const pattern of ROBOTIC_ENDINGS) {
        if (pattern.test(lastLine) && lines.length > 1) {
          issues.push("Stripped robotic ending");
          lines.pop();
        }
      }
    }

    return lines.join("\n").trim();
  }

  private static stripToolNames(text: string, issues: string[]): string {
    if (TOOL_NAME_REGEX.test(text)) {
      issues.push("Detected tool name in response");
      return text.replace(TOOL_NAME_REGEX, (match) => {
        const friendly: Record<string, string> = {
          create_task: "task creation",
          list_tasks: "listing tasks",
          update_task: "updating a task",
          delete_task: "deleting a task",
          breakdown_task: "task breakdown",
          create_project: "project creation",
          list_projects: "listing projects",
          get_suggestions: "suggestions",
          generate_standup: "standup generation",
          generate_daily_brief: "daily brief",
          search_workspace: "workspace search",
          create_document: "document creation",
          create_automation: "automation setup",
          project_health_analysis: "health analysis",
        };
        return friendly[match] || match.replace(/_/g, " ");
      });
    }
    return text;
  }

  private static stripAgentNames(text: string, issues: string[]): string {
    if (AGENT_NAME_REGEX.test(text)) {
      issues.push("Detected agent name in response");
      return text.replace(AGENT_NAME_REGEX, "I");
    }
    return text;
  }

  private static stripIdentityLeaks(text: string, issues: string[]): string {
    let result = text;
    for (const pattern of IDENTITY_LEAKAGE_PATTERNS) {
      if (pattern.test(result)) {
        issues.push("Detected identity leakage");
        result = result.replace(pattern, "I don't see that data in your workspace");
      }
    }
    return result;
  }

  private static checkUnnecessaryQuestions(text: string, context: ReviewContext, issues: string[]): string {
    if (!context.workspaceContext) return text;

    const hasProjectContext = /ACTIVE PROJECT/i.test(context.workspaceContext);
    if (hasProjectContext) {
      for (const pattern of UNNECESSARY_QUESTION_PATTERNS) {
        if (pattern.test(text)) {
          issues.push("Asked for information already in context");
          return text.replace(pattern, "your current project");
        }
      }
    }
    return text;
  }

  private static ensureConciseness(text: string, context: ReviewContext, issues: string[]): string {
    const wordCount = text.split(/\s+/).length;
    const isSimpleQuery = !/\b(analyze|detailed|comprehensive|full report|breakdown|explain in detail)\b/i.test(context.userPrompt);

    if (isSimpleQuery && wordCount > 250) {
      issues.push("Response exceeded conciseness threshold for simple query");
      const sentences = text.split(/(?<=[.!?])\s+/);
      const kept = sentences.slice(0, 10).join(" ");
      return kept + "\n\nWant me to go deeper on any of this?";
    }
    return text;
  }

  private static stripInternalLeakage(text: string, issues: string[]): string {
    if (detectInternalLeakage(text)) {
      issues.push("Detected internal system reference");
      let result = text;
      result = result.replace(/\bContextSystem\b/g, "the system");
      result = result.replace(/\bMemorySystem\b/g, "the system");
      result = result.replace(/\bPhilosophyEngine\b/g, "I");
      result = result.replace(/\bDecisionFramework\b/g, "I");
      result = result.replace(/\bAgentFramework\b/g, "I");
      result = result.replace(/\bNovaAgent\b/g, "I");
      result = result.replace(/\bLangGraph\b/g, "the system");
      result = result.replace(/\bexecuteWithFallback\b/g, "process");
      result = result.replace(/\brouteModel\b/g, "select");
      result = result.replace(/\bloadWorkspaceContext\b/g, "check your workspace");
      result = result.replace(/\bloadMemory\b/g, "check my memory");
      result = result.replace(/\btryDirectAction\b/g, "handle");
      result = result.replace(/\bplanAndExecute\b/g, "plan and execute");
      result = result.replace(/\benforcePermission\b/g, "verify permissions");
      result = result.replace(/\bsaveConversationMemory\b/g, "save");
      result = result.replace(/\bvalidateAndSanitize\b/g, "process");
      result = result.replace(/\boptimizeResponse\b/g, "optimize");
      result = result.replace(/\bOpenRouter\b/g, "the AI service");
      result = result.replace(/\bOpenAI\b/g, "the AI service");
      result = result.replace(/\bGoogle Gemini\b/g, "the AI service");
      result = result.replace(/\bCohere\b/g, "the AI service");
      result = result.replace(/\bAnthropic\b/g, "the AI service");
      return result;
    }
    return text;
  }
}
