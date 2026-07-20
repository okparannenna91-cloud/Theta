import { Inngest } from "inngest";

export type NovaEventTypes = {
  "nova/proactive-monitor": {
    data: { workspaceId: string };
  };
  "nova/workspace-analyzed": {
    data: { workspaceId: string; insightCount: number; criticalCount: number };
  };
  "nova/risk-assessed": {
    data: { workspaceId: string; projectId: string; riskScore: number; riskLevel: string };
  };
  "nova/sprint-planned": {
    data: { workspaceId: string; projectId: string; sprintId: string };
  };
  "nova/standup-generated": {
    data: { userId: string; workspaceId: string; period: string };
  };
  "nova/smart-notification": {
    data: { userId: string; workspaceId: string; notificationType: string };
  };
  "automation/triggered": {
    data: { ruleId: string; triggerType: string; context: Record<string, unknown> };
  };
  "nova/agent-event": {
    data: {
      eventType: string;
      workspaceId: string;
      taskId?: string;
      projectId?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    };
  };
};

export const inngest = new Inngest({ id: "theta-nova" });
