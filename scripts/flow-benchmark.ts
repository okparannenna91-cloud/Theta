/**
 * Flow³ behavior benchmark runner.
 *
 * Runs the agent (currently the Nova/LangGraph backend via runNovaAgent) against
 * the benchmark tasks defined in Theta/flow-benchmark.md and writes a gradeable
 * report to Theta/flow-benchmark-results.md.
 *
 * Usage:
 *   npm run bench:flow -- --user <prisma-user-id> --workspace <workspace-id> [--out <file>] [--filter <regex>]
 *
 * Requires a reachable DB and AI provider keys (loaded from .env.local).
 * Run from the repo root.
 */
import path from "path";
import fs from "fs";

loadEnvFile(path.resolve(process.cwd(), ".env.local"));

import { DecisionFramework } from "@/lib/nova/decision-framework";
import { routeRequest } from "@/lib/nova/intent-router";
import { runNovaAgent } from "@/lib/langraph";

interface BenchmarkTask {
  id: string;
  category: string;
  prompt: string;
  expected: string;
}

const TASKS: BenchmarkTask[] = [
  // A. INFORMATION
  { id: "A1", category: "INFORMATION", prompt: "Show me all overdue tasks.", expected: "Calls a task/search tool scoped to the workspace; lists overdue tasks with due dates and assignees." },
  { id: "A2", category: "INFORMATION", prompt: "What projects are behind schedule?", expected: "Uses project/schedule data; names projects with evidence (dates, progress), not guesses." },
  { id: "A3", category: "INFORMATION", prompt: "How is the Marketing Campaign project progressing?", expected: "Resolves the project; reports progress metrics from real data." },
  { id: "A4", category: "INFORMATION", prompt: "Who has the most overdue tasks?", expected: "Aggregates by assignee from real task data; names the person and count." },
  // B. CREATION
  { id: "B1", category: "CREATION", prompt: "Create a project called Website Redesign.", expected: "One confirmation (MEDIUM risk); on approve -> project created in the workspace." },
  { id: "B2", category: "CREATION", prompt: "Create these 10 tasks inside the Website Redesign project: Design homepage, Write copy, Build landing page, Set up analytics, Create blog, Fix mobile nav, Add contact form, SEO pass, Launch prep, Post-launch review.", expected: "Confirmation; tasks created under the project with the given titles." },
  { id: "B3", category: "CREATION", prompt: "Create subtasks for the landing page task.", expected: "Subtasks created under the correct task (via breakdown)." },
  { id: "B4", category: "CREATION", prompt: "Assign the tasks to John.", expected: "Assignee resolved to a real member; unknown name -> asks which John." },
  // C. MODIFICATION
  { id: "C1", category: "MODIFICATION", prompt: "Move the landing page deadline to Friday.", expected: "Task resolved; due date updated to the correct Friday; confirmation only once." },
  { id: "C2", category: "MODIFICATION", prompt: "Change the landing page task to In Progress.", expected: "Status updated to the workspace's actual In Progress status." },
  { id: "C3", category: "MODIFICATION", prompt: "Assign the landing page task to Sarah.", expected: "Assignee updated to a real member." },
  { id: "C4", category: "MODIFICATION", prompt: "Add a dependency between the landing page task and the SEO pass task.", expected: "Dependency created with correct predecessor/successor direction." },
  // D. ANALYSIS
  { id: "D1", category: "ANALYSIS", prompt: "Analyze the Website Redesign project's Gantt schedule.", expected: "Reads schedule/dependencies; describes the critical path in plain language." },
  { id: "D2", category: "ANALYSIS", prompt: "Find tasks that could delay the launch.", expected: "Uses dependencies + dates; names specific tasks and the reason." },
  { id: "D3", category: "ANALYSIS", prompt: "Summarize this week's project activity.", expected: "Real activity data; concise, dated summary." },
  { id: "D4", category: "ANALYSIS", prompt: "Give me a project health score for Website Redesign.", expected: "Uses project_health_analysis or equivalent; explains the score's drivers." },
  // E. NATURAL LANGUAGE COMMANDS
  { id: "E1", category: "NL COMMANDS", prompt: "Create a marketing campaign project with the same structure as our previous campaign.", expected: "Finds the previous campaign, mirrors its structure, asks before bulk-creating." },
  { id: "E2", category: "NL COMMANDS", prompt: "Move all overdue tasks assigned to John to next week.", expected: "Identifies the set, confirms (bulk change), updates all due dates." },
  { id: "E3", category: "NL COMMANDS", prompt: "Show me everything I need to finish before Friday.", expected: "Filters tasks by due date + assignee, grouped sensibly." },
];

interface TaskRun {
  task: BenchmarkTask;
  status: "ok" | "error" | "blocked";
  response: string;
  toolCalls: string[];
  model: string;
  provider: string;
  durationMs: number;
  error?: string;
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
      out[key] = value;
      if (value !== "true") i++;
    }
  }
  return out;
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.warn(`[bench] No .env.local found at ${filePath} — using existing environment.`);
    return;
  }
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function escapeMd(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function buildReport(runs: TaskRun[], startedAt: string, elapsedMs: number): string {
  const byCategory: Record<string, TaskRun[]> = {};
  for (const run of runs) {
    (byCategory[run.task.category] ||= []).push(run);
  }

  const lines: string[] = [];
  lines.push("# Flow³ Benchmark Results", "");
  lines.push(`- Run started: ${startedAt}`);
  lines.push(`- Total duration: ${(elapsedMs / 1000).toFixed(1)}s`);
  lines.push(`- Agent: runNovaAgent (LangGraph backend)`);
  lines.push("", "## Summary table", "");
  lines.push("| Task | Category | Status | Model | Provider | Tools called | Duration | Grade |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const run of runs) {
    lines.push(
      `| ${run.task.id} | ${run.task.category} | ${run.status} | ${escapeMd(run.model)} | ${escapeMd(run.provider)} | ${run.toolCalls.join(", ") || "—"} | ${run.durationMs}ms | [ ] |`
    );
  }
  lines.push("", "## Per-task detail", "");

  for (const [category, categoryRuns] of Object.entries(byCategory)) {
    lines.push(`### ${category}`, "");
    for (const run of categoryRuns) {
      lines.push(`#### ${run.task.id} — ${escapeMd(run.task.prompt)}`, "");
      lines.push(`**Expected:** ${run.task.expected}`, "");
      if (run.error) {
        lines.push(`**Error:** \`${escapeMd(run.error)}\``, "");
      } else {
        lines.push("**Actual response:**", "", "```", run.response, "```", "");
        if (run.toolCalls.length) {
          lines.push(`**Tools called:** ${run.toolCalls.map((t) => `\`${t}\``).join(", ")}`, "");
        }
      }
      lines.push(`**Model:** ${run.model} · **Provider:** ${run.provider} · **Duration:** ${run.durationMs}ms`, "");
      lines.push(
        "**Rubric:** Tool selection [ ]  Parameters [ ]  Hallucination [ ]  Refusal [ ]  Verbosity [ ]  Latency [ ]  Confirmation [ ]",
        "",
        "**Notes:**",
        "",
        "---",
        ""
      );
    }
  }

  lines.push("## Operator verdict", "", "Does this feel like the copilot you wanted? (yes / no + why)");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const userId = args.user;
  const workspaceId = args.workspace;
  const outPath = args.out ? path.resolve(process.cwd(), args.out) : path.resolve(process.cwd(), "Theta", "flow-benchmark-results.md");
  const filter = args.filter ? new RegExp(args.filter) : null;

  if (!userId || !workspaceId) {
    console.error("Usage: npm run bench:flow -- --user <prisma-user-id> --workspace <workspace-id> [--out <file>] [--filter <regex>]");
    process.exit(1);
  }

  const tasks = filter ? TASKS.filter((t) => filter.test(t.id)) : TASKS;
  console.log(`[bench] Running ${tasks.length} tasks (user=${userId}, workspace=${workspaceId})`);

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const runs: TaskRun[] = [];

  for (const task of tasks) {
    const runStart = Date.now();
    console.log(`[bench] ${task.id}: ${task.prompt.slice(0, 60)}…`);
    const run: TaskRun = {
      task,
      status: "ok",
      response: "",
      toolCalls: [],
      model: "",
      provider: "",
      durationMs: 0,
    };
    try {
      const decision = await DecisionFramework.evaluateAsync(task.prompt, {
        hasWorkspace: true,
        hasProject: false,
      });
      const routeDecision = routeRequest(task.prompt, decision.intent);

      const result = await runNovaAgent(task.prompt, {
        userId,
        workspaceId,
        intent: decision.intent,
        routeDecision,
      });

      run.response = result.response;
      run.model = result.model;
      run.provider = result.provider;
      run.toolCalls = result.toolResults.map((tr) => tr.toolName);
      run.status = "ok";
    } catch (error: any) {
      run.status = "error";
      run.error = error?.message || String(error);
      console.error(`[bench] ${task.id} FAILED: ${run.error}`);
    } finally {
      run.durationMs = Date.now() - runStart;
      runs.push(run);
    }
  }

  const report = buildReport(runs, startedAt, Date.now() - startedMs);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report, "utf8");

  const okCount = runs.filter((r) => r.status === "ok").length;
  console.log(`[bench] Done. ${okCount}/${runs.length} completed without errors. Report: ${outPath}`);
  console.log("[bench] Grade each task in the report, then run the rubric gate from Theta/flow-benchmark.md.");
}

main().catch((error) => {
  console.error("[bench] Fatal:", error);
  process.exit(1);
});