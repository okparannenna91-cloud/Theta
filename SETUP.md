# Theta Setup Guide

This guide will help you set up and run the Theta project management SaaS locally.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`.
   - Fill in the required API keys for MongoDB, Clerk, Checkout.com, Ably, Cloudinary, Paystack, Gemini, Fastspring and Resend.
   - Optional: Add Slack keys for integration features.

3. **Initialize Prisma:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```
 
4. **Run the development server:**
   ```bash
   npm run lint
   npm run build
   npm run dev
   ```

5. **Open http://localhost:3000** || **Open http://thetapm.site**

## Environment Configuration

Use the `.env.example` file as a template for your `.env` file.

### Required Services

#### 1. MongoDB (Database)
- Set `MONGODB_URI` to your MongoDB connection string (e.g., from MongoDB Atlas).

#### 2. Clerk (Authentication)
- Get `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from your [Clerk Dashboard](https://dashboard.clerk.com/).
- Ensure the redirect paths are correctly set (defaults are included in `.env.example`).

#### 3. Billing Setup (Required for Payments)

Theta uses a dual-billing system: **FastSpring** for global USD payments and **Paystack** for local NGN payments.

##### A. FastSpring Dashboard (USD)
1. **Products**: Create the following products in your FastSpring Dashboard. Ensure the "Path" matches exactly.
   
| Plan | Billing | Price (USD) | **Product Path (Required)** | Type |
| :--- | :--- | :--- | :--- | :--- |
| Growth | Monthly | $12.00 | `theta-growth-monthly` | Subscription |
| Growth | Annual | $115.20 | `theta-growth-annual` | Subscription |
| Pro | Monthly | $29.00 | `theta-pro-monthly` | Subscription |
| Pro | Annual | $278.40 | `theta-pro-annual` | Subscription |
| Theta Plus | Monthly | $99.00 | `theta-plus-monthly` | Subscription |
| Theta Plus | Annual | $950.40 | `theta-plus-annual` | Subscription |
| Lifetime | One-time | $999.00 | `theta-lifetime` | One-Time Support |

2. **Webhooks**: 
   - URL: `https://your-domain.com/api/webhooks/fastspring`
   - Events: `subscription.activated`, `subscription.updated`, `subscription.canceled`, `subscription.deactivated`, `order.completed`, `payment.failed`.
   - Copy the **HMAC Key** to your `.env` as `FASTSPRING_HMAC_KEY`.

##### B. Paystack Dashboard (NGN)
1. **Plans**: Create the following plans in your Paystack Dashboard. Ensure the "Plan Code" matches exactly.

| Plan | Billing | Price (NGN) | **Plan Code (Required)** |
| :--- | :--- | :--- | :--- |
| Growth | Monthly | ₦15,000 | `PLN_growth_monthly` |
| Growth | Annual | ₦144,000 | `PLN_growth_annual` |
| Pro | Monthly | ₦35,000 | `PLN_pro_monthly` |
| Pro | Annual | ₦336,000 | `PLN_pro_annual` |
| Theta Plus | Monthly | ₦120,000 | `PLN_plus_monthly` |
| Theta Plus | Annual | ₦1,152,000 | `PLN_plus_annual` |
| Lifetime | One-time | ₦1,200,000 | `LIFETIME_NGN` |

2. **Webhooks**:
   - URL: `https://your-domain.com/api/webhooks/paystack`
   - Copy your **Secret Key** to `.env` as `PAYSTACK_SECRET_KEY`.

##### C. Billing Cron (NGN Recurring Billing)
Paystack handles subscription charging automatically, but Theta uses a cron job to verify and log these status changes if desired, or to handle automated renewals.
- Set a `CRON_SECRET` in your `.env`.
- Schedule a daily job to call `GET /api/billing/cron` with `Authorization: Bearer <CRON_SECRET>`.

#### 4. Ably (Real-time Features)
- Create a free account at [Ably.com](https://ably.com/).
- Get your `ABLY_API_KEY` from the API Keys section.

#### 5. Cloudinary (File Storage)
- Get your keys from the [Cloudinary Dashboard](https://cloudinary.com/console).
- These are used for project cover images and task attachments.

#### 6. Google Gemini (Boots AI)
- Get your `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/).
- This powers the Boots AI assistant.

#### 7. Resend (Emails)
- Get your `RESEND_API_KEY` from the [Resend Dashboard](https://resend.com/dashboard).
- This is used for sending workspace invitations and system notifications.

### Optional Integrations

#### Slack
- Create a Slack App in the [Slack API Dashboard](https://api.slack.com/apps).
- Add the `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and `SLACK_SIGNING_SECRET`.

## First Run

1. Sign up for an account via Clerk.
2. You'll be automatically redirected to the dashboard.
3. Create your first workspace and project to start collaborating!
