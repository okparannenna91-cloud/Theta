# LobeChat — Flow³ chat shell (deployed on Vercel, $0)

LobeChat is the Flow³ chat UI. Unlike the old LibreChat plan it needs **no VPS**:
it is a Next.js app that deploys to Vercel's free tier with a free Postgres
database (Neon). All intelligence lives in Theta: every request goes through the
OpenAI-compatible bridge at `https://thetapm.site/api/flow`, which executes the
Theta agent.

```
Browser ──► chat.thetapm.site (LobeChat fork) ──► /api/flow/chat (Theta, bridge) ──► agent ──► Prisma/MongoDB
              pretty UI shell, per-user accounts      per-EMAIL identity (patched)     tools behind confirmation
```

## Why a fork?

LobeChat's chat requests are sent **server-side** from its Next.js API routes.
By default it sends `user: <internal user UUID>` in the body — the Theta bridge
resolves identity by **email** (`X-Flow-User` header or body `user`), so stock
LobeChat would 401. The fork patch (`patches/0001-flow3-identity.patch`, branch
`flow3-identity`) resolves the logged-in user's email from the database and sends
it for the Flow³ provider only (`FLOW3_PROVIDER_ID`, default `flow3`). Every other
provider keeps LobeChat's internal user id.

## Deploy (one-time)

1. **Fork** — already done: `https://github.com/okparannenna91-cloud/lobehub`,
   branch `flow3-identity` (based on upstream `v2.2.14` + the identity patch).
   To work on it locally without touching the Theta repo, run
   `powershell -ExecutionPolicy Bypass -File deploy/lobechat/setup.ps1` — it
   clones the fork to a sibling folder and applies the patch (idempotent).

2. **Vercel** — import the fork. Project → "Import Git Repository" →
   `okparannenna91-cloud/lobehub` → branch `flow3-identity`. Framework preset
   Next.js is auto-detected. Hobby (free) plan is fine; enable **Fluid Compute**
   when prompted (the chat route sets `maxDuration = 300`).

3. **Database** — create a free Neon project (https://neon.tech) and copy the
   pooled `DATABASE_URL` into the Vercel env vars.

4. **Env vars** — set everything from `.env.example`:
   `APP_URL`, `DATABASE_URL`, `AUTH_SECRET`, `FLOW_BRIDGE_SECRET`,
   `FLOW3_PROVIDER_ID` (optional extras: magic link, Google SSO).
   `FLOW_BRIDGE_SECRET` must be **identical** to Theta's.

5. **Domain** — in the Vercel project settings add `chat.thetapm.site` (DNS
   managed by Vercel or point a CNAME at the project's `cname.vercel-dns.com`).

6. **Theta env (Vercel)** — add to the Theta project:
   - `FLOW_BRIDGE_ENABLED=true`
   - `FLOW_BRIDGE_SECRET=<same value>`

7. **Redeploy** the Theta project (env change). The bridge routes
   `/api/flow/*` are already public in `middleware.ts` and already covered by
   the Phase 2 spike.

## Post-deploy setup

- **Provider per user:** in LobeChat, every user opens Settings → AI service
  providers → "+" → Custom provider. Enter:
  - Provider id: `flow3` (must match `FLOW3_PROVIDER_ID`)
  - Name: `Flow3`
  - Base URL: `https://thetapm.site/api/flow`
  - API key: `<FLOW_BRIDGE_SECRET>`
  - Models: `flow-3`, `flow-3-fast` (enable function calling)
- **Accounts:** users register with the **same email as their Theta account**
  (email+password or the same Google account via SSO). The bridge then resolves
  each user to their own Theta workspace.
- Optionally set `ENABLED_OPENAI=0` so users only see Flow3.

## Verify

1. `GET https://thetapm.site/api/flow/models` with `Authorization: Bearer <secret>`
   → `flow-3`, `flow-3-fast`.
2. Log in at `chat.thetapm.site`, pick Flow3, ask a **read** question
   ("What's in my project X?") → answers from the user's own workspace.
3. Ask for a **write** ("Create a task …") → a `flow_confirm` tool-call card
   instead of immediate execution.
4. Reply "Approve" → executes; "Cancel" → no write. (Verified in Phase 2 spike.)
5. **Two-user identity check:** with a second account, confirm each user only
   sees their own workspace (audit rows `Activity.action = FLOW3_REQUEST` carry
   the correct `userId`/`workspaceId`).

## Switching between Theta pages and chat

The Theta sidebar has a **Flow³ AI** item that opens `chat.thetapm.site` in a
new tab (same browser, same Clerk/BetterAuth email). Embedding the chat inside
the Theta app (iframe) is possible but needs an extra step (LobeChat must allow
framing and the browser must allow third-party cookies) — treat as a follow-up,
not v1.

## Maintenance

- The fork is pinned to upstream `v2.2.14`. To update: fetch upstream tags,
  rebase `flow3-identity` onto the new tag, re-apply `patches/0001-flow3-identity.patch`
  (it is tiny and stable), push, and redeploy.
- The identity patch is gated on `FLOW3_PROVIDER_ID` — if a future LobeChat
  changes the `webapi/chat/[provider]` route, the patch needs a small port.
  Check it against the changelog when upgrading.

## Known limitations (v1)

- Pseudo-streaming: the agent result is chunked server-side; aborting a message
  in LobeChat does not stop agent execution (same as LibreChat plan).
- Bridge rate limit: 20 requests/min per email — comfortable for human chat.
- LobeChat keeps its own account database (BetterAuth); SSO with Theta's Clerk
  instance is not linked (both only need the same email for identity to work).