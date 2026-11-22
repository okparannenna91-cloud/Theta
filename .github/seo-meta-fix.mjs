// One-shot metadata migration for app/(marketing).
// Rewrites every marketing page's metadata through buildMetadata with a
// complete sentence description of at most 158 characters.
// Exits non-zero (so the workflow pushes nothing) if the result does not verify.
// Written with plain string operations only: no regexes, no escapes.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const NL = String.fromCharCode(10);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".tsx")) out.push(p);
  }
  return out.sort();
}

function metadataBlock(src) {
  const start = src.indexOf("export const metadata");
  if (start === -1) return null;
  const lines = src.slice(start).split(NL);
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "};" || t === "});") { end = i; break; }
  }
  if (end === -1) return null;
  return {
    before: src.slice(0, start),
    block: lines.slice(0, end + 1).join(NL),
    after: lines.slice(end + 1).join(NL),
  };
}

function fieldValue(block, field) {
  const marker = field + ': "';
  const i = block.indexOf(marker);
  if (i === -1) return null;
  const s = i + marker.length;
  const e = block.indexOf('"', s);
  if (e === -1) return null;
  return block.slice(s, e);
}

function descriptionValue(block) {
  const i = block.indexOf("description:");
  if (i === -1) return null;
  const s = block.indexOf('"', i);
  if (s === -1) return null;
  const e = block.indexOf('",', s);
  if (e === -1) return null;
  return block.slice(s + 1, e).split(NL).map((x) => x.trim()).join(" ");
}

function canonicalPath(block) {
  const i = block.indexOf("canonical:");
  if (i === -1) return null;
  const s = block.indexOf("${BASE}", i);
  if (s === -1) return null;
  const e = block.indexOf("`", s);
  if (e === -1) return null;
  return block.slice(s + 7, e);
}

function replaceField(block, field, value) {
  const i = block.indexOf(field + ":");
  if (i === -1) return block;
  const s = block.indexOf('"', i);
  if (s === -1) return block;
  const e = block.indexOf('"', s + 1);
  if (e === -1) return block;
  return block.slice(0, i) + field + ": " + JSON.stringify(value) + block.slice(e + 1);
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
  "/pricing/free-vs-pro": "A side-by-side look at Theta PM Free, Growth, and Pro: user limits, boards, storage, automations, and integrations, with costs at real team sizes.",
};

let changed = 0;
for (const f of walk("app/(marketing)")) {
  const src = readFileSync(f, "utf8");
  const parts = metadataBlock(src);
  if (!parts) continue;
  const { before, block, after } = parts;
  const title = fieldValue(block, "title");
  const rawDesc = descriptionValue(block);
  let rawPath = fieldValue(block, "path");
  if (!rawPath) rawPath = canonicalPath(block);
  if (!title || !rawDesc || !rawPath) { console.log("skipped (unparsed):", f); continue; }

  const path = rawPath.startsWith("/(marketing)/") ? rawPath.slice(12) : rawPath;
  const newDesc = NEW_DESC[path] || rawDesc;
  if (newDesc.length > 158) { console.error("description too long:", f); process.exit(1); }

  const isHelper = block.indexOf("buildMetadata(") !== -1;
  let out;
  if (isHelper) {
    if (newDesc === rawDesc && rawPath === path) continue;
    let next = replaceField(block, "description", newDesc);
    if (path !== rawPath) next = replaceField(next, "path", path);
    out = before + next + after;
  } else {
    const keys = [];
    for (const line of block.split(NL)) {
      if (line.startsWith("  ") && !line.startsWith("   ") && line.indexOf(":") !== -1) {
        keys.push(line.slice(2, line.indexOf(":")));
      }
    }
    const allowed = ["title", "description", "alternates", "openGraph", "twitter", "robots"];
    for (const k of keys) {
      if (allowed.indexOf(k) === -1) { console.error("unexpected metadata key " + k + ":", f); process.exit(1); }
    }
    if (block.indexOf("index: false") !== -1 || block.indexOf("follow: false") !== -1) {
      console.error("noindex page:", f);
      process.exit(1);
    }
    const rebuilt = [
      "export const metadata: Metadata = buildMetadata({",
      "  title: " + JSON.stringify(title) + ",",
      "  description:",
      "    " + JSON.stringify(newDesc) + ",",
      "  path: " + JSON.stringify(path) + ",",
      "});",
    ].join(NL);
    out = before + rebuilt + after;
  }

  if (out.indexOf('from "@/lib/seo"') === -1) {
    const lines = out.split(NL);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('import { SeoContent } from "@/components/seo/seo-content";') === 0) {
        lines.splice(i + 1, 0, 'import { buildMetadata } from "@/lib/seo";');
        break;
      }
    }
    out = lines.join(NL);
  }

  const baseLine = 'const BASE = "https://www.thetapm.site";' + NL + NL;
  if (out.indexOf(baseLine) !== -1) {
    const stripped = out.split(baseLine).join("");
    if (stripped.indexOf("BASE") === -1) out = stripped;
  }

  out = out.split("});" + NL + "const ").join("});" + NL + NL + "const ");
  out = out.split("});" + NL + "export ").join("});" + NL + NL + "export ");
  out = out.split("});" + NL + "function ").join("});" + NL + NL + "function ");

  if (out !== src) { writeFileSync(f, out); changed++; }
}
console.log("updated " + changed + " marketing pages");

let bad = 0;
for (const f of walk("app/(marketing)")) {
  const src = readFileSync(f, "utf8");
  const parts = metadataBlock(src);
  if (!parts) continue;
  if (parts.block.indexOf("buildMetadata(") === -1) { console.error("still bypassing:", f); bad++; }
  const d = descriptionValue(parts.block);
  const last = d ? d.slice(-1) : "";
  if (!d || d.length > 158 || ".!?".indexOf(last) === -1) { console.error("bad description:", f, d && d.length); bad++; }
}
if (bad) { console.error("verification failed: " + bad); process.exit(1); }
console.log("verification passed: every marketing page uses buildMetadata with a complete description of at most 158 chars");
