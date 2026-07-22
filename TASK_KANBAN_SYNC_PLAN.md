# Theta Task & Kanban Synchronization Architecture

## Objective

Implement a single, consistent task workflow where:

- Tasks are the single source of truth.
- Kanban is a visual representation of Tasks.
- Workflow statuses are configurable by users through Kanban columns.
- Every feature that displays or edits task status stays perfectly synchronized.

There must never be conflicting task states anywhere in the application.

---

## Core Principle

A task exists only once.

Kanban, Tasks, Calendar, Timeline, Gantt, Dashboard, Reports, Analytics, Automations, Nova and every future feature all read and update the exact same task.

Never duplicate task state.

---

## Current State Analysis

The codebase has 5 critical architectural gaps:

| # | Gap | Impact |
|---|-----|--------|
| 1 | **Column and Status are decoupled** — Kanban columns (`Column` model) and workflow statuses (`Status` model) are completely independent. Dragging a card between columns does NOT change the task's `status` field. | Tasks Page and Kanban can show different statuses for the same task |
| 2 | **No Status CRUD API** — The `Status` model exists in DB but there's no endpoint to create/rename/delete statuses. Users can't manage workflows. | Kanban columns can't create new statuses |
| 3 | **Statuses never reach the client** — `getUserWorkspaces()` doesn't include `statuses` in its response. All UI dropdowns fall back to hardcoded `todo`/`in_progress`/`done`. | Custom statuses are invisible in the UI |
| 4 | **Three disconnected query keys** — `["board", boardId]`, `["tasks", workspaceId]`, `["timeline-tasks", workspaceId]` are never cross-invalidated. | Status change in one view doesn't refresh other views |
| 5 | **Gantt undo/redo doesn't invalidate any cache** | Stale data after undo/redo |

---

## 1. Task Synchronization

Every task has one current status.

Changing that status anywhere updates every other view.

Examples:

Task Dialog
-> Change status to Done
-> Kanban immediately moves the card to Done.

Kanban
-> Drag card from Todo to QA
-> Task status becomes QA.
-> Tasks page updates immediately.

Automation
-> Updates status
-> Every view refreshes.

Nova AI
-> Updates status
-> Every view refreshes.

API
-> Updates status
-> Every view refreshes.

There should NEVER be a situation where:

Tasks Page:
Status = Done

Kanban:
Status = Todo

This is invalid.

---

## 2. Kanban Workflow Management

Kanban is where users manage their workflow.

Default workflow:

- Todo
- In Progress
- Done

Users can create additional workflow stages such as:

- QA
- Review
- Testing
- Report
- Blocked
- Ready for Release

Creating a new column should:

- Create a new workflow status.
- Add a new Kanban column.
- Update every Status dropdown across Theta.
- Make the new status immediately usable.

Example:

User creates:

QA

Status dropdown instantly becomes:

- Todo
- In Progress
- QA
- Done

Selecting QA for any task immediately moves that task into the QA column.

---

## 3. Status Management

When a workflow status is:

Created
- Add Kanban column.
- Add to every Status selector.
- Available everywhere immediately.

Renamed
- Update every task automatically.
- Update Kanban.
- Update filters.
- Update reports.
- Update automations.

Reordered
- Kanban reflects new order.
- Status dropdown reflects new order.

Deleted
- Prevent orphaned tasks.
- Require user to move affected tasks to another status before deletion or provide a safe migration flow.

---

## 4. Views

The following are different views of the same Tasks data:

- Tasks
- Kanban
- Calendar
- Timeline
- Gantt
- Dashboard widgets
- Reports
- Analytics
- Activity
- Nova

No view owns task state.

Every view reads from and writes to the same Tasks data.

---

## 5. Realtime Synchronization

Any task update should instantly propagate across:

- Tasks page
- Kanban
- Calendar
- Timeline
- Gantt
- Dashboard
- Reports
- Analytics
- Activity
- Nova

Support optimistic UI updates and realtime synchronization.

---

## 6. Technical Requirements

- Tasks are the single source of truth.
- No duplicated task state.
- Shared task services.
- Shared validation.
- Shared RBAC.
- Shared realtime subscriptions.
- Shared caching strategy.
- Clean separation of:
  - Data layer
  - Business logic
  - Presentation layer

---

## Implementation Phases

### Phase 1: Status CRUD API + Client Infrastructure

**Goal:** Make statuses first-class, queryable, manageable entities.

#### 1a. Create Status API Routes

**NEW FILE: `app/api/workspaces/[id]/statuses/route.ts`**

- `GET /api/workspaces/[id]/statuses` — Return all statuses for a workspace, ordered by `order`
- `POST /api/workspaces/[id]/statuses` — Create a new status (name, color, order). Enforce uniqueness per workspace.

**NEW FILE: `app/api/statuses/[id]>/route.ts`**

- `PATCH /api/statuses/[id]` — Rename status, change color, change order. Update all tasks with that `statusId` to reflect the new name in their `status` string field.
- `DELETE /api/statuses/[id]` — Require `migrateToStatusId` param. Move all tasks with this status to the target status before deleting.

#### 1b. Include Statuses in Workspace Response

Modify `getUserWorkspaces()` in `lib/workspace.ts` to include the `statuses` relation so clients can access them.

#### 1c. Create Shared Statuses Hook

**NEW FILE: `hooks/use-statuses.ts`**

```ts
useQuery(["statuses", workspaceId], fetchStatuses)
```

All views consume this hook instead of hardcoded values.

#### 1d. Update All Status Dropdowns

Replace hardcoded `todo`/`in_progress`/`done` with dynamic statuses from `["statuses", workspaceId]`:

- `components/tasks/task-dialog.tsx` (lines 127-132)
- `components/tasks/tasks-page.tsx` (lines 336-339)
- `components/tasks/create-task-dialog.tsx` (lines 214-218)
- `components/boards/filter-sort-bar.tsx` (lines 207-211)

**Files Modified:**
| File | Change |
|------|--------|
| `app/api/workspaces/[id]/statuses/route.ts` | NEW — Status GET/POST |
| `app/api/statuses/[id]/route.ts` | NEW — Status PATCH/DELETE |
| `lib/workspace.ts` | Include statuses in workspace response |
| `hooks/use-statuses.ts` | NEW — Shared statuses hook |
| `components/tasks/task-dialog.tsx` | Use dynamic statuses |
| `components/tasks/tasks-page.tsx` | Use dynamic statuses |
| `components/tasks/create-task-dialog.tsx` | Use dynamic statuses |
| `components/boards/filter-sort-bar.tsx` | Use dynamic statuses |

---

### Phase 2: Unified Cache Invalidation

**Goal:** One status change refreshes every view.

#### 2a. Create Shared Invalidation Utility

**NEW FILE: `lib/invalidate-task-caches.ts`**

```ts
function invalidateTaskCaches(queryClient, workspaceId, boardId?) {
  queryClient.invalidateQueries({ queryKey: ["board"] });
  queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
  queryClient.invalidateQueries({ queryKey: ["timeline-tasks", workspaceId] });
  queryClient.invalidateQueries({ queryKey: ["statuses", workspaceId] });
}
```

#### 2b. Replace All Ad-Hoc Invalidations

Every mutation that changes task state should call `invalidateTaskCaches()`:

- `components/boards/kanban-board.tsx` — drag-drop, column create/delete/rename
- `components/tasks/task-dialog.tsx` — update, delete
- `components/tasks/tasks-page.tsx` — status toggle, create, delete
- `components/tasks/task-subtasks.tsx` — subtask mutations
- `components/tasks/task-checklist.tsx` — checklist mutations
- `components/tasks/task-attachments.tsx` — attachment mutations
- `components/tasks/tag-selector.tsx` — tag mutations
- `components/tasks/create-task-dialog.tsx` — task creation
- `components/gantt/gantt-page.tsx` — undo/redo
- `components/boards/table-view.tsx` — inline edits

#### 2c. Add Ably Event for Status Changes

When a Status is created/renamed/deleted, publish `status:updated` to the workspace channel so all connected clients refetch their status lists.

**Files Modified:**
| File | Change |
|------|--------|
| `lib/invalidate-task-caches.ts` | NEW — Shared cache invalidation |
| `components/boards/kanban-board.tsx` | Use shared invalidation |
| `components/boards/table-view.tsx` | Use shared invalidation |
| `components/tasks/task-dialog.tsx` | Use shared invalidation |
| `components/tasks/tasks-page.tsx` | Use shared invalidation |
| `components/tasks/create-task-dialog.tsx` | Use shared invalidation |
| `components/tasks/task-subtasks.tsx` | Use shared invalidation |
| `components/tasks/task-checklist.tsx` | Use shared invalidation |
| `components/tasks/task-attachments.tsx` | Use shared invalidation |
| `components/tasks/tag-selector.tsx` | Use shared invalidation |
| `components/gantt/gantt-page.tsx` | Use shared invalidation on undo/redo |

---

### Phase 3: Column-Status Coupling

**Goal:** Kanban columns become the UI for managing workflow statuses. Column = Status.

#### 3a. Column Creation Creates a Status

Modify `POST /api/boards/[id]/columns/route.ts` to:
1. Create the `Column` record
2. Create a matching `Status` record with the same name, color, and next order value
3. Return both

#### 3b. Column Rename Renames the Status

Modify `PATCH /api/columns/[id]/route.ts` to:
1. If `name` changes, find the matching `Status` record for this workspace
2. Update the `Status.name`
3. Update all tasks' `status` string field that reference this status
4. Publish `status:updated` via Ably

#### 3c. Column Deletion Migrates Tasks + Deletes Status

Modify `DELETE /api/columns/[id]/route.ts` to:
1. Require a target column ID (or default to first remaining column)
2. Find the target column's matching status
3. Move all tasks in this column to the target column AND update their `status`/`statusId` to the target status
4. Delete the orphaned `Status` record
5. Publish `column:deleted` and `status:updated` via Ably

#### 3d. Column Reorder Updates Status Order

Modify column reorder endpoint to also update `Status.order` to match the new column ordering.

#### 3e. Default Column-Status Mapping

When a board is created with "Todo", "In Progress", "Done" columns (which happens in `POST /api/boards`), link them to the existing workspace statuses by name instead of creating duplicate statuses.

**Files Modified:**
| File | Change |
|------|--------|
| `app/api/boards/[id]/columns/route.ts` | Also create Status on column create |
| `app/api/boards/[id]/columns/reorder/route.ts` | Also update Status order |
| `app/api/columns/[id]/route.ts` | Also rename/delete Status on column rename/delete |
| `app/api/boards/route.ts` | Map default columns to existing statuses |

---

### Phase 4: Bidirectional Kanban <-> Status Sync

**Goal:** Changing status anywhere moves the Kanban card; dragging a Kanban card changes the status.

#### 4a. Kanban Drag -> Status Update

In `handleDragEnd` in `kanban-board.tsx`, when a task moves to a new column:
1. Find the Status record matching the target column name
2. Include `status: statusName` in the reorder API payload
3. The `PATCH /api/boards/[id]/tasks/reorder` endpoint updates the task's `status` and `statusId`

#### 4b. Task Dialog Status Change -> Kanban Card Moves

In `PATCH /api/tasks/[id]`, when `status` changes:
1. Look up the column on the task's board whose name matches the new status
2. Update `columnId` to that column
3. This ensures the Kanban card is in the correct column on next render

#### 4c. Tasks Page Status Change -> Kanban Card Moves

Same server-side logic as 4b: status change also sets the correct `columnId`.

#### 4d. Server-Side Consistency Guard

In `PATCH /api/tasks/[id]`, whenever `status` changes:
1. Resolve the `Status` record
2. Find the matching column on the task's board
3. Update `columnId` to keep Kanban in sync
4. This is the safety net that prevents drift regardless of which view initiated the change

**Files Modified:**
| File | Change |
|------|--------|
| `app/api/boards/[id]/tasks/reorder/route.ts` | Also update task status on column move |
| `app/api/tasks/[id]/route.ts` | Also update columnId when status changes |
| `components/boards/kanban-board.tsx` | Send status in drag-drop payload |

---

### Phase 5: Status Management UI

**Goal:** Users can manage their workflow from the Kanban board.

#### 5a. Column Settings

Enhance the existing column dropdown menu:
- **Rename** — Inline edit of column name (triggers status rename via API)
- **Color** — Color picker for the column/status
- **Delete** — Enhanced confirmation showing task count and target column selector

#### 5b. Status Reordering

Column drag-and-drop reordering already updates column order. Extend to also update `Status.order`.

#### 5c. Delete Confirmation Upgrade

Replace `window.confirm` with a proper dialog:
- Show how many tasks are in the column
- Show dropdown to select target column for migration
- Confirm/Cancel buttons

**Files Modified:**
| File | Change |
|------|--------|
| `components/boards/kanban-board.tsx` | Enhanced column dropdown, inline rename, delete confirmation dialog |

---

## Acceptance Criteria

- [ ] Creating a task from Kanban creates a normal task
- [ ] Creating a task from Tasks immediately appears in Kanban
- [ ] Dragging a Kanban card updates the task status
- [ ] Changing status in the Task dialog moves the Kanban card
- [ ] Creating a new Kanban column creates a new workflow status
- [ ] New workflow statuses immediately appear in every Status dropdown
- [ ] Renaming a workflow status updates every task and every view
- [ ] Reordering workflow statuses updates Kanban and dropdowns
- [ ] No view can become out of sync
- [ ] Every feature always reflects the same task status

---

## Execution Order

Phases are ordered to minimize breakage at each step:

1. **Phase 1** (API + client infra) — No behavioral change, just enables the rest
2. **Phase 2** (cache invalidation) — Fixes sync bugs immediately, no schema changes
3. **Phase 3** (column-status coupling) — The core architectural change
4. **Phase 4** (bidirectional sync) — Makes everything bidirectional
5. **Phase 5** (UI polish) — Final UX improvements
