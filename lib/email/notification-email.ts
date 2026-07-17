import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Theta <notifications@thetapm.site>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetapm.site";
const UNSUBSCRIBE_URL = `${APP_URL}/settings/notifications`;

function buildUnsubscribeLink(userId: string): string {
  return `<a href="${UNSUBSCRIBE_URL}?userId=${userId}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe from email notifications</a>`;
}

function buildPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export async function sendActivityDigestEmail(userId: string, workspaceId: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping digest email.");
    return { success: false };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return { success: false };

    const preference = await prisma.userPreference.findUnique({ where: { userId } });
    if (preference?.emailNotifications === false) return { success: false };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const activities = await prisma.activity.findMany({
      where: {
        workspaceId,
        createdAt: { gte: yesterday },
      },
      include: {
        user: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (activities.length === 0) return { success: false };

    const completedCount = activities.filter(a => a.action === "completed").length;
    const commentCount = activities.filter(a => a.action === "comment_created").length;
    const aiCount = activities.filter(a => a.action.startsWith("nova_") || a.action === "ai_generation").length;

    const activityRows = activities.slice(0, 10).map(a => {
      const actor = a.user?.name || "Someone";
      const entity = (a.metadata as any)?.entityName || (a.metadata as any)?.taskTitle || "an item";
      const project = a.project?.name || "";
      return `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155;">
            <strong>${actor}</strong> ${a.action.replace(/_/g, " ")} <em>${entity}</em>
            ${project ? `<span style="color: #94a3b8; font-size: 12px;"> in ${project}</span>` : ""}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: right; white-space: nowrap;">
            ${new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </td>
        </tr>
      `;
    }).join("");

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    const unsubscribe = buildUnsubscribeLink(userId);

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          <h1 style="color: #4f46e5; font-size: 20px; margin-top: 0;">Your Daily Digest</h1>
          <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Here's what happened in your workspace yesterday.</p>
          
          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; flex: 1; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${completedCount}</div>
              <div style="font-size: 11px; color: #64748b;">Completed</div>
            </div>
            <div style="background: #fffbeb; border-radius: 8px; padding: 12px 16px; flex: 1; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #d97706;">${commentCount}</div>
              <div style="font-size: 11px; color: #64748b;">Comments</div>
            </div>
            <div style="background: #faf5ff; border-radius: 8px; padding: 12px 16px; flex: 1; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #9333ea;">${aiCount}</div>
              <div style="font-size: 11px; color: #64748b;">AI Actions</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            ${activityRows}
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${APP_URL}/activity" style="background-color: #4f46e5; color: #fff; padding: 10px 20px; border-radius: 9999px; text-decoration: none; font-size: 13px; font-weight: 600;">
              View Full Activity
            </a>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px;">
            ${unsubscribe}
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #cbd5e1; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Theta PM
        </div>
      </div>
    `;

    const text = buildPlainText(html);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: [user.email],
      subject: `Daily Digest — ${workspace?.name || "Theta"}`,
      html,
      text,
    });

    logger.info(`[Email] Activity digest sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    logger.error(`[Email] Failed to send activity digest: ${error}`);
    return { success: false };
  }
}

export async function sendNotificationEmail(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string
) {
  if (!process.env.RESEND_API_KEY) {
    return { success: false };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return { success: false };

    const preference = await prisma.userPreference.findUnique({ where: { userId } });
    if (preference?.emailNotifications === false) return { success: false };

    const unsubscribe = buildUnsubscribeLink(userId);

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          <div style="width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="color: white; font-size: 18px; font-weight: 700;">T</span>
          </div>
          <h1 style="color: #1e293b; font-size: 18px; margin: 0 0 12px 0;">${title}</h1>
          <p style="color: #64748b; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">${message}</p>
          ${actionUrl ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="${actionUrl}" style="background-color: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                View Details
              </a>
            </div>
          ` : ""}
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px;">
            ${unsubscribe}
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #cbd5e1; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Theta PM
        </div>
      </div>
    `;

    const text = buildPlainText(html);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: [user.email],
      subject: title,
      html,
      text,
    });

    return { success: true };
  } catch (error) {
    logger.error(`[Email] Failed to send notification email: ${error}`);
    return { success: false };
  }
}
