# Flow³ Implementation Checklist

Rename of the AI copilot: **Nova → Flow³**. LobeChat (Vercel, no VPS) = chat UI
shell; Theta's LangGraph agent = the only brain. Bridge = OpenAI-compatible
endpoint inside Theta. Implement strictly in this order (ChatGPT review). Check
off each item only when verified.

**Persona rule:** visible user-facing text says "Flow³" NOW. Code identifiers
stay `Nova*`/`nova:` until Phase 4. Do NOT rename early.

---

## Phase 0 — Baseline benchmark (what exists today)

- [ ] `Theta/flow-benchmark.md` — 18 tasks, 5-dimension rubric, gate criteria (created).
- [ ] `scripts/flow-benchmark.ts` — runner; `npx tsx scripts/flow-benchmark.ts --user <id> --workspace <id>` (created).
- [ ] Run the baseline. **Result = 2 consecutive passes.** Save to `Theta/flow-benchmark-results.md`.

## Phase 1 — Behavior fixes (native /api/ai, no LibreChat yet)

- [ ] `lib/langraph/nodes/tool-executor.ts:22-30` — remove observation-mode block that refuses ALL write tools.
- [ ] `lib/nova/constitution/execution.ts:13-21` — delete "Advisory Role" refusal principle; keep action principles (verify, confirm medium/high risk, no destructive ops).
- [ ] `lib/nova/constitution/index.ts` — trim prompt (currently ~2300 chars; target <1200; keep identity: "Flow³ is Theta PM's AI copilot").
- [ ] `lib/langraph/model-router.ts:53-67,86-100` — stop defaulting EVERYTHING to `gemini-2.5-flash`; use tier routing (fast for trivial, good for creation/analysis); never silently downgrade to flash on free plan.
- [ ] `lib/ai-tools/index.ts:61-101` — refactor `requireToolApproval`: MEDIUM risk → return `confirmation_required` result instead of throwing; HIGH risk still throws (hard block). No confirmation bypass: any multi-step chain containing a medium/high tool must surface the confirmation BEFORE execution.
- [ ] `Theta/Nova audit.txt` — fold in: memory prompt-injection guard, context token budget, tool-level confirmation enforcement.
- [ ] Re-run benchmark (Phase 0 same task set) → **2 consecutive passes** before moving on.

## Phase 2 — Bridge spike (shell → Theta)

- [x] Files created: `lib/nova/confirmation.ts`, `lib/nova/bridge.ts`, `app/api/flow/chat/route.ts`, `app/api/flow/models/route.ts`.
- [x] `.env`: `FLOW_BRIDGE_ENABLED=true`, `FLOW_BRIDGE_SECRET=<long random>` (same in `deploy/lobechat/.env.example`). Set in `.env.local` (local); Vercel env vars added in Phase 3.
- [x] `middleware.ts` — add `/api/flow(.*)` to the public matcher (Clerk must NOT protect bridge routes). Also excluded from the middleware IP rate limiter (bridge rate-limits per email at 20/min; a chat shell is a shared server).
- [x] UI shell plan changed: LibreChat (Docker) was first chosen, but this machine has no virtualization (Intel Pentium B960 — no VT-x/SLAT; Docker/WSL2/Hyper-V impossible) and there is no VPS budget. Replaced with **LobeChat deployed to Vercel** (free tier + Neon Postgres): same OpenAI-compatible protocol, plus per-user identity via a small fork patch (see Phase 3). `deploy/librechat/` was removed; bridge was verified via a standalone server (`scripts/spike-bridge.ts`) — same protocol LibreChat/LobeChat use.
- [x] Spike checks (verified via curl against the real route handlers):
  - Models list returns `flow-3`, `flow-3-fast`; bad/missing Bearer → 401.
  - Read question → real tool-backed answer (projects listed).
  - Single write → executes directly (by design).
  - Bulk write → `flow_confirm` tool-call card (token + reason + args).
  - "Approve" → executes the exact gated action (verified in DB).
  - "Cancel" → no write, pending cleared.
  - Unrelated message while pending → reminder ("There is an action awaiting your confirmation…").
  - Rate limit: 21st request in a minute → 429.
  - Audit: `Activity` rows `action: FLOW3_REQUEST` with model/provider/duration/tools/confirmation metadata.
  - SSE pseudo-streaming chunks work; `X-Flow-User` header and body `user` (addUser) both resolve identity; `conversationId` body field and `X-Flow-Conversation-Id` header both drive continuity.
- [x] FOUND + FIXED (real bug): `getPendingConfirmation` crashed with `"[object Object]" is not valid JSON` — the Upstash REST client returns JSON-shaped values already parsed (`res.json()`), so `JSON.parse(raw)` always threw → pending confirmations were stored but NEVER readable → Approve/Cancel/reminder never worked through the bridge. Fixed with a typeof guard in `lib/nova/confirmation.ts`.
- [ ] Verify the shell actually sends `conversationId` / identity — BLOCKED until the Phase 3 deploy. Bridge accepts body `conversationId`, `X-Flow-Conversation-Id` header, body `user`, and `X-Flow-User` header, so all variants are covered; the `resolveConversationId` fallback stays until a real shell run confirms the body/header fields.
- [x] `tests/flow-bridge.test.ts` — `npx vitest run tests/flow-bridge.test.ts` green (23/23, 2026-08-20).

## Phase 3 — Productionize the bridge (LobeChat on Vercel, no VPS)

- [x] Fork `lobehub/lobe-chat` → `okparannenna91-cloud/lobehub`, branch `flow3-identity` (pinned upstream `v2.2.14`).
- [x] Identity patch (`deploy/lobechat/patches/0001-flow3-identity.patch`, 17 insertions / 1 deletion, verified `git apply` clean): the chat route (`src/app/(backend)/webapi/chat/[provider]/route.ts`) sends the logged-in user's **email** as the body `user` for the provider named by `FLOW3_PROVIDER_ID` (default `flow3`) instead of LobeChat's internal UUID. This is the only change; the bridge already resolves email → Theta user + workspace (Phase 2 spike).
- [x] Deploy kit: `deploy/lobechat/README.md` (import → Neon → env vars → domain → per-user provider setup → verification incl. two-user identity check) + `.env.example` (verified against v2.2.14 env names: `APP_URL`, `DATABASE_URL`, `AUTH_SECRET`, `AUTH_SSO_PROVIDERS`, `AUTH_DISABLE_EMAIL_PASSWORD`, `AUTH_ENABLE_MAGIC_LINK`).
- [x] Theta sidebar: **Flow³ AI** nav item (`components/layout/sidebar.tsx`) opens `chat.thetapm.site` in a new tab — users switch between Theta pages and the chat.
- [ ] Deploy (needs the user's Vercel + Neon accounts): import fork branch → set env vars → domain → per-user provider config. Then run the two-user identity check + full benchmark (Phase 5).
- [ ] Vercel env on Theta: `FLOW_BRIDGE_ENABLED=true`, `FLOW_BRIDGE_SECRET=<same value>` (done with the deploy).
- [ ] Streaming: replace pseudo-streaming word chunks with real incremental SSE if acceptable (note: agent returns full text; v1 chunks are fine).
- [ ] Abort propagation: shell abort → agent cancellation (Inngest/Ably) or documented limitation.
- [ ] Confirmations: re-request pending confirmation after an unrelated user message (currently the reminder reply keeps it pending until approval/denial/expiry).

## Phase 4 — Mechanical rename (LAST)

- [ ] `node scripts/rename-nova-to-flow.mjs --dry-run` → review → `--execute`.
- [ ] Prisma: `nova_agents` → `flow_agents` (+ `@@map`), `npx prisma generate && npx prisma db push`.
- [ ] Rewrite `LANGGRAPH_MIGRATION_STRATEGY.md` → `FLOW_ARCHITECTURE.md` (content is stale — rewrite, don't just rename).
- [ ] `npx tsc --noEmit` + `npm test` green.

## Phase 5 — Full-stack benchmark

- [ ] Run ALL 18 benchmark tasks through the LobeChat UI on production config.
- [ ] Pass gate: no hallucination, no refusals, no internal leakage, confirmation round-trips work, rate limits hold.

---

## File map

| File | Status | Purpose |
|---|---|---|
| `Theta/flow-benchmark.md` | created | 18-task benchmark spec |
| `scripts/flow-benchmark.ts` | created | benchmark runner (tsx) |
| `lib/nova/confirmation.ts` | created | Redis confirmation state machine (`flow:confirm:*`) |
| `lib/nova/bridge.ts` | created | OpenAI-compatible bridge (secret, identity, context, SSE, approvals) |
| `app/api/flow/chat/route.ts` | created | bridge POST route (SSE chat.completions) |
| `app/api/flow/models/route.ts` | created | GET /models |
| `deploy/lobechat/README.md` | created | LobeChat runbook (Vercel + Neon, no VPS) |
| `deploy/lobechat/.env.example` | created | LobeChat env template (v2.2.14 names) |
| `deploy/lobechat/patches/0001-flow3-identity.patch` | created | LobeChat identity patch (email as body `user`) |
| `deploy/lobechat/setup.ps1` | created | clones fork + applies patch locally (sibling folder) |
| `components/layout/sidebar.tsx` | edited (Phase 3) | Flow³ AI nav item → chat.thetapm.site |
| `scripts/rename-nova-to-flow.mjs` | created | Phase 4 mechanical rename |
| `tests/flow-bridge.test.ts` | created | bridge unit tests |
| `.env.example` | edited | added `FLOW_BRIDGE_ENABLED`, `FLOW_BRIDGE_SECRET` |
| `middleware.ts` | TODO (Phase 2) | add `/api/flow(.*)` public matcher |
| `lib/langraph/nodes/tool-executor.ts` | TODO (Phase 1) | remove observation-mode write block |
| `lib/nova/constitution/execution.ts` | TODO (Phase 1) | remove Advisory Role |
| `lib/nova/constitution/index.ts` | TODO (Phase 1) | trim prompt to <1200 chars |
| `lib/langraph/model-router.ts` | TODO (Phase 1) | tier routing, no silent downgrade |
| `lib/ai-tools/index.ts` | TODO (Phase 1) | `confirmation_required` result for MEDIUM risk |
| `Theta/Nova audit.txt` | TODO (Phase 1) | fold in security items |