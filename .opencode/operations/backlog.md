# Theta PM Backlog

Unfinished and scheduled work for later sessions. Carryovers land here so nothing is lost between sessions.

---

## Carryover — 2026-08-11

### Timeline schedule recalculation after dependency changes

- **Status:** Not started
- **Context:** Kanban dependency enforcement is live (`components/boards/kanban-board.tsx` + board API). The Timeline DELETE route was fixed (`app/api/tasks/[id]/dependencies/[predecessorId]/route.ts`). What's missing is a trigger to recalculate the Gantt/Timeline schedule after a dependency is created or deleted.
- **Next step:** Add Ably subscription in the Gantt/Timeline component so schedule recalculates on dependency create/delete events.
