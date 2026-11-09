import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = {
  title: "Theta PM — Project Management Software & Guides (2026)",
  description:
    "The complete hub for project management software comparisons, agile guides, and team workflow tools. Find the right tool for your team with in-depth comparisons and beginner guides.",
  alternates: { canonical: `${BASE}/cornerstone` },
  openGraph: {
    title: "Theta PM — Project Management Software & Guides (2026)",
    description:
      "The complete hub for project management software comparisons, agile guides, and team workflow tools.",
    url: `${BASE}/cornerstone`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Theta PM — Project Management Software & Guides (2026)",
    description:
      "The complete hub for project management software comparisons, agile guides, and team workflow tools.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Theta PM — Project Management Software & Guides (2026)",
    description:
      "The complete hub for project management software comparisons, agile guides, and team workflow tools.",
    url: `${BASE}/cornerstone`,
  },
];

export default function Cornerstone() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={[ "Home", "Cornerstone" ]}
        title="Theta PM Cornerstone: Project Management Hub (2026)"
        intro={[
          "Welcome to Theta PM's comprehensive project management resource hub. Explore in-depth comparisons of leading PM tools, beginner-friendly agile and scrum guides, and find the right workflow for your team.",
        ]}
        sections={[
          {
            h2: "Project Management Software Comparisons",
            paragraphs: [
              "Compare Theta PM against the most popular project management tools on the market. Find detailed side-by-side analysis of features, pricing, and workflow fit.",
            ],
            ul: {
              li: [
                { to: "/project-management-software", label: "All PM Software Comparisons" },
                { to: "/project-management-software/theta-vs-jira", label: "Theta PM vs Jira" },
                { to: "/project-management-software/theta-vs-notion", label: "Theta PM vs Notion" },
                { to: "/project-management-software/theta-vs-monday", label: "Theta PM vs Monday.com" },
                { to: "/project-management-software/theta-vs-clickup", label: "Theta PM vs ClickUp" },
                { to: "/project-management-software/theta-vs-wrike", label: "Theta PM vs Wrike" },
                { to: "/project-management-software/theta-vs-asana", label: "Theta PM vs Asana" },
                { to: "/project-management-software/theta-vs-trello", label: "Theta PM vs Trello" },
                { to: "/project-management-software/theta-vs-asana", label: "Theta PM vs Asana" },
                { to: "/project-management-software/theta-vs-clickup", label: "Theta PM vs ClickUp" },
                { to: "/project-management-software/theta-vs-wrike", label: "Theta PM vs Wrike" },
              ],
            },
          },
          {
            h2: "Agile & Scrum Guides",
            paragraphs: [
              "Beginner-friendly guides to agile methodologies, sprint planning, and framework comparisons. Learn which approach fits your team's workflow.",
            ],
            ul: {
              li: [
                { to: "/guides/what-is-agile", label: "What Is Agile Project Management?" },
                { to: "/guides/what-is-a-sprint", label: "What Is a Sprint in Scrum?" },
                { to: "/guides/kanban-vs-scrum-vs-agile", label: "Agile vs Scrum vs Kanban" },
                { to: "/guides/scrum-vs-waterfall", label: "Scrum vs Waterfall" },
                { to: "/guides/project-management-framework", label: "Project Management Frameworks" },
                { to: "/guides/kanban", label: "Kanban Guide" },
                { to: "/guides/what-is-a-gantt-chart", label: "Gantt Chart Guide" },
              ],
            },
          },
          {
            h2: "Alternative Comparison Pages",
            paragraphs: [
              "Explore alternative project management tools organized by category. Find the right fit for your team's specific needs and workflow.",
            ],
            ul: {
              li: [
                { to: "/alternatives/airtable-alternative", label: "Airtable Alternatives" },
                { to: "/alternatives/asana-alternative", label: "Asana Alternatives" },
                { to: "/alternatives/basecamp-alternative", label: "Basecamp Alternatives" },
                { to: "/alternatives/hive-alternative", label: "Hive Alternatives" },
                { to: "/alternatives/jira-alternative", label: "Jira Alternatives" },
                { to: "/alternatives/microsoft-project-alternative", label: "Microsoft Project Alternatives" },
                { to: "/alternatives/smartsheet-alternative", label: "Smartsheet Alternatives" },
                { to: "/alternatives/trello-alternative", label: "Trello Alternatives" },
                { to: "/alternatives/teamwork-alternative", label: "Teamwork Alternatives" },
                { to: "/alternatives/clickup-alternative", label: "ClickUp Alternatives" },
                { to: "/alternatives/monday-alternative", label: "Monday.com Alternatives" },
                { to: "/alternatives/notion-alternative", label: "Notion Alternatives" },
              ],
            },
          },
          {
            h2: "Key Theta PM Features",
            paragraphs: [
              "Discover Theta PM's core capabilities across boards, timelines, planning views, and integrations. See how Theta PM helps teams deliver projects without the configuration overhead.",
            ],
            ul: {
              li: [
                { to: "/features/kanban-board", label: "Kanban Board" },
                { to: "/features/gantt", label: "Gantt Charts" },
                { to: "/features/timeline", label: "Timeline Views" },
                { to: "/features/calendar", label: "Calendar View" },
                { to: "/features/milestones", label: "Milestones" },
                { to: "/features/integrations", label: "Integrations" },
                { to: "/features/reports", label: "Reports" },
                { to: "/features/portfolio", label: "Portfolio Views" },
                { to: "/features/automation", label: "Automation" },
                { to: "/features/collaboration", label: "Collaboration" },
              ],
            },
          },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}