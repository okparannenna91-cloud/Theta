#!/usr/bin/env node
/**
 * Phase 4 — mechanical Nova → Flow³ rename.
 *
 * Usage:
 *   node scripts/rename-nova-to-flow.mjs --dry-run    # show what would change
 *   node scripts/rename-nova-to-flow.mjs --execute    # apply changes
 *
 * What it does:
 *   - git mv lib/nova lib/flow
 *   - rewrites import paths (@/lib/nova/ → @/lib/flow/)
 *   - renames code identifiers (NovaAgent → FlowAgent, NovaIntent → FlowIntent,
 *     NOVA_VERSION → FLOW_VERSION, ...) and redis key prefixes (nova: → flow:)
 *   - renames the agent name in constitution/prompt text (Nova → Flow³)
 *   - renames lib/langraph/nova-agent → lib/langraph/flow-agent if present
 *
 * NOT executed (needs a database / decision):
 *   - Prisma model rename (nova_agents → flow_agents): edit
 *     prisma/schema.prisma manually, then `npx prisma generate` +
 *     `npx prisma db push`. Prints instructions only.
 *   - LANGGRAPH_MIGRATION_STRATEGY.md → FLOW_ARCHITECTURE.md: git mv manually
 *     (file is stale — rewrite its content by hand, don't auto-rename).
 *
 * Run AFTER Phase 1–3 are proven (per ChatGPT review: benchmark → behavior →
 * bridge → rename LAST). Do NOT run before that.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const root = process.cwd();
const execute = process.argv.includes("--execute");
const dryRun = process.argv.includes("--dry-run") || !execute;

const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".woff", ".woff2", ".ttf"]);
const SKIP_DIRS = new Set([".git", "node_modules", ".next", ".vercel", "dist", "build", "coverage"]);

// Exact identifier replacements (code). Order matters: longer tokens first.
const CODE_REPLACEMENTS = [
  ["NovaAgentResult", "FlowAgentResult"],
  ["NovaAgentContext", "FlowAgentContext"],
  ["NovaIntent", "FlowIntent"],
  ["NovaStage", "FlowStage"],
  ["NovaIdentity", "FlowIdentity"],
  ["NovaAgent", "FlowAgent"],
  ["NOVA_VERSION", "FLOW_VERSION"],
  ["NOVA_NAME", "FLOW_NAME"],
  ["NOVA_ENABLED", "FLOW_ENABLED"],
  ["nova_agents", "flow_agents"],
  ["nova:ratelimit", "flow:ratelimit"],
  ["nova:toolrate", "flow:toolrate"],
  ["nova:telemetry", "flow:telemetry"],
  ["nova:insights", "flow:insights"],
  ["nova:confirm", "flow:confirm"],
];

const IMPORT_REPLACEMENTS = [
  ["@/lib/nova/", "@/lib/flow/"],
  ["@/lib/langraph/nova-agent", "@/lib/langraph/flow-agent"],
  ["api/nova", "api/flow"],
];

const CHAT_TEXT_DIRS = new Set(["lib", "app", "components", "prompts"]);

function walk(dir) {
  const out = [];
  for (const entry of execFileSync("git", ["ls-files", dir], { cwd: root, encoding: "utf8" }).trim().split("\n")) {
    if (!entry) continue;
    if (SKIP_DIRS.has(entry.split("/")[0])) continue;
    if (BINARY_EXT.has(extname(entry).toLowerCase())) continue;
    out.push(entry);
  }
  return out;
}

function replaceAll(text, from, to) {
  if (!text.includes(from)) return text;
  const count = text.split(from).length - 1;
  return { text: text.split(from).join(to), count };
}

function preview() {
  const files = walk(root);
  console.log(`# Dry-run: ${files.length} tracked files scanned`);
  let total = 0;
  for (const file of files) {
    const original = readFileSync(join(root, file), "utf8");
    let text = original;
    const hits = [];
    for (const [from, to] of [...CODE_REPLACEMENTS, ...IMPORT_REPLACEMENTS]) {
      const r = replaceAll(text, from, to);
      if (r.count) hits.push(`${r.count}x ${from} → ${to}`);
      text = r.text;
    }
    if (file.startsWith("lib/nova/") || file.startsWith("lib/langraph/nova")) {
      hits.push("FILE MOVE → " + file.replace("lib/nova/", "lib/flow/"));
    }
    if (hits.length) {
      console.log(`  ${file}`);
      for (const h of hits) console.log(`    ${h}`);
      total += hits.length;
    }
  }
  console.log(`\n# ${total} changes would be applied. Run with --execute to apply.`);
}

function executeRename() {
  if (existsSync(join(root, "lib/nova"))) {
    execFileSync("git", ["mv", "lib/nova", "lib/flow"], { cwd: root, stdio: "inherit" });
    console.log("Moved lib/nova → lib/flow");
  }
  const novaAgent = join(root, "lib/langraph/nova-agent.ts");
  if (existsSync(novaAgent)) {
    execFileSync("git", ["mv", "lib/langraph/nova-agent.ts", "lib/langraph/flow-agent.ts"], { cwd: root, stdio: "inherit" });
    console.log("Moved lib/langraph/nova-agent.ts → lib/langraph/flow-agent.ts");
  }

  const files = walk(root);
  let total = 0;
  for (const file of files) {
    const path = join(root, file);
    const original = readFileSync(path, "utf8");
    let text = original;
    for (const [from, to] of [...CODE_REPLACEMENTS, ...IMPORT_REPLACEMENTS]) {
      const r = replaceAll(text, from, to);
      if (r.count) total += r.count;
      text = r.text;
    }
    if (text !== original) {
      writeFileSync(path, text);
      console.log(`Rewrote ${file}`);
    }
  }

  console.log(`\n# ${total} token replacements applied.`);
  console.log(`
# MANUAL STEPS (do not auto-run):
#   1. prisma/schema.prisma: rename model nova_agents → flow_agents (+ its @@map),
#      then: npx prisma generate && npx prisma db push
#   2. LANGGRAPH_MIGRATION_STRATEGY.md: git mv to FLOW_ARCHITECTURE.md and REWRITE
#      (the file is stale — its content must be rewritten by hand, not renamed).
#   3. Run: npx tsc --noEmit && npm test  (expect runtime knock-ons to fix,
#      e.g. redis key references in scripts/flow-benchmark.ts).
`);
}

if (dryRun) {
  preview();
  console.log("\nNo changes made. Re-run with --execute to apply.");
} else {
  executeRename();
}