# DEPRECATED: Direct Action Engine

The regex-based DirectActionEngine has been replaced by LangGraph's `direct-action-router`.
See `lib/langraph/nodes/direct-action-router.ts`.

**Old:** `lib/nova/direct-actions/engine.ts` → `executeDirectAction()`
**New:** `lib/langraph/nodes/direct-action-router.ts` → `tryDirectAction()`

These files will be removed in a future cleanup:
- `lib/nova/direct-actions/engine.ts`
- `lib/nova/direct-actions/registry.ts`
- `lib/nova/direct-actions/index.ts`
