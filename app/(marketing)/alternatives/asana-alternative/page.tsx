import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Best Asana Alternatives in 2026 (Free & Paid)",
  description:
    "Asana is polished but feature-tiered. Compare the strongest Asana alternatives for teams that need timelines, dependencies, and reporting without the per-seat upgrade ladder.",
  path: "/alternatives/asana-alternative",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Alternatives", "Asana Alternative"]}
        title="Best Asana Alternatives in 2026"
        intro={[
          "Asana is one of the most thoughtfully designed tools in the category. Tasks read cleanly, the timeline is genuinely good, and a cross-functional team can be productive in it quickly. That polish is real, and it is usually why teams adopt it in the first place.",
          "The complaints that follow are consistent: the features that make Asana useful for planning — timelines, dependencies, portfolios, workload — are spread across tiers, and the per-seat cost climbs as the team grows. Teams also hit a modeling ceiling, because complex work has to be expressed as tasks, subtasks, and custom fields.",
        ]}
        sections={[
          {
            h2: "Why Teams Look for an Asana Alternative",
            bullets: [
              "Planning views and advanced rules sit in higher tiers, so the cost rises faster than headcount.",
              "Work is modeled as tasks and subtasks, which gets awkward for real dependencies between projects.",
              "Reporting is capable but takes configuration before it answers a simple question.",
              "Per-seat pricing means a large team, or a team with many occasional users, becomes expensive.",
              "Inboxes and notifications can get noisy on large workspaces, which pushes people back to chat.",
            ],
          },
          {
            h2: "What to Look For in an Alternative",
            bullets: [
              "Planning views included at the tier you will actually buy, not unlocked later.",
              "A real dependency model — what blocks what, and what slips if one task slips.",
              "Multiple views on the same tasks, so nobody maintains a parallel spreadsheet.",
              "Integration depth where your work actually happens, especially repositories and chat.",
              "A free tier you can evaluate a real project on, not a trial that expires mid-decision.",
            ],
          },
          {
            h2: "Theta PM vs Asana",
            paragraphs: [
              "Theta PM covers the same ground as Asana's planning surface — board, list, timeline, calendar, dashboard — but treats those views as lenses on one set of tasks, with dependencies and milestones as part of the model rather than a tier gate.",
            ],
            table: {
              headers: ["", "Theta PM", "Asana"],
              rows: [
                ["Views", "Board, list, timeline, Gantt, calendar, dashboard", "List, board, timeline, calendar, dashboard"],
                ["Dependencies", "Gantt dependencies and milestones", "Available, tier-dependent"],
                ["Sprints", "Included on Growth and above", "Not a native concept"],
                ["Real-time collaboration", "Comments, mentions, activity feed per task", "Strong, with task conversations"],
                ["Automations", "10/month on Growth, unlimited on Pro", "Rules, tier and quota dependent"],
                ["Integrations", "GitHub, Bitbucket, Slack, Figma, Canva, Asana, Trello, WooCommerce", "Broad marketplace"],
                ["Import from Asana", "Built-in Asana integration", "—"],
                ["Free tier", "Up to 5 users, 3 boards, 1 integration", "Limited feature set"],
              ],
            },
          },
          {
            h2: "Where Asana Still Wins",
            paragraphs: [
              "Asana is the better choice in a few specific situations, and pretending otherwise does not help anyone.",
            ],
            bullets: [
              "You need a large, mature integration marketplace — Asana's ecosystem is broader.",
              "Your organization already standardizes on Asana across departments and the switching cost is organizational.",
              "You rely on goals and portfolio reporting at a level Theta PM does not currently match.",
              "You want a well-established vendor with a long public track record and a large template library.",
            ],
          },
          {
            h2: "How to Migrate From Asana",
            paragraphs: [
              "Asana and Theta PM share enough structure that migration is mostly about deciding what to leave behind, not about transforming data.",
            ],
            bullets: [
              "Export the projects that are actually active. Archive the rest in Asana rather than importing years of history.",
              "Map Asana sections to board columns, and custom fields to custom fields — most map directly.",
              "Move subtasks to real tasks with a parent link where the dependency matters, so the timeline reflects reality.",
              "Recreate only the rules you can name out loud. Most Asana workspaces carry automations nobody remembers adding.",
              "Run both tools for one cycle, then stop writing to Asana so there is a single source of truth.",
            ],
          },
          {
            h2: "Free Asana Alternatives",
            paragraphs: [
              "Theta PM's free plan is a working plan rather than a demo: up to five users, unlimited projects and tasks, three kanban boards, 256MB of storage, and one integration.",
              "If cost is the reason you are leaving Asana, check the free tier against your real headcount first. A five-person team that fits the free plan gets boards, timeline, Gantt, and calendar without paying for any of them.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is the best Asana alternative for small teams?",
            a: "Theta PM is a strong fit: the free plan covers five users with boards, timeline, Gantt, and calendar views, and paid plans start at $5 per month plus $2 per user. Asana itself remains a good option if you rely on its template library and marketplace.",
          },
          {
            q: "Does Theta PM have dependencies like Asana?",
            a: "Yes. Theta PM models dependencies in the Gantt view and supports milestones, so you can see what blocks what and which tasks belong to the same release.",
          },
          {
            q: "Can I import my Asana projects?",
            a: "Yes. Theta PM has an Asana integration for bringing projects and tasks across, and you can also export to CSV and map sections to columns and custom fields to custom fields.",
          },
          {
            q: "Is Theta PM cheaper than Asana?",
            a: "For most teams it is, because there is a real free plan and paid plans are a small base fee plus a low per-user charge — Growth is $5 plus $2 per user, Pro is $10 plus $3 per user, with 20% off annually. Compare against Asana's current list price for your seat count and the tier that includes timelines.",
          },
          {
            q: "When should I stay on Asana?",
            a: "If your organization runs portfolios and goals across many departments on Asana, or depends on integrations only its marketplace offers, migrating may cost more than it saves. The switch pays off when the team uses a fraction of Asana's surface area.",
          },
        ]}
        internalLinks={[
          { label: "Theta PM vs Asana", href: "/project-management-software/theta-vs-asana" },
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
          { label: "Timeline view", href: "/features/timeline" },
          { label: "Gantt chart software", href: "/features/gantt" },
          { label: "Reports", href: "/features/reports" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
