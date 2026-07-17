import { TRIGGER_DEFINITIONS, ACTION_DEFINITIONS, AUTOMATION_SAFETY_RULES, type AutomationTrigger, type AutomationAction } from "./constitution/automation-standards";
import { STATUS_DONE, STATUS_IN_PROGRESS, STATUS_TODO } from "../constants/status";
import type { AutomationConfig } from "../ai-tools/types";

export { TRIGGER_DEFINITIONS, ACTION_DEFINITIONS, AUTOMATION_SAFETY_RULES, type AutomationTrigger, type AutomationAction } from "./constitution/automation-standards";

export interface AutomatedWorkflow {
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  config: AutomationConfig;
  explanation: string;
}

export class AutomationIntelligence {
  public static translateNL(command: string): AutomatedWorkflow {
    const lower = command.toLowerCase();

    let trigger: AutomationTrigger = "TASK_CREATED";
    let action: AutomationAction = "SEND_NOTIFICATION";
    const config: AutomationConfig = { notifyRole: "member" };
    let explanation = "Triggered when a task is created to notify team members.";
    let name = `Auto: ${command.substring(0, 40)}`;

    if (lower.includes("completed") || lower.includes("done") || lower.includes("finish")) {
      trigger = "TASK_COMPLETED";
      explanation = "Triggered when a task status transitions to complete.";
    } else if (lower.includes("member added") || lower.includes("join") || lower.includes("invite")) {
      trigger = "MEMBER_ADDED";
      explanation = "Triggered when a new user joins the workspace.";
    } else if (lower.includes("overdue") || lower.includes("late")) {
      trigger = "TASK_OVERDUE";
      explanation = "Triggered when a milestone date passes without task completion.";
    } else if (lower.includes("sprint") && (lower.includes("start") || lower.includes("begin"))) {
      trigger = "SPRINT_STARTED";
      explanation = "Triggered when a sprint begins.";
    }

    if (lower.includes("email") || lower.includes("send mail")) {
      action = "SEND_EMAIL";
      config.template = "notification_alert";
    } else if (lower.includes("assign")) {
      action = "SET_ASSIGNEE";
      config.assignTo = lower.includes("qa") ? "QA_ROLE" : "LEAD_ROLE";
    } else if (lower.includes("slack") || lower.includes("notify channel")) {
      action = "NOTIFY_CHANNEL";
      config.channel = "workspace-activity";
    } else if (lower.includes("status") || lower.includes("update status")) {
      action = "UPDATE_STATUS";
      config.status = lower.includes("done") ? STATUS_DONE : lower.includes("progress") ? STATUS_IN_PROGRESS : STATUS_TODO;
    } else if (lower.includes("report") || lower.includes("generate")) {
      action = "GENERATE_REPORT";
      config.type = "project";
    }

    return { name, trigger, action, config, explanation };
  }

  public static getAvailableTriggers() {
    return TRIGGER_DEFINITIONS;
  }

  public static getAvailableActions() {
    return ACTION_DEFINITIONS;
  }

  public static getSafetyRules() {
    return AUTOMATION_SAFETY_RULES;
  }
}
