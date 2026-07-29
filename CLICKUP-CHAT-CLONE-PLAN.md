# ClickUp Chat Clone — Build Plan

## Phase 0: Foundation (Structure & Navigation)
**Effort: Medium | Dependencies: None**

- Create `components/chat/` directory with new component hierarchy
- Build **Left Sidebar** (`ChatSidebar`):
  - Navigation: Home, Direct Messages, Team Chats, Project Chats, Threads, Drafts, Archived
  - Conversation list with avatar, name, last message preview, timestamp, unread/mention badges
  - Search conversations, filter by unread, sort by recent
  - Infinite scroll on conversation list
- Wire up conversation switching (state management for active conversation)
- Create layout wrapper: Sidebar | Center | Right Panel (3-panel responsive)

## Phase 1: Message Display Refinements
**Effort: Medium | Dependencies: Phase 0**

- **Date separators**: "Today", "Yesterday", "Monday", "July 28" auto-inserted between message groups
- **Unread divider**: Horizontal line with "Unread" label at the point user last read
- **Message grouping**: Better consecutive-sender grouping with merged bubbles
- **Read receipts**: Show ✓✓ with timestamp on hover (already partial)

## Phase 2: Rich Text Composer
**Effort: Large | Dependencies: None (independent)**

- Upgrade from plain `<input>` to **TipTap rich text editor**
- Toolbar: Bold, Italic, Underline, Strikethrough, Code, Blockquote, List
- **@Mentions** autocomplete dropdown (users, teams, @everyone)
- **Emoji picker** (popover with search)
- **Slash commands** (/task, /remind, /assign, etc.)
- **Drag-and-drop** file upload onto composer
- **Markdown shortcuts** (**bold**, *italic*, `code`, etc.)
- Keyboard shortcuts (Enter send, Shift+Enter newline)

## Phase 3: Message Actions Bar
**Effort: Medium | Dependencies: Phase 1**

- Hover (desktop) / long-press (mobile) reveals action toolbar
- Actions: Reply, Start Thread, Emoji Reaction, Edit, Delete, Pin, Copy Link, Copy Text, Mark Unread, Save, Convert to Task, Assign
- Edit mode on messages (inline edit with save/cancel)
- Full emoji picker for reactions (not just workspace reactions)

## Phase 4: Threads
**Effort: Large | Dependencies: Phase 3**

- Thread data model (or use replyTo chain + separate counting)
- Thread sidebar/panel showing: original message → replies → composer
- Reply count + participant avatars on main message
- Real-time thread updates via Ably
- Notifications for thread replies

## Phase 5: Right Details Panel
**Effort: Medium | Dependencies: Phase 0**

- Collapsible right panel with tabs/sections:
  - **Members** — owner, admins, members, guests with presence dots
  - **Shared Files** — grid of uploaded files
  - **Shared Links** — URL list with previews
  - **Pinned Messages** — scrollable list
  - **Media Gallery** — images/videos grid
  - **Related Tasks** — tasks linked/created from chat

## Phase 6: Rich Content & Previews
**Effort: Large | Dependencies: Phase 2**

- **Link previews** — auto-fetch OG metadata for URLs
- **Code blocks** — syntax-highlighted code in messages
- **Tables** — rendered table formatting
- **Checklists** — interactive checkboxes in messages
- **Quotes** — blockquote styling
- **Task previews** — inline task cards when pasting task links
- **Voice notes** — audio recording + playback
- **GIF picker** — Tenor/GIPHY integration

## Phase 7: Project Management Integration
**Effort: Large | Dependencies: Phase 3, Phase 6**

- "Convert to task" flow — opens task creation dialog pre-filled from message
- "Attach task" — link existing task to conversation
- "Assign" — quick assign from message context
- Task card previews in chat
- Message-to-task conversion with @mention linking

## Phase 8: Notifications & Search
**Effort: Medium | Dependencies: Phase 0, Phase 2**

- In-chat **search** — filter by text, sender, file, link, date, mentions
- Highlighted search results with up/down navigation
- Notifications for: mentions, replies, thread replies, reactions, added to chat
- Permission controls (admin message management)

## Phase 9: Polish & Mobile
**Effort: Medium | Dependencies: All phases**

- Smooth animations (framer-motion transitions)
- Mobile: sidebar collapses, full-screen chat, swipe navigation
- Keyboard shortcuts cheat sheet
- Accessibility audit
- Performance optimization (virtualization for large message lists)

---

## Recommended Build Order

```
Phase 0 → Phase 1 → Phase 3 → Phase 2 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
```
