import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { IDENTITY, IDENTITY_RULES, CURRENT_STAGE, EVOLUTION_STAGES } from "@/lib/nova/config";
import { PHILOSOPHIES, ACTION_PRIORITY_ORDER } from "@/lib/nova/config";
import { EXECUTION_PRINCIPLES, CONFIRMATION_RULES } from "@/lib/nova/config";
import { DECISION_PHASES, DECISION_PRIORITY_ORDER } from "@/lib/nova/config";
import { SERVICE_REGISTRY, ARCHITECTURAL_RULES } from "@/lib/nova/config";
import { MODEL_STACK, MODEL_SELECTION_STRATEGIES } from "@/lib/nova/config";
import { MEMORY_TIERS, MEMORY_TYPES, MEMORY_RULES } from "@/lib/nova/config";
import { CONTEXT_PRIORITY_HIERARCHY, CONTEXT_RULES } from "@/lib/nova/config";
import { TASK_QUALITY_STANDARDS, TASK_INTELLIGENCE_CAPABILITIES } from "@/lib/nova/config";
import { PROJECT_STRUCTURE_STANDARDS, PROJECT_INTELLIGENCE_CAPABILITIES } from "@/lib/nova/config";
import { DOCUMENT_TYPES, DOCUMENT_ACTIONS } from "@/lib/nova/config";
import { TRIGGER_DEFINITIONS, ACTION_DEFINITIONS } from "@/lib/nova/config";
import { SEARCH_DOMAINS, SEARCH_TYPES, SEARCH_RANKING_PRINCIPLES } from "@/lib/nova/config";
import { KNOWLEDGE_PIPELINE } from "@/lib/nova/config";
import { MEETING_PHASES } from "@/lib/nova/config";
import { REPORT_TYPES } from "@/lib/nova/config";
import { PERMISSION_MATRIX, SENSITIVE_ACTIONS, AI_SECURITY_RULES } from "@/lib/nova/config";
import { INTEGRATION_PRIORITY_FRAMEWORK, INFRASTRUCTURE_DISCIPLINE_RULES } from "@/lib/nova/config";
import { EVOLUTION_MILESTONES, LONG_TERM_VISION, HUMAN_CONTROL_RULE } from "@/lib/nova/config";
import { buildSystemPrompt } from "@/lib/nova/config";

const CONSTITUTION_SECTIONS: Record<string, object> = {
  "1": { number: 1, title: "Identity", data: { identity: IDENTITY, rules: IDENTITY_RULES, currentStage: CURRENT_STAGE, stages: EVOLUTION_STAGES } },
  "2": { number: 2, title: "Core Philosophy", data: { philosophies: PHILOSOPHIES, actionPriority: ACTION_PRIORITY_ORDER } },
  "3": { number: 3, title: "Execution Principles", data: { principles: EXECUTION_PRINCIPLES, confirmationRules: CONFIRMATION_RULES } },
  "4": { number: 4, title: "Decision Framework", data: { phases: DECISION_PHASES, priorityOrder: DECISION_PRIORITY_ORDER } },
  "5": { number: 5, title: "Architecture", data: { services: SERVICE_REGISTRY, rules: ARCHITECTURAL_RULES } },
  "6": { number: 6, title: "AI Models", data: { modelStack: MODEL_STACK, selectionStrategies: MODEL_SELECTION_STRATEGIES } },
  "7": { number: 7, title: "Memory System", data: { tiers: MEMORY_TIERS, memoryTypes: MEMORY_TYPES, rules: MEMORY_RULES } },
  "8": { number: 8, title: "Context System", data: { priorityHierarchy: CONTEXT_PRIORITY_HIERARCHY, rules: CONTEXT_RULES } },
  "9": { number: 9, title: "Task Intelligence", data: { qualityStandards: TASK_QUALITY_STANDARDS, capabilities: TASK_INTELLIGENCE_CAPABILITIES } },
  "10": { number: 10, title: "Project Intelligence", data: { structureStandards: PROJECT_STRUCTURE_STANDARDS, capabilities: PROJECT_INTELLIGENCE_CAPABILITIES } },
  "11": { number: 11, title: "Document Intelligence", data: { documentTypes: DOCUMENT_TYPES, actions: DOCUMENT_ACTIONS } },
  "12": { number: 12, title: "Automation Intelligence", data: { triggers: TRIGGER_DEFINITIONS, actions: ACTION_DEFINITIONS } },
  "13": { number: 13, title: "Search Intelligence", data: { domains: SEARCH_DOMAINS, searchTypes: SEARCH_TYPES, rankingPrinciples: SEARCH_RANKING_PRINCIPLES } },
  "14": { number: 14, title: "Knowledge Intelligence", data: { pipeline: KNOWLEDGE_PIPELINE } },
  "15": { number: 15, title: "Meeting Intelligence", data: { phases: MEETING_PHASES } },
  "16": { number: 16, title: "Reporting Intelligence", data: { reportTypes: REPORT_TYPES } },
  "17": { number: 17, title: "Security Rules", data: { permissionMatrix: PERMISSION_MATRIX, sensitiveActions: SENSITIVE_ACTIONS, aiRules: AI_SECURITY_RULES } },
  "18": { number: 18, title: "Third-Party Integration Rules", data: { priorityFramework: INTEGRATION_PRIORITY_FRAMEWORK, disciplineRules: INFRASTRUCTURE_DISCIPLINE_RULES } },
  "19": { number: 19, title: "Future Evolution", data: { milestones: EVOLUTION_MILESTONES, longTermVision: LONG_TERM_VISION, humanControlRule: HUMAN_CONTROL_RULE } },
};

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");
    const format = searchParams.get("format");

    if (section) {
      const sectionData = CONSTITUTION_SECTIONS[section];
      if (!sectionData) {
        return NextResponse.json({ error: `Section ${section} not found` }, { status: 404 });
      }
      return NextResponse.json(sectionData);
    }

    if (format === "prompt") {
      return NextResponse.json({ prompt: buildSystemPrompt() });
    }

    return NextResponse.json({
      version: "3.0.0",
      totalSections: 19,
      sections: Object.entries(CONSTITUTION_SECTIONS).map(([num, s]: [string, any]) => ({
        number: s.number,
        title: s.title,
      })),
    });
  } catch (error: any) {
    console.error("Constitution API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
