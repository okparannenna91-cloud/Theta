# LibreChat — Flow³ chat shell

LibreChat is deployed as a **pure chat UI shell** on the `chat` subdomain. All
intelligence lives in Theta: every request goes through the OpenAI-compatible
bridge at `POST https://thetapm.site/api/flow/chat`, which executes Theta's
LangGraph agent (Flow³).

```
Browser ──► LibreChat (chat subdomain) ──► /api/flow/chat (Theta, bridge) ──► LangGraph agent ──► Prisma/MongoDB
              UI shell only                    identity + security + audit            tools (write ops behind confirmation)
```

## Quick start

```bash
cd deploy/librechat
cp .env.example .env
# fill in: JWT_SECRET, JWT_REFRESH_SECRET, CREDS_KEY, CREDS_IV, FLOW_BRIDGE_SECRET
docker compose up -d
```

LibreChat runs on port 3080. Theta must have `FLOW_BRIDGE_ENABLED=true` and the
same `FLOW_BRIDGE_SECRET` set.

## Wiring

- `librechat.yaml` defines the custom endpoint `Flow3`:
  - `baseURL: https://thetapm.site/api/flow` → hits `app/api/flow/chat` and
    `app/api/flow/models` on Theta.
  - `apiKey: ${FLOW_BRIDGE_SECRET}` — bearer secret validated by the bridge.
  - `addUser: true` — LibreChat sends the logged-in user's email in the
    request body; the bridge maps it to the Theta user.
- Identity sent to the bridge can be overridden per-endpoint with the
  `X-Flow-User` header (LibreChat template: `{{LIBRECHAT_USER_EMAIL}}`) if
  `addUser` is unavailable in the pinned LibreChat version.
- `titleConvo: false` — avoids generating titles against the bridge.

## Subdomain routing

Point `chat.thetapm.site` (CNAME) at the host running Docker, then proxy 3080
(Caddy/Nginx/Traefik). For Vercel-hosted Theta, the bridge URL stays
`https://www.thetapm.site/api/flow` (see `DOMAIN_CLIENT`/`DOMAIN_SERVER`).

## Verify the spike (Phase 2)

1. `GET https://thetapm.site/api/flow/models` with `Authorization: Bearer <secret>` → returns `flow-3`, `flow-3-fast`.
2. Log in to LibreChat, pick `Flow3`, ask a **read** question ("What's in my project X?").
3. Ask for a **write** action ("Create a task ..."). Expect a `flow_confirm` tool-call card instead of immediate execution.
4. Reply "Approve" → the tool executes and the agent summarizes the result. Reply "Cancel" → no write happens.
5. Check the rate limit (20 req/min/user) and audit rows (`Activity` with `action: FLOW3_REQUEST`).

## Known limitations (v1)

- Pseudo-streaming: the agent result is chunked server-side; aborting a
  message in LibreChat does not stop agent execution.
- LibreChat has its own accounts — no Clerk SSO yet. `ALLOW_REGISTRATION`
  should be disabled and users pre-created for anything beyond a spike.
- LibreChat version-pins: custom endpoint options (`addUser`, `dropParams`,
  `titleConvo`) moved between versions — re-verify against the pinned image
  during the spike.