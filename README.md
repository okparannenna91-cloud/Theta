# Theta PM

**Theta PM** is a real-time project management platform designed for high-velocity teams. It combines task management, project tracking, AI-assisted workflows, collaboration features, and billing into a single workspace.

## Product Capabilities (Verified from Code)

- **Task management**: Create, assign, track, and complete tasks with subtasks, checklists, dependencies, and time tracking
- **Project management**: Organize work into projects with custom boards, columns, and kanban-style workflows
- **Real-time collaboration**: Ably-powered real-time features for workspace-wide updates
- **AI-assisted workflows**: Nova AI agent integration with LangGraph, conversational AI, task automation, and proactive insights
- **Document management**: Hierarchical documents with versioning, comments, and collaborative editing (TipTap)
- **Board and kanban**: Customizable boards with columns, WIP limits, groups, and board views
- **Team collaboration**: Teams within workspaces with role-based permissions (owner, admin, member, guest)
- **Automation**: Rule-based automations that trigger on task events (status changes, due dates, assignments)
- **Calendar & scheduling**: Calendar events with recurrence, sprint planning, and Gantt chart visualization
- **Billing & subscriptions**: Three payment providers (Paystack for NGN, Ivno and Flutterwave for USD/EUR/GBP) with trial support, dunning, and plan changes
- **Integration marketplace**: GitHub, Slack, Trello, Asana, Bitbucket, WooCommerce integrations with webhook handling
- **Proactive intelligence**: AI-driven insights on deadline risks, unassigned work, blocked tasks, and feature adoption tracking
- **Onboarding**: Structured onboarding flow with workspace setup and team invitations

## Technology Stack

- **Framework**: Next.js 14 (app router), React 18, TypeScript
- **Database**: MongoDB via Prisma ORM
- **Authentication**: Clerk Next.js integration (JWT sessions, OAuth)
- **Real-time**: Ably Realtime service
- **Background Jobs**: Inngest (cron-triggered functions for billing, notifications, proactive monitoring)
- **Analytics**: PostHog event tracking (client and server)
- **Email**: Resend transactional email service
- **File Storage**: Cloudinary for images and assets
- **Payments**: Paystack (NGN), Ivno (USD/EUR/GBP), Flutterwave (USD/EUR/GBP)
- **AI**: LangChain + OpenAI, Cohere, Google GenAI, OpenRouter providers
- **UI Components**: shadcn/ui, Radix UI, Tiptap rich text editor, FullCalendar, Recharts, Leaflet
- **Styling**: Tailwind CSS with daisyui theme
- **Logging**: Custom logger with request timing and warning alerts
- **Rate Limiting**: Redis-based sliding window rate limiter

## Repository Structure

```
/app/                    # Next.js app directory (app router)
  /(dashboard)/          # Dashboard routes (protected, workspace-scoped)
  /(marketing)/          # Marketing/public routes
  /api/                  # API routes (~50 endpoints)
  /flow3/                # Flow³ AI chat (parked from UI, code intact)
  /onboarding/           # Onboarding flow
  /invites/              # Invite management
  /error.tsx             # Error boundary
  /globals.css           # Global styles
  /layout.tsx            # Root layout with all providers
  /page.tsx              # Home page

/components/             # React UI components
  /ai/                   # AI-related components (command palette)
  /flow3/                # Flow³ AI chat components (parked)
  /layout/               # Dashboard layout, sidebar
  /popups/               # Popup manager
  /ui/                   # shadcn/ui base components
  /providers/            # React query, theme, workspace, ably, posthog, api-debug

/lib/                   # Business logic and services
  /billing/              # Payment orchestration, cron, providers (Paystack, Ivno, Flutterwave)
  /inngest/              # Background job functions (billing, notifications, automation)
  /prisma.ts             # Prisma client configuration
  /analytics.ts          # Analytics event names and property schemas
  /auth.ts               # Clerk authentication helper
  /email.ts              # Resend email sending (invites, password reset, notifications)
  /ably.ts               # Ably real-time client
  /notification-engine.ts# Notification creation, delivery, workspace member notification
  /posthog.ts            # PostHog client configuration
  /rate-limit.ts         # Redis-based sliding window rate limiter
  /redis/                # Redis client and caching utilities
  /scheduling/            # Scheduling utilities
  /services/              # Integration services (GitHub, Slack, Trello, Asana, Bitbucket, WooCommerce)
  /workspace.ts           # Workspace creation, membership, permission utilities

/prisma/                # MongoDB schema (50+ models)
  schema.prisma           # Full data model with Workspace, User, Project, Task, Document, etc.

/tests/                 # Test suite
  /unit/                 # Vitest unit tests (security, plan limits, build tools, etc.)
  /integration/          # AI pipeline and langgraph flow tests
  /smoke.test.ts          # Smoke test suite
  /flow-bridge.test.ts    # Flow³ bridge integration tests

/.env.example           # Environment variable templates
/next.config.js         # Next.js configuration with redirects, headers, CSP
/package.json           # Dependencies and scripts
/tsconfig.json          # TypeScript configuration
/tailwind.config.ts     # Tailwind CSS configuration
```

## Application Architecture

- **Next.js 14 App Router** with server components and client components
- **Root layout (`app/layout.tsx`)** wraps all pages with essential providers:
  - `ClerkProvider` - Authentication
  - `WorkspaceProvider` - Current workspace context
  - `QueryProvider` - React Query for data fetching
  - `ThemeProvider` - Theme management (forced dark mode)
  - `AblyProvider` - Real-time subscriptions
  - `PostHogProvider` - Analytics event tracking
  - `ApiDebugProvider` - Development debugging tools
  - `PopupProvider` - Modal/popup management
  - `I18nProvider` - Internationalization support
- **Middleware (`middleware.ts`)**:
  - Canonical domain enforcement (http://thetapm.site → https://www.thetapm.site)
  - Clerk middleware for session authentication
  - Rate limiting on API routes (60s window, 120 writes / 600 reads per token)
  - Excludes webhook routes, Flow³ bridge routes, and billing cron from rate limits
  - Public routes: /, /pricing, /docs, /privacy, /terms, /sign-in, /sign-up
- **Server-side rendering** with data fetching via Prisma client
- **Client-state management** via React Query (query provider)
- **Background job processing** via Inngest with cron triggers every 30 minutes, hourly, daily, weekly

## Database Overview

- **Database**: MongoDB (configure via `MONGODB_URI` environment variable)
- **ORM**: Prisma 5 with Prisma Client JS
- **Schema**: 50+ Prisma models defined in `prisma/schema.prisma`

Key models and relationships:

| Model | Key Fields | Relationships |
|---|---|---|
| `Workspace` | plan, billingProvider, subscriptionStatus | hasMany: WorkspaceMember, Project, Task, Board, Team, Invite, Integration, etc. |
| `User` | clerkId, role (user, super_admin) | belongsToMany: Workspace via WorkspaceMember, projects via ProjectMember |
| `WorkspaceMember` | role (owner, admin, member, guest) | belongsTo: Workspace, User |
| `Project` | visibility (private, team_access, workspace_visible) | belongsTo: Workspace, User; hasMany: Task, Board, TeamMember, etc. |
| `Task` | status, priority, taskType, assigneeIds, subtasks | belongsTo: Workspace, User, Project; hasMany: Subtask, Comment, TimeLog |
| `Document` | visibility (PRIVATE/INTERNAL/PUBLIC), isTemplate, versioning | belongsTo: Workspace, User, Project; hasMany: DocumentVersion, Comment |
| `Integration` | provider (github, bitbucket, asana, slack, trello, woocommerce) | belongsTo: Workspace |
| `Subscription` | planKey, billingInterval, status (trialing/active/past_due/canceled/deactivated) | belongsTo: Workspace |
| `BillingLog` | action, provider, amount, currency | belongsTo: Workspace |
| `AiConversation`, `AiMessage` | AI chat history with persistence | belongsTo: Workspace, User |

Indexes are defined on unique fields (`workspaceId_userId` on WorkspaceMember, `clerkId` on User, `email` on User, `providerWorkspaceId` on Integration) and composite indexes for query performance.

## Authentication and Authorization

- **Provider**: Clerk Next.js (`@clerk/nextjs`)
- **Session management**: JWT-based sessions issued by Clerk
- **Login flow**: OAuth sign-in / sign-up with Clerk-hosted pages
- **Redirection**: 
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`

- **Role hierarchy** (from Prisma schema):
  - `user` - Regular authenticated user
  - `super_admin` - Elevated administrative role
  - Workspace members: `owner`, `admin`, `member`, `guest`

- **Workspace permissions** verified in code:
  - `lib/workspace.ts:requireWorkspaceAdmin` - Checks user is owner or admin for billing mutations
  - `lib/workspace.ts:verifyWorkspaceAccess` - Checks user membership in workspace
  - `lib/notification-engine.ts:cachedCanAccessProject` - Cached project access check with 60s TTL
  - `lib/automation-executor.ts:checkAutomationPermissions` - Validates admin-only actions for viewer roles

- **API route protection** (`middleware.ts`):
  - Public routes bypass session auth (webhooks, Flow³ bridge, billing cron)
  - API routes return JSON 401 if unauthenticated
  - Page routes redirect to `/sign-in` if no session

- **Clerk environment variables** (from `.env.example`):
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Front-end publishable key
  - `CLERK_SECRET_KEY` - Back-end secret key
  - `CLERK_WEBHOOK_SECRET` - Svix webhook signature verification

## Integrations and External Services

| Service | Purpose | Configuration |
|---|---|---|
| **Clerk** | Authentication / SSO | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` |
| **PostHog** | Product analytics | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |
| **Ably** | Real-time features | `ABLY_API_KEY` |
| **Resend** | Transactional email | `RESEND_API_KEY` |
| **Cloudinary** | File/image storage | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Paystack** | Payments (NGN) | `PAYSTACK_SECRET_KEY` |
| **Ivno** | Payments (USD/EUR/GBP) | `IVNO_API_KEY`, `IVNO_API_SECRET` |
| **Flutterwave** | Payments (USD/EUR/GBP) | `FLUTTERWAVE_SECRET_KEY` |
| **GitHub** | Integration | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET` |
| **Bitbucket** | Integration | `BITBUCKET_CLIENT_ID`, `BITBUCKET_CLIENT_SECRET` |
| **Asana** | Integration | `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET`, `ASANA_WEBHOOK_SECRET` |
| **Trello** | Integration | `TRELLO_API_KEY`, `TRELLO_WEBHOOK_SECRET` |
| **OpenAI** | AI completions | `OPENAI_API_KEY` |
| **Cohere** | AI completions | `COHERE_API_KEY` |
| **Google GenAI** | AI completions | `GEMINI_API_KEY` |
| **OpenRouter** | AI model routing | `OPENROUTER_API_KEY` |
| **Resend** | Email delivery | `RESEND_API_KEY` |
| **VAPID keys** | Push notifications | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |

## API Routes

Key API route categories (app/api/):

- `/auth` - Clerk OAuth callbacks, user preferences
- `/billing` - Checkout sessions, webhook handlers, payment success/failure
- `/webhooks` - Clerk webhooks (Svix signed), Inngest (INNGEST_SIGNING_KEY), Flow³ bridge (Bearer), billing cron
- `/nova` - AI chat, conversations, Nova agent routes
- `/flow` / `/flow3` - Flow³ native chat bridge (Bearer `FLOW_BRIDGE_SECRET`)
- `/inngest` - Inngest webhook endpoint
- `/integrations` - Connect/disconnect third-party services (GitHub, Slack, etc.)
- `/projects`, `/tasks`, `/boards`, `/teams` - CRUD operations
- `/documents`, `/forms`, `/calendar`, `/sprints` - Project management features
- `/admin` - Admin-specific endpoints

## Background Jobs and Scheduled Tasks

Inngest functions with cron triggers:

| Function | Trigger | Purpose |
|---|---|---|
| `billing-dunning-cron` | `*/6 * * * *` (every 6 min) | Run dunning logic |
| `billing-trial-expiration` | `0 2 * * *` (daily 2am UTC) | Expire trials |
| `billing-trial-reminder` | `0 8 * * *` (daily 8am UTC) | Send trial reminders |
| `billing-sub-expiration` | `0 3 * * *` (daily 3am UTC) | Expire canceled subscriptions |
| `billing-downgrade-scheduling` | `0 4 * * *` (daily 4am UTC) | Process scheduled plan downgrades |
| `billing-data-retention` | `0 5 * * *` (daily 5am UTC) | Cleanup deactivated workspace data |
| `task-deadline-reminders` | `*/30 * * * *` (every 30 min) | Send task deadline reminders |
| `overdue-task-detection` | `*/15 * * * *` (every 15 min) | Detect and notify overdue tasks |
| `calendar-event-reminders` | `*/15 * * * *` (every 15 min) | Send calendar event reminders |
| `missed-calendar-events` | `*/15 * * * *` (every 15 min) | Notify of missed calendar events |
| `smart-alerts` | `0 * * * *` (hourly) | Smart alerts: unassigned tasks, no due dates, stuck tasks |
| `daily-digest` | `0 7 * * *` ( daily 7am UTC) | Daily summary email |
| `weekly-digest` | `0 8 * * 1` (Mon 8am UTC) | Weekly summary email |
| `nova-suggestions` | `*/6 * * * *` (every 6 hr) | Nova AI suggestions |
| `insight-digest-email` | `0 8 * * 1` (Mon 8am UTC) | Weekly Nova insight digest |
| `activity-retention-cleanup` | `0 3 * * *` (daily 3am UTC) | Delete old activity records |
| `archive-read-notifications` | `0 4 * * *` (daily 4am UTC) | Auto-archive read notifications |
| `activity-digest-email` | `0 8 * * *` (daily 8am UTC) | Activity digest email |
| `due-date-passed-cron` | `0 * * * *` (hourly) | Fire DUE_DATE_PASSED for overdue tasks |
| `execute-automation` | Event: `automation/triggered` | Execute automation rules |

**Billing Cron**: Requires `BILLING_CRON_ENABLED=true` (default) and `CRON_SECRET` environment variable. See `lib/billing/cron-enabled.ts`. Only disable explicitly for local dev.

## Security Considerations

- **Middleware authentication**: Clerk middleware protects routes; public routes explicitly listed
- **Rate limiting**: Redis sliding window (120 writes/600 reads per 60s per token) - `lib/rate-limit.ts`
- **CSP headers**: Next.js `next.config.js` sets comprehensive Content-Security-Policy (see middleware.ts headers)
- **Security headers**: X-Content-Type-Options: nosniff, X-Frame-Options: DENY, X-XSS-Protection: 1; mode=block, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: camera=(), microphone=(), geolocation=()
- **Webhook verification**: 
  - Clerk webhooks via Svix (signed using `CLERK_WEBHOOK_SECRET`)
  - Inngest via `INNGEST_SIGNING_KEY`
  - Flow³ bridge via `FLOW_BRIDGE_SECRET` (Bearer token validation in `/lib/nova/bridge`)
  - Paystack via HMAC-SHA512 `PAYSTACK_SECRET_KEY`
  - Ivno via HMAC-SHA256
  - Flutterwave signature verification
- **Prompt injection guard**: `lib/nova/security-guard` - `detectPromptInjection` function
- **Secret leakage detection**: `detectSecretLeakage` function in security guard
- **Input sanitization**: `sanitizeUserInput` strips XSS scripts
- **Field encryption**: `lib/field-encryption.ts` - encrypt/decrypt sensitive user data
- **CORS**: Configured per integration; no wildcard origins in production
- **HTTPS enforcement**: Middleware redirects http:// to https://www domain

## Known Limitations and Incomplete Areas

**Park Flow³ feature**: Flow³ AI chat code is intact but sidebar navigation item was removed from UI. To re-enable, re-add the nav item in `components/dashboard/sidebar.tsx` and restore the `/flow3` page route. (See `FLOW3-HANDOFF.md`)

**MONGODB_URI ambiguity**: Multiple env entries exist (base, _1.._4). Runtime resolution unverified - app works via whichever resolves at runtime. (See `FLOW3-HANDOFF.md:18`)

**Vercel token expired**: `C:\Users\NAOMIS\AppData\Roaming\xdg.data\com.vercel.cli\auth.json` expired 2026-08-21. Needs refresh before any Vercel CLI/API work. (See `FLOW3-HANDOFF.md:19`)

**Ivno payment limitation**: Ivno does not support off-session recurring charges - renewals are skipped for Ivno workspaces (see `lib/billing/orchestrator.ts:162`). Manual payment URL required.

**Flutterwave `currencies` getter**: The `currencies` property on FlutterwaveProvider is a getter that checks `FLUTTERWAVE_SECRET_KEY` existence at runtime, which may cause unexpected behavior if the key is set after initial load.

**No code comments**: Repository follows a style of minimal inline comments. Functional documentation is in source code and FLOW3-HANDOFF.md.

**Prisma migration**: Schema has evolved organally; `previewFeatures` may be needed for some relations. Verify `prisma generate` compatibility after schema changes.

**Automation permissions**: `legacyActionToType` in `automation-executor.ts` defaults to `"send_notification"` for unknown actions - may silently convert legacy action codes.

**Redis dependency for rate limiting**: Rate limiting fails open (allows requests) when Redis is unavailable, which may allow burst traffic during outages.

## Environment Variables (Names Only)

```
MONGODB_URI
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
OAUTH_STATE_SECRET
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
IVNO_API_KEY
IVNO_API_SECRET
IVNO_API_URL
FLUTTERWAVE_SECRET_KEY
FLUTTERWAVE_PUBLIC_KEY
FLUTTERWAVE_SECRET_HASH
PAYSTACK_SECRET_KEY
BILLING_CRON_ENABLED
CRON_SECRET
ABLY_API_KEY
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET
SLACK_SIGNING_SECRET
NEXT_PUBLIC_APP_URL
RESEND_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
GEMINI_API_KEY
COHERE_API_KEY
OPENAI_API_KEY
MEM0_API_KEY
ENCRYPTION_KEY
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_WEBHOOK_SECRET
BITBUCKET_CLIENT_ID
BITBUCKET_CLIENT_SECRET
ASANA_CLIENT_ID
ASANA_CLIENT_SECRET
ASANA_WEBHOOK_SECRET
TRELLO_API_KEY
TRELLO_WEBHOOK_SECRET
OPENROUTER_API_KEY
```

## Local Development Setup

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
   (Also runs `scripts/fix-vibe-core.cjs` via `postinstall` hook)

3. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in all required values from the comments in `.env.example`
   - Critical: `MONGODB_URI`, Clerk keys, payment provider keys, Ably key, PostHog keys, Resend key, Cloudinary credentials

4. **Database setup**:
   ```bash
   npx prisma generate
   npx prisma db push  # or use migration workflow
   ```

5. **Run development server**:
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:3000`

6. **Run lint**:
   ```bash
   npm run lint
   ```

7. **Run unit tests**:
   ```bash
   npm run test
   ```

8. **Run e2e tests**:
   ```bash
   npm run test:e2e
   ```

## Database Setup and Migrations

- **Prisma schema**: `prisma/schema.prisma` defines all models and relationships
- **MongoDB connection**: `MONGODB_URI` environment variable (MongoDB Atlas connection string or local MongoDB)
- **Generate Prisma client**:
  ```bash
  npx prisma generate
  ```
- **Push schema changes**:
  ```bash
  npx prisma db push
  ```
- **Create migration**:
  ```bash
  npx prisma migration save --name <migration_name>
  npx prisma migrate deploy
  ```
- **Seed/reset database**: No seed script currently; data is created via onboarding flow and API operations

## Testing Instructions

- **Unit tests**: `npm run test` runs vitest
- **Test coverage**: 17 unit test files in `tests/unit/`, covering:
  - Constants, logger, field encryption
  - Output validator (harmful content detection)
  - Security guard (prompt injection, secret leakage, input sanitization)
  - Build tools factory (AI tool functions)
  - Provider health, intent router
  - Decision framework
  - Billing services, plan limits
  - Proactive intelligence, RAG pipeline
  - Reporting intelligence, risk prediction
  - Smart automation, file upload
  - Model router, automation engine

- **E2E tests**: `npm run test:e2e` runs playwright tests
- **Flow bridge tests**: `tests/flow-bridge.test.ts` validates bridge secret, message conversion, identity extraction, workspace extraction, confirmation/denial detection
- **Test infrastructure**: vitest with `@vitest/coverage-v8`, tests import from `@/lib/*` paths resolved via tsconfig paths `@/*`

## Production Deployment Process

- **Platform**: Vercel (configured via `next.config.js`)
- **Build**: `npm run build` (runs `prisma db push --skip-generate || echo ...`, `prisma generate`, `next build`)
- **Output**: `standalone` mode when `ANALYZE=true`, otherwise standard Next.js build
- **Redirects**: 
  - `http://thetapm.site/*` → `https://www.thetapm.site/*` (except `/api/*` for OAuth stability)
  - Configured in `next.config.js:redirects()`
- **Security headers**: Configured in `next.config.js:headers()` including CSP, HSTS, frame-options, content-security-policy
- **Domain**: `BASE_DOMAIN` and `WWW_DOMAIN` env vars control canonical domain redirects
- **Vercel CLI**: Requires valid API token (note: token expired 2026-08-21 per FLOW3-HANDOFF.md)
- **Environment variable deployment**: All env vars from `.env.example` must be set in Vercel project dashboard

## Integrations and External Services (Detailed)

### Payment Providers

- **Paystack** (NGN only): Full subscription, payment intent, checkout, webhook support
- **Ivno** (USD/EUR/GBP): Payment intents and checkout sessions; **no off-session recurring charging** - renewals use Paystack only
- **Flutterwave** (USD/EUR/GBP): Full subscription, payment intent, checkout, webhook, and tokenized charge support

### Communication integrations

- **Slack**: OAuth app with client ID/secret/signing secret; workspace integration for notifications
- **GitHub**: OAuth app with webhook support for repository sync
- **Bitbucket**: OAuth app integration
- **Asana**: OAuth app integration with webhook support
- **Trello**: OAuth app integration with webhook support
- **WooCommerce**: Integration for e-commerce workflows

### AI Providers

- **OpenAI**: `gpt-4o`, `gpt-4o-mini` via LangChain
- **Cohere**: `command-r`, `command-r-plus` via `@langchain/cohere`
- **Google GenAI**: Gemini models via `@langchain/google-genai`
- **OpenRouter**: Model routing with `OPENROUTER_API_KEY`
- **Mem0**: AI memory system via `MEM0_API_KEY`

## Billing Implementation and Subscription Restrictions

- **Three pricing plans**: free, growth, pro, theta_plus (from Prisma schema)
- **Billing intervals**: monthly, annual
- **Payment providers**: Paystack (NGN), Ivno (USD/EUR/GBP), Flutterwave (USD/EUR/GBP)
- **Trial support**: Workspaces can start trials; trial expiration handled by Inngest cron
- **Dunning**: Automatic retries for failed payments, escalation to deactivated status
- **Plan changes**: Scheduled downgrades supported (set `scheduledPlanKey` and `scheduledEffectiveDate`)
- **Data retention**: Deactivated workspaces have `dataRetentionUntil`; cron cleanup removes data after retention period
- **Ivno limitation**: No off-session charging - Ivno workspaces require manual payment for renewals (billing cron skips Ivno)
- **Billing cron must be enabled**: `BILLING_CRON_ENABLED=true` default; requires `CRON_SECRET` for Inngest function triggers
- **Active states**: `trialing`, `active`, `past_due`, `canceled` (from `subscription-state-machine.ts`)
- **Write allowed states**: `trialing`, `active`, `past_due`
- **Payment required states**: `past_due`, `deactivated`

## Error Handling, Validation, Logging, and Security Controls

- **Error responses**: API routes return JSON errors with codes (e.g., `"auth/session-expired"`)
- **Validation**: Zod schemas for API route input validation (e.g., form fields, billing inputs)
- **Prompt injection**: `detectPromptInjection` in `lib/nova/security-guard` guards AI input
- **Secret leakage**: `detectSecretLeakage` detects API keys in user text
- **Input sanitization**: `sanitizeUserInput` strips XSS from user content
- **Rate limiting**: Redis sliding window, fails open on Redis unavailability
- **Logging**: `lib/logger.ts` with request timing warnings (`[Auth] Slow getCurrentUser`, `[Billing] Renewal failed`, etc.)
- **Field encryption**: `lib/field-encryption.ts` encrypts sensitive data before DB storage
- **Webhook signature verification**: Each provider (Clerk/Svix, Inngest, Paystack, Ivno, Flutterwave) verifies webhook signatures
- **Clerk webhook**: Must bypass session auth in middleware (signed via Svix)
- **Inngest webhook**: Must bypass session auth in middleware (signed via INNGEST_SIGNING_KEY)
- **Flow³ bridge**: Must bypass session auth in middleware (Bearer `FLOW_BRIDGE_SECRET` validated in-app)
- **Billing cron**: Must bypass session auth in middleware (Bearer `CRON_SECRET` validated in-app)

## Testing Infrastructure and Existing Test Coverage

- **Unit tests**: Vitest + `@vitest/coverage-v8`, 17 test files in `tests/unit/`
- **Integration tests**: 3 files in `tests/integration/` (AI pipeline, AI tools, langgraph flow)
- **Smoke test**: `tests/smoke.test.ts` - constants, logger, field encryption, output validator, security guard, build tools, telemetry, provider health, intent router, decision framework
- **E2E tests**: Playwright test suite (`npm run test:e2e`)
- **Flow bridge tests**: `tests/flow-bridge.test.ts` - bridge secret validation, message conversion, identity extraction, workspace extraction, approval/denial detection, OpenAI completion streaming
- **Test environment**: `vitest.config.ts` configured with appropriate path aliases
- **Test execution**: `npm test` runs all vitest; `npm run test:watch` for watch mode

## Deployment Configuration and Environment Variable Names

- **Platform**: Vercel
- **Build command**: `npm run build`
- **Output**: Standalone mode when `ANALYZE=true`
- **Key environment variable categories**:
  - Database: `MONGODB_URI`
  - Authentication: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
  - Analytics: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
  - Payments: `PAYSTACK_SECRET_KEY`, `IVNO_API_KEY`, `IVNO_API_SECRET`, `IVNO_API_URL`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_HASH`
  - Billing: `BILLING_CRON_ENABLED`, `CRON_SECRET`
  - Real-time: `ABLY_API_KEY`
  - Slack: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`
  - Email: `RESEND_API_KEY`
  - File storage: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - AI: `GEMINI_API_KEY`, `COHERE_API_KEY`, `OPENAI_API_KEY`, `MEM0_API_KEY`, `OPENROUTER_API_KEY`
  - Encryption: `ENCRYPTION_KEY`
  - Integrations: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `BITBUCKET_CLIENT_ID`, `BITBUCKET_CLIENT_SECRET`, `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET`, `ASANA_WEBHOOK_SECRET`, `TRELLO_API_KEY`, `TRELLO_WEBHOOK_SECRET`
  - App URLs: `NEXT_PUBLIC_APP_URL`
  - Browser use: `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`, `HEADLESS`, `BROWSER_USE_PATH`

## Items Requiring Manual Verification

- Flow³ re-enablement: Requires re-adding sidebar nav item and restoring `/flow3` page route
- MONGODB_URI: Verify which env entry resolves at runtime (entries: base, _1, _2, _3, _4)
- Vercel API token: Expired as of 2026-08-21; needs refresh for deployment
- Billing cron in production: Verify `CRON_SECRET` is set and Inngest cron functions are active
- SSL/TLS certificate: Verify production domain certificate is valid and auto-renewing
- Ably real-time: Verify API key is valid and channels are functioning
- Push notifications: VAPID key configuration unverified if not set in production
- Flutterwave plan creation: The `resolveOrCreatePlan` method creates plans on-demand; verify behavior under load
- Custom field metadata: Despite Prisma map to `attachments`, stores custom field metadata, not file attachments (see `Task.customFieldMetadata` comment in schema)
- Member access control: `cachedCanAccessProject` has 60s cache TTL; access changes may not be immediate
- Data retention: Verify `dataRetentionUntil` logic and cleanup cron behavior matches expectations
- Automation condition evaluation: `evaluateConditions` in `lib/automations/conditions` - edge cases may exist
- Webhook payload handling: Each integration's webhook parser may have edge cases with malformed payloads