import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInviteEmailParams {
    to: string;
    workspaceName: string;
    inviteLink: string;
    role: string;
}

export async function sendInviteEmail({
    to,
    workspaceName,
    inviteLink,
    role,
}: SendInviteEmailParams) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set. Skipping email send.");
        return { success: false, error: "RESEND_API_KEY_MISSING" };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: "Theta <ezekiel@thetapm.site>", // Replace with your verified domain in production
            to: [to],
            subject: `You've been invited to join ${workspaceName} on Theta`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #6d28d9;">Join ${workspaceName}</h1>
                    <p>Hello!</p>
                    <p>You have been invited to join the <strong>${workspaceName}</strong> workspace as a <strong>${role}</strong>.</p>
                    <div style="margin: 32px 0;">
                        <a href="${inviteLink}" 
                           style="background-color: #6d28d9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                           Accept Invitation
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                    <p style="color: #999; font-size: 12px;">
                        &copy; ${new Date().getFullYear()} Theta SaaS. All rights reserved.
                    </p>
                </div>
            `,
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
}: {
    to: string;
    subject: string;
    html: string;
}) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set. Skipping email send.");
        return { success: false, error: "RESEND_API_KEY_MISSING" };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: "Theta <ezekiel@thetapm.site>",
            to: [to],
            subject,
            html,
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
 * Send Payment Success Email
 */
export async function sendPaymentSuccessEmail(to: string, plan: string, amount: string) {
    return await sendEmail({
        to,
        subject: `Payment Successful - Welcome to Theta ${plan}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
                <h1 style="color: #10b981;">Payment Received!</h1>
                <p>Hello,</p>
                <p>Your payment of <strong>${amount}</strong> for the <strong>${plan}</strong> plan has been successfully processed.</p>
                <p>Your workspace features have been upgraded. Enjoy the new capabilities!</p>
                <div style="margin: 32px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                       style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                       Go to Dashboard
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="color: #999; font-size: 12px;">
                    Theta SaaS - Secure Project Management
                </p>
            </div>
        `,
    });
}

/**
 * Send Payment Failed Email
 */
export async function sendPaymentFailedEmail(to: string, plan: string) {
    return await sendEmail({
        to,
        subject: `Payment Failed - Action Required for ${plan}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
                <h1 style="color: #ef4444;">Payment Failed</h1>
                <p>Hello,</p>
                <p>We were unable to process your payment for the <strong>${plan}</strong> plan.</p>
                <p>To keep your workspace features active, please update your billing information as soon as possible.</p>
                <div style="margin: 32px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" 
                       style="background-color: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                       Update Billing
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    If you have any questions, please reply to this email.
                </p>
            </div>
        `,
    });
}
/**
 * Send Welcome Email
 */
export async function sendWelcomeEmail(to: string, name: string) {
    return await sendEmail({
        to,
        subject: "Welcome to Theta - Let's get started!",
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
                <h1 style="color: #6366f1;">Welcome to Theta, ${name}!</h1>
                <p>We're thrilled to have you on board. Theta is designed to help you and your team manage projects with speed and security.</p>
                <div style="margin: 24px 0; background-color: #f9fafb; padding: 20px; border-radius: 8px;">
                    <h3 style="margin-top: 0;">Quick Start Guide:</h3>
                    <ul>
                        <li><strong>Create a Project:</strong> Organise your work into sleek projects.</li>
                        <li><strong>Invite your Team:</strong> Collaboration is at the heart of Theta.</li>
                        <li><strong>Meet Boots:</strong> Your AI assistant is ready to help in the bottom right corner.</li>
                    </ul>
                </div>
                <div style="margin: 32px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                       style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                       Take your first step
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    Have questions? Just reply to this email!
                </p>
            </div>
        `,
    });
}
