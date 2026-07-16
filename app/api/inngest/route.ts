import { inngest } from "@/lib/inngest/client";
import { dunningCron, trialExpirationCron, trialReminderCron, subscriptionExpirationCron, downgradeSchedulingCron, dataRetentionCleanup } from "@/lib/inngest/functions/billing";
import { activityRetentionCleanup, archiveReadNotifications, activityDigestEmail } from "@/lib/inngest/functions/activity";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dunningCron,
    trialExpirationCron,
    trialReminderCron,
    subscriptionExpirationCron,
    downgradeSchedulingCron,
    dataRetentionCleanup,
    activityRetentionCleanup,
    archiveReadNotifications,
    activityDigestEmail,
  ],
});
