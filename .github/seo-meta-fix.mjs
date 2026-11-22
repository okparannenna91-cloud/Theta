// One-shot SEO metadata migration for app/(marketing).
// Makes clampDescription() sentence-aware and routes every marketing page's
// metadata through buildMetadata with a complete 140-158 character description.
// Exits non-zero (and the workflow pushes nothing) if the result does not verify.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".tsx")) out.push(p);
  }
  return out.sort();
}

const NEW_DESC = {
  "/alternatives/jira-alternative": "Looking for a Jira alternative? Compare the best options for small teams, software teams, and agencies, including free plans and easy migration.",
  "/alternatives/clickup-alternative": "Looking for a ClickUp alternative? Compare the best options for teams that want planning power without the complexity, including free tools.",
  "/alternatives/monday-alternative": "Looking for a Monday.com alternative? Compare the best options for small teams, ops teams, and agencies, including free plans.",
  "/alternatives/notion-alternative": "Looking for a Notion alternative for project management? Compare the best options for teams that outgrew Notion's DIY setup, free plans included.",
  "/alternatives/trello-alternative": "Looking for a Trello alternative? Compare the best options for teams that need timelines, milestones, and reporting, including free plans.",
  "/alternatives/asana-alternative": "Asana is polished but feature-tiered. Compare the best Asana alternatives for teams that need timelines and dependencies without the upgrade ladder.",
  "/alternatives/airtable-alternative": "Airtable is a relational database, not a delivery tool. Here is when to keep it, when to replace it, and how teams migrate without losing their base.",
  "/alternatives/hive-alternative": "Hive bundles approvals, forms, and resourcing but asks a lot in setup. Compare alternatives for teams that want the useful parts without the weight.",
  "/alternatives/teamwork-alternative": "Teamwork is built around client billing. Compare alternatives for agencies that want delivery tracking and time reporting without the billing weight.",
  "/alternatives/basecamp-alternative": "Basecamp is calm and flat-priced but has no timeline, dependencies, or sprints. See the best alternatives for teams that need real planning depth.",
  "/alternatives/smartsheet-alternative": "Smartsheet is a spreadsheet with a Gantt engine. Compare alternatives for scheduling-heavy teams that want dependencies without a formula-first grid.",
  "/alternatives/microsoft-project-alternative": "Looking for a Microsoft Project alternative? Compare the best options for scheduling, Gantt charts, dependencies, and free or paid collaboration.",
  "/guides/kanban-vs-scrum-vs-agile": "Agile vs Scrum vs Kanban: which framework fits your team in 2026? Compare the key differences and when to use each, then match it to your work.",
  "/guides/scrum-vs-waterfall": "Waterfall vs Scrum: plan everything up front or adapt sprint by sprint. Compare planning, flexibility, delivery, and which method fits your project.",
  "/guides/what-is-agile": "Agile project management for beginners: the four values, how teams deliver in small increments, and how Scrum, Kanban, and Waterfall compare.",
  "/guides/what-is-a-sprint": "Sprint vs Scrum: how fixed-length cycles help teams deliver usable work. Learn sprint length, what happens inside, and how to run your first one.",
  "/guides/team-management": "Team management practices that hold up under delivery pressure: clear roles, honest capacity planning, useful one-on-ones, and real delegation.",
  "/guides/how-to-set-project-goals": "Set project goals as outcomes with a measure and a date, then break them into milestones and tasks. Includes examples and a review cadence.",
  "/guides/task-management-best-practices": "Task management best practices that actually work in 2026: write clear tasks, assign one owner, set real deadlines, and keep all work visible.",
  "/features/kanban-board": "Kanban board software with drag-and-drop cards, custom fields, automations, and real-time collaboration, plus timeline and Gantt on the same tasks.",
  "/features/project-planning": "Project planning software with milestones, timelines, dependencies, and Gantt charts. Plan the whole project and adapt as you learn.",
  "/features/timeline": "Project timeline software with milestones, drag-and-drop scheduling, and live updates. See every project on one timeline, in sync with daily work.",
  "/features/reports": "Project reports that answer status, workload, and delivery questions in one view. See what Theta PM reports on and how scheduled reports work.",
  "/project-management-software": "We compared the best project management software of 2026 for small teams, startups, agencies, and remote teams. See which tool fits how you work.",
  "/project-management-software/theta-vs-asana": "Theta PM vs Asana compared on views, real-time collaboration, automation, integrations, pricing, and ease of use. See which fits your team.",
  "/project-management-software/theta-vs-jira": "Jira vs Theta PM: agile power without the setup burden. Compare boards, Gantt charts, GitHub integration, setup time, and pricing side by side.",
  "/project-management-software/theta-vs-monday": "Monday.com vs Theta PM: visual boards vs real planning. Compare views, included features, and pricing to see which fits how your team works.",
  "/project-management-software/theta-vs-notion": "Notion vs Theta PM: a wiki with tasks, or a task tool with structure? Compare task management, planning views, and which suits your team.",
  "/project-management-software/theta-vs-clickup": "ClickUp vs Theta PM: one app vs a focused toolkit. Compare feature sprawl, setup time, planning views, and pricing before you commit.",
  "/project-management-software/theta-vs-wrike": "Wrike vs Theta PM: enterprise governance vs fast adoption. Compare tier-gated features, per-seat pricing, time-to-value, and what each includes.",
  "/cornerstone": "Explore every Theta PM comparison, agile guide, and alternative breakdown in one place. Find the right tool without the setup tax.",
  "/privacy": "Theta PM privacy policy: we do not sell your data. Read how we store project data and integrations, and what rights you have over your information.",
  "/pricing/enterprise": "Theta Plus removes the user cap and adds role-based permissions and unlimited integrations for $20 per month plus $4 per user. See what it covers.",
  "/pricing/free-vs-pro": "A side-by-side look at Theta PM Free, Growth, and Pro: user limits, boards, storage, automations, and integrations, with costs at real team sizes."
};

const SEO = "lib/seo.ts";
if (existsSync(SEO)) {
  let seo = readFileSync(SEO, "utf8");
  if (seo.includes("word boundary so metadata never cuts mid-word")) {
    seo = seo.replace(
      "/** Google truncates descriptions around 158 characters. */\nconst MAX_DESCRIPTION = 158;",
      "/** Google truncates descriptions around 158 characters. */\nconst MAX_DESCRIPTION = 158;\n/** Shortest description worth keeping when a sentence boundary is available. */\nconst MIN_DESCRIPTION = 110;"
    );
    const oldFn = [
      "/** Trim to a word boundary so metadata never cuts mid-word. */",
      "function clampDescription(description: string): string {",
      "  const trimmed = description.trim().replace(/\\s+/g, \" \");",
      "  if (trimmed.length <= MAX_DESCRIPTION) return trimmed;",
      "  const cut = trimmed.slice(0, MAX_DESCRIPTION);",
      "  const lastSpace = cut.lastIndexOf(\" \");",
      "  const bounded = lastSpace > 100 ? cut.slice(0, lastSpace) : cut;",
      "  return bounded.replace(/[,;:.\\s]+$/, \"\");",
      "}"
    ].join("\n");
    const newFn = [
      "/**",
      " * Keep a description inside Google's snippet budget without ending mid-clause.",
      " * A sentence boundary is preferred, so a snippet never dangles (\"...without\").",
      " */",
      "function clampDescription(description: string): string {",
      "  const trimmed = description.trim().replace(/\\s+/g, \" \");",
      "  if (trimmed.length <= MAX_DESCRIPTION) return trimmed;",
      "",
      "  const within = trimmed.slice(0, MAX_DESCRIPTION + 1);",
      "  const sentenceEnd = /[.!?](?=\\s|$)/g;",
      "  let bestSentenceEnd = -1;",
      "  for (let match = sentenceEnd.exec(within); match; match = sentenceEnd.exec(within)) {",
      "    const end = match.index + 1;",
      "    if (end >= MIN_DESCRIPTION && end <= MAX_DESCRIPTION) bestSentenceEnd = end;",
      "  }",
      "  if (bestSentenceEnd > 0) return trimmed.slice(0, bestSentenceEnd);",
      "",
      "  const cut = trimmed.slice(0, MAX_DESCRIPTION);",
      "  const lastSpace = cut.lastIndexOf(\" \");",
      "  const bounded = lastSpace >= MIN_DESCRIPTION ? cut.slice(0, lastSpace) : cut;",
      "  return `${bounded.replace(/[,;:.\\u2014\\u2013\\s]+$/, \"\")}\\u2026`;",
      "}"
    ].join("\n");
    if (!seo.includes(oldFn)) {
      console.error("could not locate clampDescription; aborting");
      process.exit(1);
    }
    seo = seo.replace(oldFn, newFn);
    writeFileSync(SEO, seo);
    console.log("updated lib/seo.ts");
  }
}

const pages = walk("app/(marketing)");
let changed = 0;
for (const f of pages) {
  const src = readFileSync(f, "utf8");
  const startIdx = src.indexOf("export const metadata");
  if (startIdx === -1) continue;
  const before = src.slice(0, startIdx);
  const lines = src.slice(startIdx).split("\n");
  let endLine = -1;
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "};" || t === "});") { endLine = i; break; }
  }
  if (endLine === -1) continue;
  const block = lines.slice(0, endLine + 1).join("\n");
  const after = lines.slice(endLine + 1).join("\n");
  const isHelper = /^export const metadata: Metadata = buildMetadata\\(/m.test(block);
  const title = block.match(/^\\s*title:\\s*\"([^\"]*)\"/m)?.[1];
  const rawDesc = block.match(/description:\\s*\\n?\\s*\"([\\s\\S]*?)\",?\\s*\\n/)?.[1].replace(/\\s+/g, " ");
  const rawPath =
    block.match(/^\\s*path:\\s*\"([^\"]+)\"/m)?.[1] ??
    block.match(/canonical:\\s*`\\$\\{BASE\\}([^`]+)`/)?.[1];
  if (!title || !rawDesc || !rawPath) continue;
  const path = rawPath.replace(/^\\/\\(marketing\\)/, "");
  const newDesc = NEW_DESC[path] ?? rawDesc;
  if (newDesc.length > 158) { console.error("description too long:", f); process.exit(1); }

  let out;
  if (isHelper) {
    if (newDesc === rawDesc && rawPath === path) continue;
    let next = block.replace(/description:\\s*\\n?\\s*\"([\\s\\S]*?)\",?\\s*\\n/, `description:\n    ${JSON.stringify(newDesc)},\n`);
    next = next.replace(/^ {2}path:\\s*\"[^\"]*\",$/m, `  path: ${JSON.stringify(path)},`);
    out = before + next + after;
  } else {
    const allowed = ["title", "description", "alternates", "openGraph", "twitter", "robots"];
    const topKeys = [...block.matchAll(/^ {2}([A-Za-z]+):/gm)].map((m) => m[1]);
    if (topKeys.some((k) => !allowed.includes(k))) { console.error("unexpected metadata keys:", f); process.exit(1); }
    if (/index:\\s*false|follow:\\s*false/.test(block)) { console.error("noindex page:", f); process.exit(1); }
    const newBlock = [
      "export const metadata: Metadata = buildMetadata({",
      `  title: ${JSON.stringify(title)},`,
      "  description:",
      `    ${JSON.stringify(newDesc)},`,
      `  path: ${JSON.stringify(path)},`,
      "});"
    ].join("\n");
    out = before + newBlock + after;
    const baseLine = 'const BASE = "https://www.thetapm.site";\n\n';
    if (out.includes(baseLine) && !/\\bBASE\\b/.test(out.replace(baseLine, ""))) out = out.replace(baseLine, "");
  }
  if (!/from \"@\\/lib\\/seo\"/.test(out)) {
    out = out.replace(/(^import \\{ SeoContent \\} from \"@\\/components\\/seo\\/seo-content\";$)/m, '$1\nimport { buildMetadata } from "@/lib/seo";');
  }
  out = out.replace(/\\}\\);?\\n(const |export |function )/g, "});\n\n$1");
  if (out !== src) { writeFileSync(f, out); changed++; }
}
console.log(`updated ${changed} marketing pages`);

// verify before anything is pushed
let bad = 0;
for (const f of walk("app/(marketing)")) {
  const src = readFileSync(f, "utf8");
  const startIdx = src.indexOf("export const metadata");
  if (startIdx === -1) continue;
  const lines = src.slice(startIdx).split("\n");
  let endLine = lines.length;
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "};" || t === "});") { endLine = i + 1; break; }
  }
  const block = lines.slice(0, endLine).join("\n");
  if (!/^export const metadata: Metadata = buildMetadata\\(/m.test(block)) { console.error("still bypassing:", f); bad++; }
  const d = block.match(/description:\\s*\\n?\\s*\"([\\s\\S]*?)\",?\\s*\\n/)?.[1].replace(/\\s+/g, " ");
  if (!d || d.length > 158 || !/[.!?]$/.test(d)) { console.error("bad description:", f, d && d.length); bad++; }
}
const seoFinal = readFileSync(SEO, "utf8");
if (!seoFinal.includes("MIN_DESCRIPTION")) { console.error("clamp not updated"); bad++; }
if (bad) { console.error(`verification failed (${bad})`); process.exit(1); }
console.log("verification passed: every marketing page uses buildMetadata with a complete description <=158 chars");
