import { inngest } from "@/lib/inngest/client";
import { dunningCron, trialExpirationCron, trialReminderCron, subscriptionExpirationCron, downgradeSchedulingCron, dataRetentionCleanup } from "@/lib/inngest/functions/billing";
import { activityRetentionCleanup, archiveReadNotifications, activityDigestEmail } from "@/lib/inngest/functions/activity";
import { proactiveMonitor } from "@/lib/inngest/functions/proactive-monitor";
import { executeAutomation, dueDatePassedCron } from "@/lib/inngest/functions/automation-executor";
import { taskDeadlineReminders, overdueTaskDetection, calendarEventReminders, missedCalendarEvents, smartAlerts, dailyDigest, weeklyDigest, novaSuggestions, insightDigestEmail } from "@/lib/inngest/functions/notifications";
import { backgroundAgentCron, eventTriggeredAgent } from "@/lib/nova/agents/background-agent";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Billing
    dunningCron,
    trialExpirationCron,
    trialReminderCron,
    subscriptionExpirationCron,
    downgradeSchedulingCron,
    dataRetentionCleanup,
    // Activity
    activityRetentionCleanup,
    archiveReadNotifications,
    activityDigestEmail,
    // Proactive Intelligence
    proactiveMonitor,
    // Automation
    executeAutomation,
    dueDatePassedCron,
    // Notifications (were dead code — now registered)
    taskDeadlineReminders,
    overdueTaskDetection,
    calendarEventReminders,
    missedCalendarEvents,
    smartAlerts,
    dailyDigest,
    weeklyDigest,
    novaSuggestions,
    insightDigestEmail,
    // Nova Agents
    backgroundAgentCron,
    eventTriggeredAgent,
  ],
});
