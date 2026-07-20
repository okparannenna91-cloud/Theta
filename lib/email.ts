import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Theta <noreply@thetapm.site>";
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

function wrapEmail(content: string, unsubscribeHtml?: string): { html: string; text: string } {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; text-align: center;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0; text-align: left;">
        ${content}
        ${unsubscribeHtml ? `<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px;">${unsubscribeHtml}</div>` : ""}
      </div>
      <div style="margin-top: 24px; color: #cbd5e1; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Theta PM. All rights reserved.
      </div>
    </div>
  `;
  return { html, text: buildPlainText(html) };
}

interface SendInviteEmailParams {
    to: string;
    workspaceName: string;
    inviteLink: string;
    role: string;
    teamName?: string;
    userId?: string;
}

export async function sendInviteEmail({
    to,
    workspaceName,
    inviteLink,
    role,
    teamName,
    userId,
}: SendInviteEmailParams) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set. Skipping email send.");
        return { success: false, error: "RESEND_API_KEY_MISSING" };
    }

    try {
        const subject = teamName
            ? `You've been invited to join the ${teamName} team in ${workspaceName}`
            : `You've been invited to join ${workspaceName} on Theta`;

        const content = `
            <h1 style="color: #4f46e5; margin-top: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Join ${teamName ? teamName : workspaceName}</h1>
            <p style="color: #334155; font-size: 16px; line-height: 24px;">Hello!</p>
            <p style="color: #475569; font-size: 15px; line-height: 24px; margin-bottom: 32px;">
                You have been invited to collaborate in <strong>${workspaceName}</strong> ${teamName ? `on the <strong>${teamName}</strong> team` : ''} as a <strong style="text-transform: capitalize;">${role}</strong>. Theta is where your team's work gets done faster.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteLink}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39);">
                    Accept Invitation
                </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 40px; line-height: 20px;">
                If you didn't expect this invitation, you can safely ignore this email. The link will expire in 7 days.
            </p>
        `;

        const { html, text } = wrapEmail(content);

        const { data, error } = await resend.emails.send({
            from: FROM_ADDRESS,
            to: [to],
            subject,
            html,
            text,
        });

        if (error) {
            console.error("Resend API error:", JSON.stringify(error, null, 2));
            throw new Error(`Failed to send email: ${error.message}`);
        }

        console.log(`Invite email sent to ${to} for workspace ${workspaceName}`);
        return { success: true, data };
    } catch (error) {
        console.error("Email send exception:", error);
        throw error;
    }
}

/**
 * General purpose email sender
 */
export async function sendEmail({
    to,
    subject,
    html,
    text,
}: {
    to: string;
    subject: string;
    html: string;
    text?: string;
}) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set. Skipping email send.");
        return { success: false, error: "RESEND_API_KEY_MISSING" };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_ADDRESS,
            to: [to],
            subject,
            html,
            text: text || buildPlainText(html),
        });

        if (error) {
            console.error("Resend API error:", JSON.stringify(error, null, 2));
            throw new Error(`Failed to send email: ${error.message}`);
        }

        return { success: true, data };
    } catch (error) {
        console.error("General Email send exception:", error);
        throw error;
    }
}

/**
 * Send Password Reset Email
 */
export async function sendPasswordResetEmail(to: string, resetLink: string) {
    const content = `
        <h1 style="color: #4f46e5; margin-top: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Reset your password</h1>
        <p style="color: #334155; font-size: 16px; line-height: 24px;">Hello,</p>
        <p style="color: #475569; font-size: 15px; line-height: 24px; margin-bottom: 32px;">
            We received a request to reset the password for your Theta account. Click the button below to choose a new password.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39);">
                Reset Password
            </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 20px;">
            If you didn't request a password reset, you can safely ignore this email. The link will expire in 1 hour.
        </p>
    `;
    const { html, text } = wrapEmail(content);
    return await sendEmail({ to, subject: "Reset your Theta password", html, text });
}

/**
 * Send Project Invitation Email (different from workspace invite)
 */
export async function sendProjectInviteEmail({
    to,
    projectName,
    workspaceName,
    inviteLink,
    inviterName,
    userId,
}: {
    to: string;
    projectName: string;
    workspaceName: string;
    inviteLink: string;
    inviterName: string;
    userId?: string;
}) {
    const unsubscribe = userId ? buildUnsubscribeLink(userId) : "";
    const content = `
        <h1 style="color: #4f46e5; margin-top: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">You've been added to a project</h1>
        <p style="color: #334155; font-size: 16px; line-height: 24px;">Hello!</p>
        <p style="color: #475569; font-size: 15px; line-height: 24px; margin-bottom: 32px;">
            <strong>${inviterName}</strong> has added you to the <strong>${projectName}</strong> project in <strong>${workspaceName}</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39);">
                View Project
            </a>
        </div>
    `;
    const { html, text } = wrapEmail(content, unsubscribe);
    return await sendEmail({ to, subject: `You've been added to ${projectName}`, html, text });
}

/**
 * Send Task Assignment Notification Email
 */
export async function sendTaskAssignmentEmail({
    to,
    taskTitle,
    projectName,
    assignerName,
    taskLink,
    userId,
}: {
    to: string;
    taskTitle: string;
    projectName: string;
    assignerName: string;
    taskLink: string;
    userId?: string;
}) {
    const unsubscribe = userId ? buildUnsubscribeLink(userId) : "";
    const content = `
        <div style="width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="color: white; font-size: 18px; font-weight: 700;">T</span>
        </div>
        <h1 style="color: #1e293b; font-size: 18px; margin: 0 0 12px 0;">Task Assigned to You</h1>
        <p style="color: #64748b; font-size: 14px; line-height: 22px; margin: 0 0 8px 0;">
            <strong>${assignerName}</strong> assigned you a task in <strong>${projectName}</strong>:
        </p>
        <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 24px 0;">${taskTitle}</p>
        <div style="text-align: center; margin: 24px 0;">
            <a href="${taskLink}" style="background-color: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                View Task
            </a>
        </div>
    `;
    const { html, text } = wrapEmail(content, unsubscribe);
    return await sendEmail({ to, subject: `Task assigned: ${taskTitle}`, html, text });
}

/**
 * Send Mention Notification Email
 */
export async function sendMentionEmail({
    to,
    mentionedBy,
    context,
    mentionLink,
    userId,
}: {
    to: string;
    mentionedBy: string;
    context: string;
    mentionLink: string;
    userId?: string;
}) {
    const unsubscribe = userId ? buildUnsubscribeLink(userId) : "";
    const content = `
        <div style="width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="color: white; font-size: 18px; font-weight: 700;">@</span>
        </div>
        <h1 style="color: #1e293b; font-size: 18px; margin: 0 0 12px 0;">You were mentioned</h1>
        <p style="color: #64748b; font-size: 14px; line-height: 22px; margin: 0 0 8px 0;">
            <strong>${mentionedBy}</strong> mentioned you:
        </p>
        <p style="color: #1e293b; font-size: 14px; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #4f46e5; margin: 0 0 24px 0;">${context}</p>
        <div style="text-align: center; margin: 24px 0;">
            <a href="${mentionLink}" style="background-color: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                View Conversation
            </a>
        </div>
    `;
    const { html, text } = wrapEmail(content, unsubscribe);
    return await sendEmail({ to, subject: `${mentionedBy} mentioned you`, html, text });
}

/**
 * Send Sprint Started Email
 */
export async function sendSprintStartedEmail({
    to,
    sprintName,
    projectName,
    startDate,
    endDate,
    sprintLink,
    userId,
}: {
    to: string;
    sprintName: string;
    projectName: string;
    startDate: string;
    endDate: string;
    sprintLink: string;
    userId?: string;
}) {
    const unsubscribe = userId ? buildUnsubscribeLink(userId) : "";
    const content = `
        <h1 style="color: #16a34a; font-size: 18px; margin: 0 0 12px 0;">Sprint Started</h1>
        <p style="color: #64748b; font-size: 14px; line-height: 22px; margin: 0 0 8px 0;">
            The <strong>${sprintName}</strong> sprint in <strong>${projectName}</strong> has started.
        </p>
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 24px 0;">
            ${startDate} &mdash; ${endDate}
        </p>
        <div style="text-align: center; margin: 24px 0;">
            <a href="${sprintLink}" style="background-color: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                View Sprint Board
            </a>
        </div>
    `;
    const { html, text } = wrapEmail(content, unsubscribe);
    return await sendEmail({ to, subject: `Sprint started: ${sprintName}`, html, text });
}

/**
 * Send Sprint Ended Email
 */
export async function sendSprintEndedEmail({
    to,
    sprintName,
    projectName,
    completedCount,
    totalTasks,
    sprintLink,
    userId,
}: {
    to: string;
    sprintName: string;
    projectName: string;
    completedCount: number;
    totalTasks: number;
    sprintLink: string;
    userId?: string;
}) {
    const unsubscribe = userId ? buildUnsubscribeLink(userId) : "";
    const rate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
    const content = `
        <h1 style="color: #d97706; font-size: 18px; margin: 0 0 12px 0;">Sprint Ended</h1>
        <p style="color: #64748b; font-size: 14px; line-height: 22px; margin: 0 0 16px 0;">
            The <strong>${sprintName}</strong> sprint in <strong>${projectName}</strong> has ended.
        </p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 0 0 24px 0; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #4f46e5;">${rate}%</div>
            <div style="font-size: 13px; color: #64748b;">${completedCount} of ${totalTasks} tasks completed</div>
        </div>
        <div style="text-align: center; margin: 24px 0;">
            <a href="${sprintLink}" style="background-color: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                View Sprint Report
            </a>
        </div>
    `;
    const { html, text } = wrapEmail(content, unsubscribe);
    return await sendEmail({ to, subject: `Sprint ended: ${sprintName} — ${rate}% complete`, html, text });
}

/**
 * Send Automation Triggered Email
 */
export async function sendAutomationTriggeredEmail({
    to,
    automationName,
    triggerDescription,
    actionDescription,
    automationLink,
    userId,
}: {
    to: string;
    automationName: string;
    triggerDescription: string;
    actionDescription: string;
    automationLink: string;
    userId?: string;
}) {
    const unsubscribe = userId ? buildUnsubscribeLink(userId) : "";
    const content = `
        <h1 style="color: #1e293b; font-size: 18px; margin: 0 0 12px 0;">Automation Triggered</h1>
        <p style="color: #64748b; font-size: 14px; line-height: 22px; margin: 0 0 16px 0;">
            Your automation <strong>${automationName}</strong> was triggered.
        </p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
            <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">When</div>
            <div style="font-size: 14px; color: #334155; margin-bottom: 12px;">${triggerDescription}</div>
            <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Then</div>
            <div style="font-size: 14px; color: #334155;">${actionDescription}</div>
        </div>
        <div style="text-align: center; margin: 24px 0;">
            <a href="${automationLink}" style="background-color: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                View Automation
            </a>
        </div>
    `;
    const { html, text } = wrapEmail(content, unsubscribe);
    return await sendEmail({ to, subject: `Automation: ${automationName} triggered`, html, text });
}

/**
 * Send Payment Success Email
 */
export async function sendPaymentSuccessEmail(to: string, plan: string, amount: string) {
    const content = `
        <h1 style="color: #10b981; margin-top: 0; font-size: 24px; font-weight: 800;">Payment Received!</h1>
        <p style="color: #334155; font-size: 16px; line-height: 24px;">Hello,</p>
        <p style="color: #475569; font-size: 15px; line-height: 24px; margin-bottom: 32px;">
            Your payment of <strong>${amount}</strong> for the <strong>${plan}</strong> plan has been successfully processed.
            Your workspace features have been upgraded. Enjoy the new capabilities!
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard"
               style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
               Go to Dashboard
            </a>
        </div>
    `;
    const { html, text } = wrapEmail(content, `<a href="${UNSUBSCRIBE_URL}" style="color: #94a3b8; text-decoration: underline;">Manage email preferences</a>`);
    return await sendEmail({ to, subject: `Payment Successful - Welcome to Theta ${plan}`, html, text });
}

/**
 * Send Payment Failed Email
 */
export async function sendPaymentFailedEmail(to: string, plan: string) {
    const content = `
        <h1 style="color: #ef4444; margin-top: 0; font-size: 24px; font-weight: 800;">Payment Failed</h1>
        <p style="color: #334155; font-size: 16px; line-height: 24px;">Hello,</p>
        <p style="color: #475569; font-size: 15px; line-height: 24px; margin-bottom: 32px;">
            We were unable to process your payment for the <strong>${plan}</strong> plan.
            To keep your workspace features active, please update your billing information as soon as possible.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/billing"
               style="background-color: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
               Update Billing
            </a>
        </div>
        <p style="color: #666; font-size: 14px;">
            If you have any questions, please reply to this email.
        </p>
    `;
    const { html, text } = wrapEmail(content, `<a href="${UNSUBSCRIBE_URL}" style="color: #94a3b8; text-decoration: underline;">Manage email preferences</a>`);
    return await sendEmail({ to, subject: `Payment Failed - Action Required for ${plan}`, html, text });
}

/**
 * Send Welcome Email
 */
export async function sendWelcomeEmail(to: string, name: string) {
    const content = `
        <h1 style="color: #4f46e5; margin-top: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-align: center;">Welcome to Theta, ${name}!</h1>
        <p style="color: #334155; font-size: 16px; line-height: 24px;">We're thrilled to have you on board. Theta is designed to help you and your team manage projects with speed, security, and intelligence.</p>
        <div style="margin: 32px 0; background-color: #f1f5f9; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Quick Start Guide:</h3>
            <ul style="color: #475569; font-size: 14px; line-height: 22px; padding-left: 20px; margin-bottom: 0;">
                <li style="margin-bottom: 8px;"><strong>Create a Project:</strong> Organise your work into sleek project spaces.</li>
                <li style="margin-bottom: 8px;"><strong>Invite your Team:</strong> Collaboration is at the heart of Theta.</li>
                <li><strong>Meet Nova:</strong> Your AI assistant is ready to help in the bottom right corner.</li>
            </ul>
        </div>
        <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39);">
                Take your first step
            </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 32px; margin-bottom: 0;">
            Have questions? Just reply to this email!
        </p>
    `;
    const { html, text } = wrapEmail(content, `<a href="${UNSUBSCRIBE_URL}" style="color: #94a3b8; text-decoration: underline;">Manage email preferences</a>`);
    return await sendEmail({ to, subject: "Welcome to Theta - Let's get started!", html, text });
}
