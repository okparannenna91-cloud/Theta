# Acquisition Handover Checklist: Theta PM

This checklist identifies assets and access points that may need to be transferred following a completed acquisition. Each item is classified as:
- **Transferable**: Can be directly transferred to the buyer
- **New buyer account**: Requires the buyer to create a new account with the provider
- **Provider confirmation**: Requires the current account holder to confirm/transfer ownership
- **Further investigation**: Status needs to be determined

## Repository and Code

| # | Asset | Status | Notes |
|---|---|---|---|
| 1 | GitHub repository | 🔍 Further investigation | Repository at `/workspaces/Theta`; verify GitHub hosting location and ownership |
| 2 | Git repository local copy | 🔍 Further investigation | `.git/` directory present; verify remote origin and access rights |
| 3 | Source code archives | ✅ Transferable | All source code included; no code modifications made during audit |
| 4 | `package.json` and `package-lock.json` | ✅ Transferable | Current dependency versions documented; `npm install` will fetch deps |
| 5 | `prisma/schema.prisma` | ✅ Transferable | Full MongoDB schema with 50+ models; Prisma Client JS generator |
| 6 | `next.config.js` | ✅ Transferable | Redirects, headers, CSP, and image config included |
| 7 | Environment variable templates | ✅ Transferable | `.env.example` with 60+ env var names (values to be provided separately) |
| 8 | TypeScript configuration | ✅ Transferable | `tsconfig.json` with path aliases `@/*` resolved |

## Domain and DNS

| # | Asset | Status | Notes |
|---|---|---|---|
| 9 | Domain: thetapm.site | 🔍 Further investigation | Primary domain configured in `next.config.js`; verify registrant and transfer process |
| 10 | Domain: www.thetapm.site | 🔍 Further investigation | WWW domain redirect configured in middleware and next.config.js |
| 11 | DNS records (A, CNAME, etc.) | 🔍 Further investigation | Nameserver and DNS configuration needs verification |
| 12 | SSL/TLS certificates | 🔍 Further investigation | Let's Encrypt or purchased certs; verify validity and transferability |
| 13 | Custom DNS configuration | 🔍 Further investigation | Any additional subdomains or records |

## Vercel Deployment

| # | Asset | Status | Notes |
|---|---|---|---|
| 14 | Vercel project | 🔍 Further investigation | Theta PM project deployed on Vercel; verify project ID and ownership |
| 15 | Vercel production domain | 🔍 Further investigation | `https://www.thetapm.site` or custom domain; verify in Vercel dashboard |
| 16 | Vercel environment variables | 🔍 Further investigation | 60+ env vars stored in Vercel dashboard; buyer will need to set these |
| 17 | Vercel API token | ❌ New buyer account | Current token expired 2026-08-21 (per FLOW3-HANDOFF.md:19); buyer must create new Vercel account |
| 18 | Vercel production build | 🔍 Further investigation | Last build: `npm run build`; output quality needs verification |
| 19 | Custom redirects & headers | ✅ Documented | CSP, HSTS, domain redirects documented in `next.config.js` and `middleware.ts` |
| 20 | Domain alias configuration | 🔍 Further investigation | Any additional domain aliases on Vercel project |

## Database and Data

| # | Asset | Status | Notes |
|---|---|---|---|
| 21 | MongoDB cluster | 🔍 Further investigation | Connection string via `MONGODB_URI`; verify Atlas cluster or local MongoDB |
| 22 | Database data/records | 🔍 Further investigation | No data export performed; status of production data unknown |
| 23 | Prisma migration history | 🔍 Further investigation | Migration folder may exist; verify schema drift from migrations |
| 24 | Database backups | 🔍 Further investigation | No backup procedure found in repository; verify external backup system |
| 25 | Data retention settings | 📝 Verified | `dataRetentionUntil` on Workspace model; cron cleanup runs daily at 5am UTC |
| 26 | Database credentials | 🔐 Do not share | `MONGODB_URI` value not documented in this report; refer to `.env.example` format only |

## Authentication Provider Configuration

| # | Asset | Status | Notes |
|---|---|---|---|
| 27 | Clerk dashboard account | 🔍 Further investigation | Clerk API keys in `.env.example`; verify dashboard ownership/transfer |
| 28 | Clerk publishable key | 🔑 Transferable (name only) | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - buyer sets new key in Clerk dashboard |
| 29 | Clerk secret key | 🔐 Do not share | `CLERK_SECRET_KEY` - sensitive value; buyer must create new Clerk account |
| 30 | Clerk webhook secret | 🔐 Do not share | `CLERK_WEBHOOK_SECRET` - Svix signed webhook; buyer must configure in dashboard |
| 31 | OAuth state secret | 🔑 Transferable (name only) | `OAUTH_STATE_SECRET` - buyer sets new value |
| 32 | Clerk OAuth configurations | 🔍 Further investigation | Sign-in/sign-up URLs, redirect URLs configured in Clerk dashboard |

## File Storage

| # | Asset | Status | Notes |
|---|---|---|---|
| 33 | Cloudinary account | 🔍 Further investigation | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env.example` |
| 34 | Cloudinary media assets | 🔍 Further investigation | Images and files stored in Cloudinary; verify account access and transfer |
| 35 | Cloudinary upload preset(s) | 🔍 Further investigation | May need buyer configuration for new account |

## Email Delivery

| # | Asset | Status | Notes |
|---|---|---|---|
| 36 | Resend account | ❌ New buyer account | `RESEND_API_KEY` in `.env.example`; buyer must create new Resend account |
| 37 | Resend verified sender domain | 🔍 Further investigation | FROM_ADDRESS: `Theta PM <noreply@thetapm.site>`; verify domain verification in Resend |
| 38 | Email templates | ✅ Transferable | All email templates in `lib/email.ts` (invites, password reset, billing, notifications) |
| 39 | Unsubscribe secret | 🔐 Do not share | `EMAIL_UNSUBSCRIBE_SECRET` or `RESEND_API_KEY` - sensitive value |

## Third-Party Integrations

| # | Integration | Status | buyer Action |
|---|---|---|---|
| 40 | Paystack | 🔍 Further investigation | `PAYSTACK_SECRET_KEY` in `.env.example`; buyer registers new Paystack account |
| 41 | Ivno | 🔍 Further investigation | `IVNO_API_KEY`, `IVNO_API_SECRET` in `.env.example`; buyer registers new Ivno account |
| 42 | Flutterwave | 🔍 Further investigation | `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_HASH` in `.env.example`; buyer registers new Flutterwave account |
| 43 | GitHub OAuth | 🔍 Further investigation | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET` in `.env.example`; buyer creates GitHub OAuth app |
| 44 | Slack OAuth | 🔍 Further investigation | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET` in `.env.example`; buyer creates Slack app |
| 45 | Bitbucket OAuth | 🔍 Further investigation | `BITBUCKET_CLIENT_ID`, `BITBUCKET_CLIENT_SECRET` in `.env.example`; buyer creates Bitbucket OAuth |
| 46 | Asana OAuth | 🔍 Further investigation | `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET`, `ASANA_WEBHOOK_SECRET` in `.env.example`; buyer creates Asana app |
| 47 | Trello OAuth | 🔍 Further investigation | `TRELLO_API_KEY`, `TRELLO_WEBHOOK_SECRET` in `.env.example`; buyer creates Trello app |
| 48 | Google GenAI | 🔍 Further investigation | `GEMINI_API_KEY` in `.env.example`; buyer obtains from Google AI Studio |
| 49 | OpenAI | 🔍 Further investigation | `OPENAI_API_KEY` in `.env.example`; buyer creates OpenAI account |
| 50 | Cohere | 🔍 Further investigation | `COHERE_API_KEY` in `.env.example`; buyer creates Cohere account |
| 51 | OpenRouter | 🔍 Further investigation | `OPENROUTER_API_KEY` in `.env.example`; buyer creates OpenRouter account |
| 52 | Ably | 🔍 Further investigation | `ABLY_API_KEY` in `.env.example`; buyer creates Ably account |
| 53 | PostHog | 🔍 Further investigation | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` in `.env.example`; buyer creates PostHog project |
| 54 | WooCommerce | 🔍 Further investigation | Integration configured but limited documentation; verify buyer needs |

## Billing Configuration

| # | Asset | Status | Notes |
|---|---|---|---|
| 55 | Payment provider accounts | ❌ New buyer account | Paystack, Ivno, Flutterwave accounts required from buyer |
| 56 | Billing cron configuration | 🔍 Further investigation | `BILLING_CRON_ENABLED` and `CRON_SECRET` in `.env.example`; Inngest cron functions configured |
| 57 | Subscription plans | ✅ Documented | Plans: free, growth, pro, theta_plus; intervals: monthly, annual |
| 58 | Price configuration | 🔍 Further investigation | `BILLING_PLANS` in `lib/billing-plans.ts`; base/per-user pricing needs verification |
| 59 | Dunning settings | 🔍 Further investigation | Dunning logic in `lib/billing/services/`; configure retry behavior for new provider accounts |
| 60 | Data retention policy | 🔍 Further investigation | `dataRetentionUntil` on deactivated workspaces; 30/90/365/3650 days per plan |

## Environment Variables and Secrets

| # | Variable | Classification | Notes |
|---|---|---|---|
| 61 | `MONGODB_URI` | 🔐 Sensitive - new buyer provides | MongoDB connection string; verify which env entry is active (_1.._4 ambiguity) |
| 62 | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | 🔑 Buyer sets new key | Front-end publishable key; Clerk dashboard |
| 63 | `CLERK_SECRET_KEY` | 🔐 Sensitive | Back-end secret; new Clerk account required |
| 64 | `CLERK_WEBHOOK_SECRET` | 🔐 Sensitive | Svix webhook secret; new Clerk dashboard configuration |
| 65 | `OAUTH_STATE_SECRET` | 🔑 Buyer sets new 32-byte hex | OAuth state security; new value required |
| 66 | `NEXT_PUBLIC_POSTHOG_KEY` | 🔑 Buyer sets new key | PostHog client key; new project required |
| 67 | `NEXT_PUBLIC_POSTHOG_HOST` | 🔑 Buyer sets new host | PostHog instance URL; new project required |
| 68 | `IVNO_API_KEY` | 🔐 Sensitive | New Ivno account required |
| 69 | `IVNO_API_SECRET` | 🔐 Sensitive | New Ivno account required |
| 70 | `IVNO_API_URL` | 🔍 Configuration | Ivno API base URL; may be standard |
| 71 | `FLUTTERWAVE_SECRET_KEY` | 🔐 Sensitive | New Flutterwave account required |
| 72 | `FLUTTERWAVE_PUBLIC_KEY` | 🔐 Sensitive | New Flutterwave account required |
| 73 | `FLUTTERWAVE_SECRET_HASH` | 🔐 Sensitive | New Flutterwave account required |
| 74 | `PAYSTACK_SECRET_KEY` | 🔐 Sensitive | New Paystack account required |
| 75 | `BILLING_CRON_ENABLED` | 🔧 Buyer configures | Default: `true`; requires `CRON_SECRET` for Inngest |
| 76 | `CRON_SECRET` | 🔐 Sensitive | Inngest cron function secret; buyer provides new value |
| 77 | `ABLY_API_KEY` | 🔐 Sensitive | New Ably account required |
| 78 | `SLACK_CLIENT_ID` | 🔐 Sensitive | New Slack OAuth app required |
| 79 | `SLACK_CLIENT_SECRET` | 🔐 Sensitive | New Slack OAuth app required |
| 80 | `SLACK_SIGNING_SECRET` | 🔐 Sensitive | Slack event webhook verification |
| 81 | `NEXT_PUBLIC_APP_URL` | 🔧 Buyer sets new URL | App base URL; used in email templates, Cloudinary, Ivno |
| 82 | `RESEND_API_KEY` | 🔐 Sensitive | New Resend account required |
| 83 | `CLOUDINARY_CLOUD_NAME` | 🔐 Sensitive | New Cloudinary account required |
| 84 | `CLOUDINARY_API_KEY` | 🔐 Sensitive | New Cloudinary account required |
| 85 | `CLOUDINARY_API_SECRET` | 🔐 Sensitive | New Cloudinary account required |
| 86 | `GEMINI_API_KEY` | 🔐 Sensitive | Google AI Studio key; new account required |
| 87 | `COHERE_API_KEY` | 🔐 Sensitive | Cohere account required |
| 88 | `OPENAI_API_KEY` | 🔐 Sensitive | OpenAI account required |
| 89 | `MEM0_API_KEY` | 🔐 Sensitive | Mem0 account required |
| 90 | `ENCRYPTION_KEY` | 🔐 Sensitive | 32-byte hex key for field encryption; buyer generates new key |
| 91 | `GITHUB_CLIENT_ID` | 🔐 Sensitive | New GitHub OAuth app required |
| 92 | `GITHUB_CLIENT_SECRET` | 🔐 Sensitive | New GitHub OAuth app required |
| 93 | `GITHUB_WEBHOOK_SECRET` | 🔐 Sensitive | GitHub webhook verification |
| 94 | `BITBUCKET_CLIENT_ID` | 🔐 Sensitive | New Bitbucket OAuth app required |
| 95 | `BITBUCKET_CLIENT_SECRET` | 🔐 Sensitive | New Bitbucket OAuth app required |
| 96 | `ASANA_CLIENT_ID` | 🔐 Sensitive | New Asana OAuth app required |
| 97 | `ASANA_CLIENT_SECRET` | 🔐 Sensitive | New Asana OAuth app required |
| 98 | `ASANA_WEBHOOK_SECRET` | 🔐 Sensitive | Asana webhook verification |
| 99 | `TRELLO_API_KEY` | 🔐 Sensitive | New Trello API key required |
| 100 | `TRELLO_WEBHOOK_SECRET` | 🔐 Sensitive | Trello webhook verification |
| 101 | `OPENROUTER_API_KEY` | 🔐 Sensitive | New OpenRouter account required |
| 102 | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | 🔐 Sensitive | Push notification VAPID keys; buyer generates new pair |
| 103 | `PAYSTACK_SECRET_KEY` (duplicate entry) | 🔐 Sensitive | See #74 |
| 104 | `FLUTTERWAVE_SECRET_HASH` (duplicate entry) | 🔐 Sensitive | See #73 |

## Documentation and Operational Procedures

| # | Asset | Status | Notes |
|---|---|---|---|
| 105 | This technical audit (TECHNICAL_AUDIT.md) | ✅ Included | Current document |
| 106 | README documentation (README.md) | ✅ Included | Current document with all sections |
| 107 | Acquisition handover checklist (this file) | ✅ Included | Current document |
| 108 | FLOW3-HANDOFF.md | ✅ Included | Flow³ AI chat parking documentation |
| 109 | SEO structure (SEO-STRUCTURE.md) | ✅ Included | Metadata and schema.org configuration |
| 110 | `.env.example` | ✅ Included | Environment variable templates (names only) |
| 111 | ESLint configuration | ✅ Transferable | `.eslintrc.json` configured |
| 112 | Tailwind CSS configuration | ✅ Transferable | `tailwind.config.ts` |
| 113 | Package scripts | ✅ Transferable | `package.json` scripts (dev, build, start, test, etc.) |
| 114 | Git ignore | ✅ Transferable | `.gitignore` configured |

## Backup and Recovery Procedures

| # | Asset | Status | Notes |
|---|---|---|---|
| 115 | MongoDB backup system | 🔍 Further investigation | No backup script found in repository; verify external backup solution |
| 116 | Database export procedure | 🔍 Further investigation | No export script found; may need to establish |
| 117 | Disaster recovery plan | ❌ Not documented | No recovery plan found in repository |
| 118 | Point-in-time recovery | 🔍 Further investigation | Verify MongoDB Atlas or local setup capabilities |
| 119 | Activity retention periods | ✅ Documented | Per plan: free=30d, growth=90d, pro=365d, theta_plus=3650d (via `activity-retention-cron`) |

## Ownership and Licensing Verification

| # | Asset | Status | Notes |
|---|---|---|---|
| 120 | Repository ownership | 🔍 Further investigation | Verify GitHub/account ownership transfer requirements |
| 121 | Intellectual property | 🔍 Further investigation | Code appears original; no obvious third-party licensed code copied |
| 122 | Third-party license compliance | 🔍 Further investigation | All dependencies use MIT/Apache-2.0; verify no GPL contamination |
| 123 | FLOW3-HANDOFF.md licensing | ✅ Included | Parking documentation; not a code file |
| 124 | SEO-STRUCTURE.md licensing | ✅ Included | SEO metadata documentation |
| 125 | Dependencies license compliance | 🔍 Further investigation | Audit `@langchain/*`, `baseline-browser-mapping` licenses |

## Post-Transfer Testing

| # | Test | Status | Notes |
|---|---|---|---|
| 126 | Fresh clone `npm install` | 🔍 Further investigation | Verify all dependencies install without errors |
| 127 | `npm run build` success | 🔍 Further investigation | Verify Next.js build completes successfully |
| 128 | Environment variable configuration | 🔍 Further investigation | All 60+ env vars set; build succeeds |
| 129 | Authentication flow | 🔍 Further investigation | Clerk sign-in, sign-up, session persistence |
| 130 | Billing/cron functionality | 🔍 Further investigation | `BILLING_CRON_ENABLED`, renewal/dunning behavior |
| 131 | Payment provider integration | 🔍 Further investigation | Paystack, Ivno, Flutterwave checkout flows |
| 132 | Ably real-time functionality | 🔍 Further investigation | Workspace/project/task chat channels |
| 133 | Email delivery | 🔍 Further investigation | Resend send test; all email types (invite, password reset, billing) |
| 134 | Integration OAuth flows | 🔍 Further investigation | GitHub, Slack, Trello, Asana, Bitbucket authorization |
| 135 | Database connectivity | 🔍 Further investigation | MongoDB connection and Prisma client generation |
| 136 | Inngest function execution | 🔍 Further investigation | Cron jobs trigger successfully; billing, notifications, automation |
| 137 | CSP and security headers | 🔍 Further investigation | Next.js headers and middleware CSP verification |
| 138 | Domain redirects | 🔍 Further investigation | `http://thetapm.site` → `https://www.thetapm.site` |

---

## Classification Legend

- **✅ Transferable**: Asset can be directly transferred as-is
- **🔑 New buyer account**: Buyer must create new account with provider; existing account may not transfer
- **🔐 Sensitive/Do not share**: Credentials/keys; buyer must generate new values; not reproducible in this report
- **🔍 Further investigation**: Status unknown; requires verification with current owner/operator
- **📝 Verified**: Confirmed from code inspection
- **❌ New buyer account required**: Account cannot be transferred; buyer must create from scratch