import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = {
  title: "Project Management Software & Agile Guides Hub (2026)",
  description:
    "Explore every Theta PM comparison, agile guide, and alternative breakdown in one place. Find the right project management tool for your team without the setup tax.",
  alternates: { canonical: `${BASE}/cornerstone` },
  openGraph: {
    title: "Project Management Software & Agile Guides Hub (2026)",
    description:
      "Every comparison, agile guide, and alternative breakdown in one place.",
    url: `${BASE}/cornerstone`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Management Software & Agile Guides Hub (2026)",
    description:
      "Every comparison, agile guide, and alternative breakdown in one place.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Project Management Software & Agile Guides Hub (2026)",
    description:
      "The complete hub for project management software comparisons, agile guides, and team workflow tools.",
    url: `${BASE}/cornerstone`,
  },
];

export default function Cornerstone() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Cornerstone"]}
        title="Project Management Software Hub: Comparisons, Guides, and Alternatives"
        intro={[
          "Everything we have written about choosing and running project management software, collected in one place. Start with a head-to-head comparison, learn the methodology behind it, or browse alternatives to the tool your team is leaving.",
          "Each section links to the full article, so you can go as deep as your decision needs.",
        ]}
        sections={[
          {
            h2: "Project Management Software Comparisons",
            paragraphs: [
              "Head-to-head breakdowns of Theta PM against the tools teams most often evaluate. Each comparison covers setup time, planning views, integrations, and pricing — including where the other tool wins.",
            ],
            bullets: [
              "Theta PM vs Jira — agile power without the configuration tax.",
              "Theta PM vs Monday.com — visual boards vs real planning depth.",
              "Theta PM vs ClickUp — feature sprawl vs a focused toolkit.",
              "Theta PM vs Notion — a wiki with tasks vs a task tool with structure.",
              "Theta PM vs Wrike — enterprise governance vs real adoption.",
              "Theta PM vs Asana and Theta PM vs Trello for cross-functional and kanban-first teams.",
            ],
          },
          {
            h2: "Agile, Scrum, and Kanban Guides",
            paragraphs: [
              "Beginner-friendly explanations of the methodologies behind the tools. Written for teams that need to choose a way of working before they choose software.",
            ],
            bullets: [
              "What is agile project management, and the four values behind it.",
              "What is a sprint in Scrum — length, ceremonies, and how to run your first one.",
              "Agile vs Scrum vs Kanban — the difference in plain language.",
              "Scrum vs waterfall — planning everything up front vs adapting every sprint.",
              "Project management frameworks, kanban, and Gantt charts explained from scratch.",
            ],
          },
          {
            h2: "Alternatives by Tool",
            paragraphs: [
              "If you already know which tool you are leaving, start here. Each guide ranks the realistic alternatives, names free options, and explains how to migrate without losing your active work.",
            ],
            bullets: [
              "Jira, Microsoft Project, and Smartsheet alternatives for scheduling-heavy teams.",
              "Trello, Asana, Basecamp, and Monday.com alternatives for growing teams.",
              "Notion, ClickUp, Airtable, Hive, and Teamwork alternatives for teams that outgrew their setup.",
            ],
          },
          {
            h2: "Key Theta PM Features",
            paragraphs: [
              "The capabilities those comparisons keep referring back to: the same tasks shown as a board, a timeline, a Gantt chart, and a calendar, with no add-ons and no tier upgrades.",
            ],
            bullets: [
              "Kanban boards, timeline with milestones, Gantt with dependencies, and calendar views.",
              "Real-time collaboration with comments, mentions, and an activity feed on every task.",
              "Automation and workflow rules that move tasks and notify the team.",
              "Integrations with GitHub, Bitbucket, Slack, Figma, Canva, and more.",
              "A free tier that covers a full small team, not a trial.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Where should I start if I am choosing a project management tool?",
            a: "Start with the comparison closest to the tool you are currently using, then read the alternatives guide for that tool. If your team has not settled on a way of working yet, read Agile vs Scrum vs Kanban first — the methodology usually narrows the tool shortlist.",
          },
          {
            q: "Are the comparisons biased toward Theta PM?",
            a: "Each comparison names where the other tool wins, including Jira's depth, Monday.com's customizable boards, ClickUp's breadth, Notion's flexibility, and Wrike's enterprise governance. The goal is to help you pick correctly, not to make every tool look the same.",
          },
          {
            q: "Does Theta PM have a free plan?",
            a: "Yes. The free tier covers a full small team with boards, timeline, Gantt, and calendar views, plus one integration.",
          },
          {
            q: "Which guides are best for someone new to agile?",
            a: "Read What Is Agile Project Management first, then What Is a Sprint in Scrum, then Agile vs Scrum vs Kanban. Those three cover the vocabulary and the trade-offs without assuming prior experience.",
          },
          {
            q: "Can I migrate my existing tasks to Theta PM?",
            a: "Yes. Every alternatives guide includes a short migration section: export your active work, map statuses and fields, and run both tools in parallel for a week before switching fully.",
          },
        ]}
        internalLinks={[
          { label: "All PM Software Comparisons", href: "/project-management-software" },
          { label: "Theta PM vs Jira", href: "/project-management-software/theta-vs-jira" },
          { label: "Theta PM vs Monday.com", href: "/project-management-software/theta-vs-monday" },
          { label: "Theta PM vs ClickUp", href: "/project-management-software/theta-vs-clickup" },
          { label: "Theta PM vs Notion", href: "/project-management-software/theta-vs-notion" },
          { label: "Theta PM vs Wrike", href: "/project-management-software/theta-vs-wrike" },
          { label: "What Is Agile Project Management?", href: "/guides/what-is-agile" },
          { label: "What Is a Sprint in Scrum?", href: "/guides/what-is-a-sprint" },
          { label: "Agile vs Scrum vs Kanban", href: "/guides/kanban-vs-scrum-vs-agile" },
          { label: "Scrum vs Waterfall", href: "/guides/scrum-vs-waterfall" },
          { label: "Project Management Frameworks", href: "/guides/project-management-framework" },
          { label: "Kanban Guide", href: "/guides/kanban" },
          { label: "Jira Alternatives", href: "/alternatives/jira-alternative" },
          { label: "Microsoft Project Alternatives", href: "/alternatives/microsoft-project-alternative" },
          { label: "Monday.com Alternatives", href: "/alternatives/monday-alternative" },
          { label: "Trello Alternatives", href: "/alternatives/trello-alternative" },
          { label: "Notion Alternatives", href: "/alternatives/notion-alternative" },
          { label: "ClickUp Alternatives", href: "/alternatives/clickup-alternative" },
          { label: "Smartsheet Alternatives", href: "/alternatives/smartsheet-alternative" },
          { label: "Teamwork Alternatives", href: "/alternatives/teamwork-alternative" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Timeline Software", href: "/features/timeline" },
          { label: "Pricing", href: "/pricing" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
