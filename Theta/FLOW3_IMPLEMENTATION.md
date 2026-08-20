# Flow³ Implementation Checklist

Rename of the AI copilot: **Nova → Flow³**. LibreChat = chat UI shell; Theta's
LangGraph agent = the only brain. Bridge = OpenAI-compatible endpoint inside
Theta. Implement strictly in this order (ChatGPT review). Check off each item
only when verified.

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

## Phase 2 — Bridge spike (LibreChat → Theta)

- [x] Files created: `lib/nova/confirmation.ts`, `lib/nova/bridge.ts`, `app/api/flow/chat/route.ts`, `app/api/flow/models/route.ts`.
- [x] `.env`: `FLOW_BRIDGE_ENABLED=true`, `FLOW_BRIDGE_SECRET=<long random>` (same in `deploy/librechat/.env`). Set in `.env.local` (local) + `deploy/librechat/.env`; still needs Vercel env vars for production.
- [x] `middleware.ts` — add `/api/flow(.*)` to the public matcher (Clerk must NOT protect bridge routes). Also excluded from the middleware IP rate limiter (bridge rate-limits per email at 20/min; LibreChat is a shared server IP).
- [x] `deploy/librechat/` — image pinned to `ghcr.io/danny-avila/librechat:v0.8.7` (config v1.3.13), `librechat.yaml` updated with `X-Flow-User` + `X-Flow-Conversation-Id` header templates, `addUser: true` kept as fallback. Docker Desktop could NOT be used on this machine (Intel Pentium B960 — no VT-x/SLAT virtualization; Docker/WSL2/Hyper-V physically impossible). Verified the bridge via a standalone server (`scripts/spike-bridge.ts`) instead — same OpenAI-compatible protocol LibreChat uses.
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
- [ ] Verify LibreChat actually sends `conversationId` / `addUser` email — BLOCKED (no Docker on this machine). Bridge accepts body `conversationId`, `X-Flow-Conversation-Id` header, body `user`, and `X-Flow-User` header, so all LibreChat variants are covered; the `resolveConversationId` fallback stays until a real LibreChat run confirms the body/header fields.
- [x] `tests/flow-bridge.test.ts` — `npx vitest run tests/flow-bridge.test.ts` green (23/23, 2026-08-20).

## Phase 3 — Productionize the bridge

- [ ] Streaming: replace pseudo-streaming word chunks with real incremental SSE if acceptable (note: agent returns full text; v1 chunks are fine).
- [ ] Abort propagation: LibreChat abort → agent cancellation (Inngest/Ably) or documented limitation.
- [ ] Confirmations: re-request pending confirmation after an unrelated user message (currently the reminder reply keeps it pending until approval/denial/expiry).
- [ ] LibreChat auth: disable `ALLOW_REGISTRATION`, pre-create users, document password policy. Clerk SSO = later.
- [ ] Abuse: per-email rate limit verified (20/min), audit rows (`FLOW3_REQUEST`) verified in Activity.
- [ ] Re-run full benchmark through the LibreChat UI → **2 consecutive passes**.

## Phase 4 — Mechanical rename (LAST)

- [ ] `node scripts/rename-nova-to-flow.mjs --dry-run` → review → `--execute`.
- [ ] Prisma: `nova_agents` → `flow_agents` (+ `@@map`), `npx prisma generate && npx prisma db push`.
- [ ] Rewrite `LANGGRAPH_MIGRATION_STRATEGY.md` → `FLOW_ARCHITECTURE.md` (content is stale — rewrite, don't just rename).
- [ ] `npx tsc --noEmit` + `npm test` green.

## Phase 5 — Full-stack benchmark

- [ ] Run ALL 18 benchmark tasks through the LibreChat UI on production config.
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
| `deploy/librechat/docker-compose.yml` | created | LibreChat + mongo |
| `deploy/librechat/librechat.yaml` | created | custom endpoint → Theta bridge |
| `deploy/librechat/.env.example` | created | LibreChat secrets template |
| `deploy/librechat/README.md` | created | wiring + spike verification |
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