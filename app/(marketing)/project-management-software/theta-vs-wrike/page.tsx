import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Theta PM vs Wrike (2026): Side-by-Side Comparison",
  description: "Theta PM vs Wrike compared on task management, planning views, automation, and pricing. See which project management tool fits your team in 2026.",
  alternates: { canonical: `${BASE}/project-management-software/theta-vs-wrike` },
  openGraph: {
    title: "Theta PM vs Wrike (2026): Side-by-Side Comparison",
    description: "Compared on task management, planning views, automation, and pricing.",
    url: `${BASE}/project-management-software/theta-vs-wrike`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Theta PM vs Wrike (2026): Side-by-Side Comparison",
    description: "Enterprise-grade planning, minus the bloat?",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Theta PM vs Wrike (2026): Side-by-Side Comparison",
    description: "Theta PM vs Wrike compared on task management, planning views, automation, and pricing.",
    author: { "@type": "Organization", name: "Theta PM Systems" },
    publisher: { "@type": "Organization", name: "Theta PM Systems" },
  },
];

export default function ThetaVsWrike() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Project Management Software", "Theta PM vs Wrike"]}
        title="Theta PM vs Wrike: Enterprise-Grade Planning Without the Bloat?"
        intro={[
          "Wrike is a serious platform for serious organizations — folders, dashboards, approvals, and enterprise governance built for scale. It works well in large companies with the admin capacity to configure it.",
          "Theta PM covers the same core job — planning projects, tracking tasks, automating busywork — in a tool small and mid-size teams can actually adopt. In this guide we compare structure, planning views, automation, and pricing.",
        ]}
        sections={[
          {
            h2: "At a Glance",
            paragraphs: [
              "Here is the short version before we dig into each tool.",
            ],
            table: {
              headers: ["Criterion", "Theta PM", "Wrike"],
              rows: [
                ["Best for", "Small and mid-size teams that want planning power", "Enterprise teams with complex governance needs"],
                ["Setup effort", "Minutes", "Configuration-heavy for full value"],
                ["Default views", "Board, timeline, Gantt, calendar", "List, board, timeline, Gantt"],
                ["Automation", "Built in, easy to set up", "Powerful, requires configuration"],
                ["Real-time updates", "Yes — instant sync", "Yes"],
                ["Free tier", "Covers a full small team", "Limited"],
              ],
            },
          },
          {
            h2: "Quick Verdict",
            paragraphs: [
              "Wrike is a legitimate enterprise tool. If you need rigorous approvals, extensive permissions, and enterprise reporting, it earns its place.",
              "For most teams, though, Wrike's power arrives with configuration overhead that slows adoption. Theta PM gives you the planning depth — timeline, Gantt, dependencies, automation — ready to use, so the tool supports the team instead of the other way around.",
            ],
            bullets: [
              "Wrike wins on enterprise governance and scale.",
              "Theta PM wins on speed to value and ease of adoption.",
              "Both offer Gantt views, automation, and real-time collaboration.",
              "Theta PM's free tier covers a full small team.",
            ],
          },
          {
            h2: "Task Management and Structure",
            paragraphs: [
              "Wrike organizes work in a folder hierarchy with spaces and dashboards. It is powerful and familiar to enterprise PMs, but the structure itself requires decisions up front, and new teams often get lost in the layers.",
              "Theta PM uses a flatter model: workspaces, projects, and tasks. Each task carries custom fields, comments, mentions, and an activity feed, and the task dialog keeps everything one click away. For teams of any size, that structure is enough — and far easier to navigate.",
            ],
            screenshot: "Screenshot: Theta PM task dialog with assignee, due date, custom fields, and activity feed.",
          },
          {
            h2: "Planning Views: Timeline and Gantt",
            paragraphs: [
              "Wrike's Gantt view is well regarded, and its timeline features are genuinely strong — but in Wrike, full planning depth is tied to higher-tier plans.",
              "Theta PM includes a timeline with milestones and a Gantt view with dependencies and working-day scheduling in every plan, including the free tier. The same tasks you drag on the board update the Gantt automatically, so the plan and the execution stay in sync.",
            ],
            bullets: [
              "Timeline with milestones for long projects.",
              "Gantt view with task dependencies and working-day scheduling.",
              "Calendar view for date-driven teams.",
              "No add-ons or tier upgrades for planning views.",
            ],
            screenshot: "Screenshot: Theta PM milestone timeline and Gantt view for a single project.",
          },
          {
            h2: "Automation and Workflow Rules",
            paragraphs: [
              "Wrike's automation is powerful, and in enterprise settings it can model genuinely complex approval chains.",
              "Theta PM keeps automation practical: workflow rules that move tasks, assign work, and notify the team, set up in minutes without a formula language. For most teams, that covers the busywork that actually eats the day.",
            ],
          },
          {
            h2: "Integrations",
            paragraphs: [
              "Wrike connects to the usual enterprise stack, with deeper features on higher tiers.",
              "Theta PM ships with the integrations teams actually run on: GitHub (repos, issues, PRs), Bitbucket, Asana, Trello, Slack, Figma, Canva, and WooCommerce. Code, designs, and commerce data land inside tasks.",
            ],
          },
          {
            h2: "Pricing",
            paragraphs: [
              "Wrike's most useful features — Gantt, dashboards, automations — sit on mid-tier and enterprise plans, and per-seat pricing climbs quickly.",
              "Theta PM's free tier covers a full small team with boards, timeline, Gantt, and calendar included, and paid plans use simple per-seat pricing without gating views.",
            ],
          },
          {
            h2: "Who Should Choose Which Tool",
            h3s: [
              {
                heading: "Choose Theta PM if you…",
                bullets: [
                  "Are a small or mid-size team that wants planning power without the setup project.",
                  "Need timeline, Gantt, and calendar views without tier upgrades.",
                  "Want automation you can set up in minutes.",
                  "Want a free tier that actually covers your team.",
                ],
              },
              {
                heading: "Choose Wrike if you…",
                bullets: [
                  "Operate in a large organization with complex governance and permissions.",
                  "Need enterprise approvals and compliance reporting.",
                  "Have dedicated admin capacity to configure the platform.",
                  "Are already standardized on Wrike across teams.",
                ],
              },
            ],
          },
        ]}
        faqs={[
          {
            q: "Is Theta PM a good Wrike alternative for small teams?",
            a: "Yes. Theta PM gives small and mid-size teams Wrike-style planning power — timeline, Gantt, dependencies, automation — without the configuration burden, and its free tier covers a full small team.",
          },
          {
            q: "Does Theta PM have Gantt charts?",
            a: "Yes. Theta PM's Gantt view includes task bars, dependency links, and working-day scheduling, and it stays in sync with your kanban board automatically.",
          },
          {
            q: "Is Wrike worth the price for a small team?",
            a: "Only if you need enterprise governance features. Most planning needs — boards, timelines, Gantt, automation — are covered by Theta PM at a fraction of the cost and setup time.",
          },
          {
            q: "Can I automate workflows in Theta PM?",
            a: "Yes. Theta PM includes workflow rules that move tasks, assign work, and notify the team — set up in minutes, with no formula language required.",
          },
          {
            q: "Which tool is easier for teams to adopt?",
            a: "Theta PM. The structure is ready when you sign in, while Wrike's folder hierarchy and configuration demand decisions before the tool becomes useful.",
          },
        ]}
        internalLinks={[
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Project Timeline Software", href: "/features/timeline" },
          { label: "Task Management Software", href: "/features/tasks" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
