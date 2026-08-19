# Flow³ Behavior Benchmark

Baseline + regression benchmark for the Flow³ copilot (currently the Nova backend at `lib/nova` + `lib/langraph`).

Run BEFORE any behavior change (Phase 0) and re-run after every behavior change (Phase 1+) until the gate passes.

## How to run

```bash
npm run bench:flow -- --user <prisma-user-id> --workspace <workspace-id>
```

- Uses a real DB (`.env.local` is loaded automatically).
- Writes the report to `Theta/flow-benchmark-results.md` (override with `--out`).
- `--filter <regex>` runs a subset of tasks (e.g. `--filter 'C\\.'` for modification tasks).

## Procedure

1. Baseline run (before ANY change) — record failures honestly.
2. Make ONE behavior change.
3. Re-run the benchmark.
4. Grade each task in the generated report: `[x]` pass / `[ ]` fail, plus notes.
5. Only proceed when every task passes the rubric, or the failures are documented acceptances.

## Rubric (grade each task)

| Dimension | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Tool selection | wrong tool | plausible but wrong | correct tool | correct + minimal calls | correct + zero wasted calls |
| Parameters | hallucinated/missing | partially wrong | correct | correct + validated | correct + explicit about defaults |
| Hallucination | invented data | stretched data | none, vague | none, precise | none, cites what it saw |
| Refusal | refused when it should act | hedged into inaction | acted after one clarify | acted directly | acted + confirmed outcome |
| Verbosity | essay for a one-liner | wordy | tight | concise | concise + leads with insight |
| Latency | >60s | >30s | 10-30s | 3-10s | <3s |
| Confirmation | wrong gating | over-asks | asks once when risky | asks once, precise | confirms outcome after |

Pass = average ≥ 4 per task with no single dimension below 3, and the response feels like "a senior PM copilot", not a generic chatbot.

## Tasks

### A. INFORMATION (read-only)

| # | Prompt | Expected |
|---|---|---|
| A1 | "Show me all overdue tasks." | Calls a task/search tool scoped to the workspace; lists overdue tasks with due dates and assignees. |
| A2 | "What projects are behind schedule?" | Uses project/schedule data; names projects with evidence (dates, progress), not guesses. |
| A3 | "How is the Marketing Campaign project progressing?" | Resolves the project; reports progress metrics (tasks done/total, % complete) from real data. |
| A4 | "Who has the most overdue tasks?" | Aggregates by assignee from real task data; names the person and count. |

### B. CREATION (write, confirmation-gated)

| # | Prompt | Expected |
|---|---|---|
| B1 | "Create a project called Website Redesign." | One confirmation (MEDIUM risk); on approve → project created in the workspace. |
| B2 | "Create these 10 tasks inside the project: [list]." | Confirmation; tasks created under the project with the given titles. |
| B3 | "Create subtasks for the landing page task." | Subtasks created under the correct task (via breakdown). |
| B4 | "Assign the tasks to John." | Assignee resolved to a real member; tasks updated; unknown name → asks which John. |

### C. MODIFICATION (write, confirmation-gated)

| # | Prompt | Expected |
|---|---|---|
| C1 | "Move the landing page deadline to Friday." | Task resolved; due date updated to the correct Friday; confirmation only once. |
| C2 | "Change this task to In Progress." | Status updated to the workspace's actual In Progress status. |
| C3 | "Assign this task to Sarah." | Assignee updated to real member. |
| C4 | "Add a dependency between these tasks." | `create_dependency` with correct predecessor/successor direction. |

### D. ANALYSIS (read + reasoning)

| # | Prompt | Expected |
|---|---|---|
| D1 | "Analyze this project's Gantt schedule." | Reads schedule/dependencies; describes the critical path in plain language. |
| D2 | "Find tasks that could delay the launch." | Uses dependencies + dates; names specific tasks and the reason (successor chain). |
| D3 | "Summarize this week's project activity." | Real activity data; concise, dated summary. |
| D4 | "Give me a project health score." | Uses `project_health_analysis` or equivalent; explains the score's drivers. |

### E. NATURAL LANGUAGE COMMANDS (multi-step)

| # | Prompt | Expected |
|---|---|---|
| E1 | "Create a marketing campaign project with the same structure as our previous campaign." | Finds the previous campaign, mirrors its structure (phases/tasks), asks before bulk-creating. |
| E2 | "Move all overdue tasks assigned to John to next week." | Identifies the set, confirms (bulk change), updates all due dates. |
| E3 | "Show me everything I need to finish before Friday." | Filters tasks by due date + assignee (self or workspace), grouped sensibly. |

## Gate

The behavior phase is done when, for two consecutive benchmark runs:

1. All A/D tasks pass with no hallucination (rubric ≥ 4 on all dimensions).
2. B/C/E tasks complete end-to-end through the confirmation flow (in-chat confirm → action performed → outcome confirmed).
3. No task triggers an unrequested refusal ("I can't do that") or an internal leak (tool names, "Nova", stage names) in the response.
4. You, the operator, would happily demo the results to a customer.