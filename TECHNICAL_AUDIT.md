# Technical Audit Report: Theta PM

## Executive Summary

Theta PM is a full-stack project management application built on Next.js 14 with MongoDB (Prisma ORM), offering task management, project tracking, real-time collaboration, AI-assisted workflows, and billing across three payment providers (Paystack/NGN, Ivno/USD-EUR-GBP, Flutterwave/USD-EUR-GBP). The codebase is well-structured with comprehensive feature coverage, but contains several noted limitations and infrastructure items requiring verification before transfer.

**Key findings:**
- **Architecture**: Next.js app router with server/components, Prisma/MongoDB, Clerk auth, Inngest background jobs, Ably real-time
- **Revenue-generating functionality**: Fully implemented with three payment providers, subscription management, dunning, and renewal cron
- **Technical debt/limitations**: Flow³ feature parked from UI, MONGODB_URI env ambiguity, expired Vercel token, Ivno off-session charging limitation
- **Test coverage**: 17 unit test files + 3 integration test files + smoke test + E2E suite; good coverage of core functionality
- **Security**: Middleware authentication, rate limiting, CSP headers, webhook signature verification across all providers; fails-open rate limiting on Redis unavailability

---

## Architecture Overview

- **Framework**: Next.js 14 (app router), React 18, TypeScript
- **Router**: File-based app router with `(dashboard)` and `(marketing)` route groups
- **Database**: MongoDB via Prisma 5 ORM with 50+ models and defined relationships
- **Authentication**: Clerk Next.js integration (JWT sessions, OAuth)
- **Background processing**: Inngest with 30+ cron-triggered functions for billing, notifications, automation
- **Real-time**: Ably Realtime service for workspace-wide events
- **Analytics**: PostHog event tracking
- **Email**: Resend transactional email service
- **File storage**: Cloudinary for images/assets
- **Payments**: Paystack (NGN), Ivno (USD/EUR/GBP), Flutterwave (USD/EUR/GBP)

**Key directories:**
- `/app/` - Next.js pages and API routes
- `/lib/` - Business logic (billing, auth, email, notifications, scheduling, services)
- `/prisma/` - MongoDB schema with 50+ models
- `/components/` - React UI components (shadcn/ui, Radix, Tiptap)
- `/tests/` - Vitest + Playwright test suite

---

## Verified Implemented Functionality

| Area | Status | Notes |
|---|---|---|
| Task CRUD | Fully implemented | Tasks, subtasks, checklists, dependencies, time tracking, progress tracking |
| Project management | Fully implemented | Projects, boards, columns, teams, team members, visibility settings |
| Authentication | Fully implemented | Clerk integration, session management, role-based access (owner/admin/member/guest) |
| Billing & subscriptions | Fully implemented | 3 payment providers, trial support, dunning, scheduled downgrades, data retention |
| Real-time features | Fully implemented | Ably-powered workspace/project/task/chat channels |
| AI/chat functionality | Partially implemented | Flow³ chat code intact but parked from UI; native chat at `/flow3` with SSE streaming |
| Automation/rule engine | Fully implemented | Inngest-triggered automations, condition evaluation, action execution |
| Notifications | Fully implemented | Email, push, Ably, Slack multi-channel delivery with preferences and DND |
| Calendar & scheduling | Fully implemented | Recurring events, reminders, sprint planning |
| Document management | Fully implemented | Hierarchical documents, versioning, comments, templates, visibility settings |
| Integration marketplace | Fully implemented | GitHub, Slack, Trello, Asana, Bitbucket, WooCommerce with OAuth and webhooks |
| Onboarding flow | Fully implemented | Welcome email, workspace setup, team invitations, feature tour |

---

## Authentication and Authorization Assessment

**Verified:**
- Clerk middleware provides session authentication for all routes
- Public routes explicitly listed in `middleware.ts:isPublicRoute` (15 routes including /, /pricing, /sign-in, /sign-up, /api/webhooks, /api/inngest, /api/flow)
- API routes return JSON 401 when unauthenticated; page routes redirect to `/sign-in`
- Canonical domain enforcement: `http://thetapm.site` → `https://www.thetapm.site` (except `/api/*`)
- Rate limiting: Redis sliding window (120 writes / 600 reads per 60s per token) - fails open on Redis unavailability
- Workspace access checks: `verifyWorkspaceAccess` (cached 30s), `requireWorkspaceAdmin` for billing mutations
- Project access control: `cachedCanAccessProject` with 60s TTL in notification engine
- Role hierarchy: `owner` > `admin` > `member` > `guest` (Prisma `WorkspaceMember.role`)
- Automation permissions: `checkAutomationPermissions` blocks viewer-only actions (create_task, assign_task, set_status, etc.)

**Areas requiring verification:**
- Session expiry behavior and refresh mechanism (profile refresh throttled to once/5min per user)
- Cross-workspace data access prevention - verify no accidental workspace enumeration via API
- Third-party OAuth callback validation (Clerk handles this, but custom integrations may vary)

**Files involved:** `middleware.ts`, `lib/auth.ts`, `lib/workspace.ts`, `lib/notification-engine.ts`, `lib/automation-executor.ts`, `prisma/schema.prisma`

---

## Integration Inventory

| Integration | Provider | Status | Webhook | OAuth |
|---|---|---|---|---|
| **GitHub** | GitHub | Implemented | ✅ Webhook secret configured | ✅ Client ID/secret |
| **Slack** | Slack | Implemented | ✅ Signing secret configured | ✅ Client ID/secret |
| **Trello** | Trello | Implemented | ✅ Webhook secret configured | ✅ API key |
| **Asana** | Asana | Implemented | ✅ Webhook secret configured | ✅ Client ID/secret |
| **Bitbucket** | Bitbucket | Implemented | ❓ Webhook secret in `.env.example` | ✅ Client ID/secret |
| **WooCommerce** | WooCommerce | Implemented | ❓ Webhook configuration | ❓ |
| **PostHog** | Analytics | Implemented | ❓ | ✅ Project key |
| **Ably** | Real-time | Implemented | ❓ | ✅ API key |
| **Resend** | Email | Implemented | ❓ | ❓ |
| **Cloudinary** | File storage | Implemented | ❓ | ❓ |
| **Paystack** | Payments (NGN) | Implemented | ✅ HMAC-SHA512 verification | ❓ |
| **Ivno** | Payments (USD/EUR/GBP) | Implemented | ✅ Status-based mapping | ❓ |
| **Flutterwave** | Payments (USD/EUR/GBP) | Implemented | ✅ Event-based mapping | ❓ |
| **OpenAI** | AI completions | Implemented | ❓ | ✅ API key |
| **Cohere** | AI completions | Implemented | ❓ | ✅ API key |
| **Google GenAI** | AI completions | Implemented | ❓ | ✅ API key |
| **OpenRouter** | AI model routing | Implemented | ❓ | ✅ API key |

**Files involved:** `lib/billing/providers/`, `lib/integrations/`, `lib/inngest/functions/`, `prisma/schema.prisma` (integrations model)

---

## Deployment and Infrastructure Overview

- **Platform**: Vercel (configured in `next.config.js`)
- **Build command**: `npm run build` (prisma db push, prisma generate, next build)
- **Output**: Standalone mode when `ANALYZE=true`; standard build otherwise
- **Domain redirects**: `http://thetapm.site/*` → `https://www.thetapm.site/*` (except `/api/*`)
- **Security headers**: CSP, HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy (next.config.js headers)
- **Environment variables**: 60+ env vars documented in `.env.example`
- **Vercel token**: Expired as of 2026-08-21 (per FLOW3-HANDOFF.md:19) - requires refresh before any deployment
- **Redis**: Used for rate limiting and Inngest function state; URL configured via environment
- **MongoDB**: Atlas or local; connection string via `MONGODB_URI` env var
- **Default plan**: Free tier available; paid plans: growth, pro, theta_plus

**Files involved:** `next.config.js`, `.env.example`, `package.json` (scripts), `prisma/schema.prisma`

---

## Security Findings (Severity classified)

### Critical

1. **Expired Vercel API token** (`FLOW3-HANDOFF.md:19`)
   - Location: Local file `C:\Users\NAOMIS\AppData\Roaming\xdg.data\com.vercel.cli\auth.json`
   - Impact: Cannot deploy via Vercel CLI until refreshed
   - Recommendation: Obtain new Vercel token; rotate any secrets that were accessible via old token

2. **MONGODB_URI environment ambiguity** (`FLOW3-HANDOFF.md:18`)
   - Location: `.env.example` line 3; multiple env entries exist (base, _1.._4)
   - Impact: Runtime resolution unverified; which cluster is active at acquisition time?
   - Recommendation: Clarify which MONGODB_URI is correct; document the active cluster

3. **Accidentally committed credentials** - *investigate*
   - Location: Check git history for committed `.env` files, committed secrets
   - Impact: If secrets are in git history, they are exposed to anyone with repo access
   - Recommendation: Rotate any credentials potentially committed; remove from git history via `git filter-branch` or BFG (non-destructive approach not recommended without buyer consent)

### High

4. **Ivno off-session charging limitation** (`lib/billing/orchestrator.ts:162`)
   - Location: `lib/billing/orchestrator.ts` - Ivno renewal skipped with comment
   - Impact: Ivno workspaces require manual payment for renewals; automated billing does not work
   - Recommendation: Document as known limitation; buyer should evaluate if Ivno is a primary revenue driver

5. **Fails-open rate limiting on Redis unavailability** (`lib/rate-limit.ts:52-55`)
   - Location: `lib/rate-limit.ts` - allows requests when Redis throws
   - Impact: During Redis outages, rate limiting does not protect against burst traffic
   - Recommendation: Consider this acceptable for now; Redis is a safeguard, not hard dependency

6. **No code comments** (repository style)
   - Location: Throughout source code
   - Impact: New team members need time to understand codebase; FLOW3-HANDOFF.md documents Flow³ specifics
   - Recommendation: Budget ramp-up time; consider adding strategic comments

### Medium

7. **Flow³ parked from UI, code intact** (`FLOW3-HANDOFF.md:5-8`)
   - Location: Sidebar nav removed; `/flow3` page code remains
   - Impact: Feature not accessible to users; requires re-enablement
   - Recommendation: Decision needed by buyer whether to re-launch Flow³

8. **Flutterwave `currencies` getter** (`lib/billing/providers/flutterwave-provider.ts:13-15`)
   - Location: FlutterwaveProvider.currencies is a getter checking `FLUTTERWAVE_SECRET_KEY`
   - Impact: May return empty array if key not set at runtime; unexpected behavior possible
   - Recommendation: Verify behavior; ensure key is set in production

9. **Clerk webhook bypass in middleware** (`middleware.ts:18-21`)
   - Location: `isPublicRoute` includes `/api/webhooks(.*)` without session auth
   - Impact: Webhooks delivered from shared IPs without per-session auth; expected pattern for signed webhooks
   - Recommendation: Verify Svix webhook signing is correctly configured in Clerk dashboard

10. **Inngest webhook bypass in middleware** (`middleware.ts:19`)
    - Location: `isPublicRoute` includes `/api/inngest(.*)` without session auth
    - Impact: Inngest cloud signed via `INNGEST_SIGNING_KEY`; expected pattern
    - Recommendation: Verify INNGEST_SIGNING_KEY is configured and matching

### Low

11. **Flutterwave provider creates plans on-demand** (`lib/billing/providers/flutterwave-provider.ts:395-411`)
    - Location: `resolveOrCreatePlan` method creates Flutterwave plans if not found
    - Impact: May create unexpected plans under load; plan IDs not persisted reliably
    - Recommendation: Buyer should test plan creation flow under production load

12. **No dedicated backup procedure** documented
    - Location: No backup script or procedure found in repository
    - Impact: Risk of data loss if MongoDB cluster has issues
    - Recommendation: Establish backup procedure as part of onboarding

---

## Testing and Reliability Assessment

**Test suite composition:**
- **17 unit test files** in `tests/unit/` covering: constants, logger, field encryption, output validator, security guard, build tools, provider health, intent router, decision framework, billing services, plan limits, proactive intelligence, RAG pipeline, reporting intelligence, risk prediction, smart automation, file upload, model router, automation engine
- **3 integration test files** in `tests/integration/` covering: AI pipeline, AI tools, langgraph flow
- **Smoke test** (`tests/smoke.test.ts`): Constants, logger, field encryption, output validator, security guard, build tools, telemetry, provider health, intent router, decision framework
- **E2E test suite** (`npm run test:e2e`): Playwright tests
- **Flow bridge test** (`tests/flow-bridge.test.ts`): Bridge secret validation, message conversion, identity extraction, workspace extraction, approval/denial detection, OpenAI completion streaming

**Test coverage assessment:**
- Strong coverage of core business logic (billing, auth, security, plan limits)
- Good coverage of API route validation and input sanitization
- Coverage of Inngest function signatures and event structures
- Light coverage of UI component rendering (no component-level snapshot tests)
- No performance or load testing found
- Edge cases in webhook parsing may be untested

**Test execution:**
- `npm run test` - runs vitest unit tests
- `npm run test:watch` - watch mode
- `npm run test:e2e` - playwright E2E tests
- `npm run bench:flow` - flow benchmark script (if exists)

**Reliability observations:**
- Inngest functions have idempotent designs where possible (step.run with unique IDs)
- Billing cron has graceful skip when `BILLING_CRON_ENABLED=false`
- Rate limiting fails open (allows requests) on Redis failure - acceptable for safeguard-only pattern
- Ably real-time errors are caught and do not break main flow (see `lib/ably.ts:74-75`)
- Email errors are logged but do not break main flow (Resend key check in `lib/email.ts:87-90`)

---

## Known Limitations and Incomplete Areas

1. **Flow³ feature parked from UI** (`FLOW3-HANDOFF.md:5-8`)
   - Sidebar nav item removed; code intact in `/flow3` page, `/api/flow3/chat` SSE route, `/api/nova/conversations` CRUD
   - Re-enablement: re-add nav item in `components/dashboard/sidebar.tsx` + restore `/flow3` page route
   - Code comments: "Hidden from UI, code intact"

2. **MONGODB_URI env ambiguity** (`FLOW3-HANDOFF.md:18`)
   - Multiple entries exist: base, _1, _2, _3, _4
   - `_1` = old DB, `_2`/_3 = dead Atlas clusters, `_4` = empty
   - App works; runtime resolution unverified
   - "Don't touch" per handoff note

3. **Vercel API token expired** (`FLOW3-HANDOFF.md:19`)
   - `C:\Users\NAOMIS\AppData\Roaming\xdg.data\com.vercel.cli\auth.json` expired 2026-08-21 ~18:49 UTC
   - Requires refresh before any Vercel CLI/API work

4. **Ivno no off-session charging** (`lib/billing/orchestrator.ts:162`)
   - Renewals skipped for Ivno workspaces; manual payment URL required
   - Comment: "Ivno is skipped because it requires a manual payment URL (no off-session charging)"

5. **Flutterwave `currencies` getter runtime dependency** (`lib/billing/providers/flutterwave-provider.ts:13-15`)
   - `currencies` getter checks `FLUTTERWAVE_SECRET_KEY` existence at runtime

6. **No code comments** (repo style)
   - Functional documentation exists in FLOW3-HANDOFF.md and source code structure
   - New developers should budget ramp-up time

7. **Prisma migration preview features** may be needed
   - Schema has organically evolved; `prisma generate` compatibility should be verified after schema changes

8. **Automation condition evaluation edge cases** (`lib/automations/conditions`)
   - `evaluateConditions` function; insufficient test coverage for complex condition paths

9. **Data retention logic** (`lib/billing/orchestrator.ts:311-344`)
   - Cleanup of deactivated workspace data; verify `dataRetentionUntil` calculations match business policy

10. **Cross-workspace data access potential**
    - Member checks exist but edge cases may exist in deeply nested queries (tasks → projects → workspaces)

11. **Browser use bridge status unclear**
    - `OPENROUTER_API_KEY` present in `.env.example`; browser-use related code paths exist but Flow³ is parked

12. **Automation `generate_report` not implemented** (`lib/inngest/functions/automation-executor.ts:579-580`)
    - Explicitly returns `{ ok: false, detail: "generate_report is not implemented" }`

---

## Dependency and Licensing Review

**Production dependencies and licenses:**

| Package | Purpose | License | Notes |
|---|---|---|---|
| **next** | Framework | MIT | Next.js 14 |
| **react** / **react-dom** | UI | MIT | React 18 |
| **prisma** | ORM | Apache-2.0 | MongoDB driver |
| **@clerk/nextjs** | Auth | varies | Clerk SDK |
| **@tailwindcss/tailwindcss** | Styling | MIT | Tailwind 3.4 |
| **@radix-ui/react-*** | UI components | MIT | Accessible primitives |
| **shadcn-ui** (via `@vibe/core`) | UI | MIT | Component library |
| **zod** | Validation | MIT | Input validation |
| **resend** | Email | varies | Transactional email |
| **posthog-js** / **posthog-node** | Analytics | varies | Event tracking |
| **ably** | Real-time | Apache-2.0 | Realtime service |
| **inngest** | Background jobs | MIT | Cron/triggers |
| **langchain-*** | AI integrations | MIT/Apache-2.0 | OpenAI, Cohere, Google, etc. |
| **@ai-sdk/openai** | AI SDK | MIT | AI tool calling |
| **web-push** | Push notifications | MIT | WebPUSH with VAPID |
| **clsx** / **class-variance-authority** | Utility functions | MIT | Class management |
| **dnd-kit** | Drag-and-drop | MIT | Sortable interactions |
| **fullcalendar-*** | Calendar | MIT | Event calendar |
| **recharts** | Charts | MIT | Data visualization |
| **leaflet** | Maps | BSD-2-Clause | Map library |
| **lucide-react** | Icons | MIT | Icon set |
| **tiptap** / **@tiptap/*** | Rich text | MIT | Editor framework |
| **pdf-parse** | PDF parsing | MIT | Document processing |
| **mammoth** | DOCX parsing | MIT | Document processing |
| **jspdf** / **jspdf-autotable** | PDF generation | MIT | Report generation |
| **sonner** | Notifications | MIT | Toast notifications |
| **date-fns** | Date handling | MIT | Date operations |
| **crypto-js** (implied) | Crypto | MIT | Various crypto ops |

**Direct dependencies count**: ~120 packages across `dependencies` and `devDependencies`

**Licensing notes:**
- All major dependencies use permissive licenses (MIT, Apache-2.0, BSD)
- No GPL or copyleft dependencies detected
- `baseline-browser-mapping` package in devDependencies - verify license compatibility
- Some `@langchain/*` packages may have additional restrictions; verify upon acquisition

**Files involved:** `package.json`, `package-lock.json`

---

## Items Requiring Manual Verification

| Item | File/Module | Priority |
|---|---|---|
| Verify active MONGODB_URI env entry | `.env.example:3`, `prisma/schema.prisma:6` | Critical |
| Refresh Vercel API token | `C:\Users\NAOMIS\AppData\Roaming\xdg.data\com.vercel.cli\auth.json` | Critical |
| Investigate accidentally committed credentials | Git history, `.env` files | Critical |
| Test Flow³ re-enablement flow | `components/dashboard/sidebar.tsx`, `app/flow3/` | High |
| Verify Flutterwave `currencies` behavior | `lib/billing/providers/flutterwave-provider.ts:13-15` | High |
| Verify INNGEST_SIGNING_KEY configuration | `middleware.ts:19`, `.env.example` | High |
| Verify Svix Clerk webhook signing | `middleware.ts:18`, Clerk dashboard | High |
| Test billing cron with CRON_SECRET | `lib/billing/cron-enabled.ts`, `lib/billing/orchestrator.ts:143` | High |
| Verify data retention logic and TTL | `lib/billing/orchestrator.ts:311-344`, `prisma.schema` | Medium |
| Evaluate automation condition edge cases | `lib/automations/conditions.ts` | Medium |
| Verify push notification VAPID key setup | `lib/push-notifications.ts:5-14` | Medium |
| Check baseline-browser-mapping license | `package.json:103` | Low |
| Verify all 60+ env vars are accounted for | `.env.example` full | Medium |
| Test automation `dryRunAutomation` function | `lib/inngest/functions/automation-executor.ts:704-779` | Low |
| Verify III: Slack integration OAuth flow | `lib/integrations/slack.ts` | Medium |
| Verify WooCommerce integration | `lib/services/woocommerceService.ts` | Low |
| Evaluate Mem0 AI memory system | `lib/nova/` directory | Low |
| Verify OAuth state secret rotation | `.env.example:9` | Low |
| Check for unused/legacy code paths | Various directories | Low |

---

## Recommendations for a Prospective Buyer

1. **Immediate infrastructure actions:**
   - Refresh Vercel API token before attempting any deployments
   - Clarify which MONGODB_URI entry is active and document it
   - Scan git history for accidentally committed credentials and rotate any exposed secrets

2. **Feature decisions:**
   - Determine whether to re-enable Flow³ AI chat (code intact but parked from UI)
   - Evaluate Ivno's role in the billing mix (no off-session charging = manual renewals)
   - Assess whether Flutterwave plan creation on-demand is acceptable or should be pre-created

3. **Technical debt to address:**
   - Add strategic code comments for new team members (repo has minimal comments)
   - Consider adding performance/load tests
   - Verify and potentially formalize backup procedures for MongoDB data
   - Review automation condition edge cases with full test coverage

4. **Security hardening:**
   - Ensure all 60+ environment variables are properly set in production
   - Verify webhook signatures for all third-party integrations
   - Consider strict rate limiting mode (currently fails open on Redis failure)
   - Review Clerk webhook configuration in dashboard

5. **Operational readiness:**
   - Establish onboarding procedure for new team members
   - Document deployment process beyond `npm run build`
   - Set up monitoring for Inngest function failures
   - Verify Ably real-time channel functionality under load

6. **Licensing due diligence:**
   - Verify `@langchain/*` package licenses are compatible with proprietary product
   - Check `baseline-browser-mapping` and other devDependency licenses
   - Confirm no GPL-licensed code is inadvertently distributed

7. **Integration validation:**
   - Test all OAuth flows (GitHub, Slack, Trello, Asana, Bitbucket) in staging
   - Validate webhook payload handling for all providers
   - Confirm push notification flow with VAPID keys in production environment