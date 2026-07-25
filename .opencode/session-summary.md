## Session: Kanban Dependency Enforcement + Timeline DELETE fix

### Completed
1. **Board API includes dependency data** (`app/api/boards/[id]/route.ts`):
   - Task include now fetches `predecessors` with predecessor task's `id, columnId, status, title`
   - Frontend can now validate moves against dependency rules

2. **Kanban dependency enforcement** (`components/boards/kanban-board.tsx`):
   - Added `getMoveViolation()` helper that checks FS/SS/FF/SF dependency types against column names
   - Added `isDoneColumn()` / `isTodoColumn()` helpers using column name heuristics
   - Cross-column moves in `handleDragEnd` now check dependencies and show a toast on violation

3. **Fixed Timeline DELETE route** (new `app/api/tasks/[id]/dependencies/[predecessorId]/route.ts`):
   - Previously called `DELETE /api/tasks/${targetId}/dependencies/${sourceId}` which didn't exist
   - New nested route handles this RESTful URL pattern, deriving `workspaceId` from the task's project

### Not yet done
- **Trigger schedule recalculation** after dependency create/delete: needs Ably subscription in Gantt/Timeline
