export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  // Placeholder implementation – in production this would call Resend API.
  console.log(`[Email Service] Sending email to ${to} with subject "${subject}"`);
  // Simulate async call
  await new Promise((resolve) => setTimeout(resolve, 10));
}
