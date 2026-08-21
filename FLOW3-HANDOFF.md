# Flow³ Native Chat — Build Status & Handoff

Date: 2026-08-21 · Branch: `main` @ f46681c · Working dir: `C:\Users\NAOMIS\Desktop\021 - Copy`

## Goal
Native Flow³ chat UI inside Theta PM at `/flow3`, powered by the existing Nova backend
(bridge.ts + confirmation.ts + langraph runNovaAgent). External LobeChat (chat.thetapm.site)
stays parked on Vercel free tier as backup; DNS record plan dropped.

## DONE

### Research / decisions
- LobeChat v2.2.14 audited: nothing liftable (React 19/Next 16/antd 6 vs Theta React 18.3/Next 14/shadcn).
  Markdown stack identical libs (react-markdown + remark-gfm + highlighter) — already in Theta's package.json.
- Day-1 scope: bubbles, markdown/code rendering, persisted history rail, SSE streaming,
  confirmation cards, task timeline, auto-titles. Skipped: artifacts, MCP marketplace, voice, desktop.
- Route name `/flow3` approved by user.

### Backend routes (written)
1. **`app/api/flow3/chat/route.ts`** (clean v2)
   - Auth (getCurrentUser) → rate limit (`flow:nativeratelimit:{userId}`, 20 req/60s, Upstash)
   - Workspace resolve (body.workspaceId or getCurrentWorkspace) + verifyWorkspaceAccess
   - sanitizeUserInput + detectPromptInjection guard → plan limit (enforcePlanLimit "nova")
   - Resolves/creates `aiConversation` (emits SSE `meta` event with conversationId), persists user `aiMessage`,
     async auto-title via generateConversationTitle when new
   - Pending-confirmation branch: approve → runApprovedAction; deny → clearConfirmation; else reminder text
   - Else: classifyBridgeRequest → DELETE intent hard-blocked → runNovaAgent
   - If extractConfirmationFromResult hits → requestConfirmation + SSE `confirmation` event
   - Persists assistant message + bumps lastMessageAt + writes `FLOW3_REQUEST` audit Activity
   - SSE events: `meta` `{conversationId}` · `status` `{message,route}` · `start` `{intent,route}` ·
     `token` `{text}` · `confirmation` `{token,reason,toolName,args}` · `done` `{response,durationMs,route,requiresConfirmation?}` · `error` `{message}`
   - `maxDuration = 60`, proper event-stream headers
2. **`app/api/nova/conversations/route.ts`** — GET list (cursor pagination, excludes archived, lastMessageAt desc) / POST create
3. **`app/api/nova/conversations/[id]/route.ts`** — GET (optional `?messages=true`, cursor paginated, reversed chronological) / PATCH (title, isPinned, isArchived) / DELETE (ownership-checked)

### UI components (written)
4. **`components/flow3/task-timeline.tsx`** — "Working in background" panel; step types thinking/planning/tool/confirmation/complete/error; spinners, durations, pending-confirmation row
5. **`components/flow3/confirmation-card.tsx`** — amber card: tool badge, reason, collapsible args JSON, Approve/Cancel with loading states
6. **`components/flow3/message-bubble.tsx`** — user bubble (violet, right); assistant bubble with ReactMarkdown + remarkGfm + Prism oneDark code blocks w/ copy button + streaming cursor
7. **`components/flow3/composer.tsx`** — auto-grow textarea, Enter=send / Shift+Enter=newline, send↔stop button, disabled paperclip placeholder
8. **`components/flow3/history-rail.tsx`** — New chat btn, Pinned/Recent sections, inline rename, pin toggle, delete, active highlight

### Environment facts
- Vercel token: `C:\Users\NAOMIS\AppData\Roaming\xdg.data\com.vercel.cli\auth.json`
- LobeChat prod deploy READY (`lobehub-i5qccp153`, aliased chat.thetapm.site) — parked, do not touch
- Full shadcn/ui set in `components/ui`; `@types/react-syntax-highlighter` present; remark-gfm ships own types
- `generateConversationTitle(prompt)` exported from `lib/nova/conversation-title.ts`

## LEFT TO DO

1. **`components/flow3/chat-panel.tsx`** (main orchestrator — NOT yet written; one bad draft was discarded)
   - SSE reader: `res.body.getReader()` loop → TextDecoder → buffer split on `\n\n` → parse `event:`/`data:` lines (keep it simple; previous attempt overcomplicated this)
   - State: conversations[], activeId, messages[], isStreaming, timelineSteps[], pendingConfirmation, error
   - Event handling: meta→set convId + refresh list · status/start→timeline step · token→append assistant msg · confirmation→show card · done→finalize · error→error bubble
   - History load: GET `/api/nova/conversations`, GET `/api/nova/conversations/[id]?messages=true`
   - Handlers wiring HistoryRail: newChat/select/rename/delete/togglePin
   - Empty state w/ suggestion chips (e.g. "Summarize my week", "What tasks are at risk?", "Draft a project update")
   - Auto-scroll to bottom on new tokens; mobile hamburger toggles history rail
   - Icons: use `X` (not XClose), `Loader2`, `Menu` from lucide-react
2. **`app/(dashboard)/flow3/page.tsx`** — thin server page importing ChatPanel (verify exact dashboard route-group folder name & metadata pattern from an existing page like my-tasks)
3. **Sidebar swap** — `components/dashboard/sidebar.tsx` ~line 277: replace external
   `<NavItem href="https://chat.thetapm.site" ... external />` with internal `href="/flow3"` (keep Sparkles icon, label "Flow³ AI")
4. **Verify** — `npm run lint`, typecheck/tsc, `npm run build`. If Prisma types missing for aiConversation/aiMessage → `npx prisma generate`
5. **Ship** — commit + push main → `vercel --prod` (theta project) → live test: sign in, /flow3, send msg, check SSE stream, persistence, auto-title, confirmation flow
6. **Follow-ups (later)** — attachments (file-upload.ts helpers exist), chat export, keyboard shortcuts

## Gotchas
- `getPendingConfirmation` may return string|object (Upstash REST) — handle both
- No code comments (repo style); no emojis
- Don't touch parked lobehub Vercel project
