import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Theta PM vs Asana (2026): Side-by-Side Comparison",
  description: "Theta PM vs Asana compared on views, real-time collaboration, automation, integrations, pricing, and ease of use. See which project management tool fits your team.",
  alternates: { canonical: `${BASE}/project-management-software/theta-vs-asana` },
  openGraph: {
    title: "Theta PM vs Asana (2026): Side-by-Side Comparison",
    description: "Compared on views, real-time collaboration, automation, integrations, pricing, and ease of use.",
    url: `${BASE}/project-management-software/theta-vs-asana`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Theta PM vs Asana (2026): Side-by-Side Comparison",
    description: "Which project management tool fits your team?",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Theta PM vs Asana (2026): Side-by-Side Comparison",
    description: "Theta PM vs Asana compared on views, collaboration, automation, integrations, pricing, and ease of use.",
    author: { "@type": "Organization", name: "Theta PM Systems" },
    publisher: { "@type": "Organization", name: "Theta PM Systems" },
  },
];

export default function ThetaVsAsana() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Project Management Software", "Theta PM vs Asana"]}
        title="Theta PM vs Asana: Which One Should You Pick in 2026?"
        intro={[
          "Asana is one of the most popular project management tools on the market, and for good reason — it is polished, reliable, and widely adopted. Theta PM is a newer, PM-native platform built for teams that want planning, tracking, and collaboration in one place without the process bloat.",
          "In this comparison we look at the views, real-time collaboration, automation, integrations, pricing, and day-to-day experience of both tools, and tell you exactly which type of team should pick which.",
        ]}
        sections={[
          {
            h2: "At a Glance",
            paragraphs: [
              "Here is the short version before we dig into details.",
            ],
            table: {
              headers: ["Criterion", "Theta PM", "Asana"],
              rows: [
                ["Best for", "PM-native teams that want views without bloat", "Cross-functional teams, list-first work"],
                ["Default views", "Board, timeline, Gantt, calendar", "List, board, timeline, calendar"],
                ["Real-time updates", "Yes — instant sync", "Yes"],
                ["Free tier", "Yes — up to 5 members", "Limited"],
                ["Automations", "Built in", "Available on paid plans"],
                ["GitHub integration", "Deep — repos, issues, PRs", "Available via integration"],
                ["Learning curve", "Gentle", "Gentle to moderate"],
              ],
            },
            screenshot: "Screenshot: Theta PM project with board, timeline, and Gantt views of the same tasks.",
          },
          {
            h2: "Views and Workflow Fit",
            paragraphs: [
              "The biggest difference shows up in how each tool lets you see work. Asana is list-first: most teams start with a list view and add a board or timeline when needed. It is excellent for teams that think in tasks and checklists.",
              "Theta PM shows every task across kanban, timeline, Gantt, and calendar from the same data. Teams that plan with timelines and dependencies — software, product, and operations teams — can switch views without re-entering anything.",
            ],
            h3s: [
              {
                heading: "When Asana wins on views",
                body: "If your team lives in lists and needs lightweight portfolio dashboards, Asana's list experience is very mature.",
              },
              {
                heading: "When Theta PM wins on views",
                body: "If your team needs Gantt charts, milestone timelines, and a calendar for the same tasks, Theta PM keeps one source of truth instead of separate tools.",
              },
            ],
          },
          {
            h2: "Real-Time Collaboration",
            paragraphs: [
              "Both tools update in real time, so comments and status changes appear without a refresh. Theta PM surfaces a live activity feed and inbox-style notifications, which helps distributed teams stay aligned without endless meetings.",
              "Asana's collaboration is solid, with comments on tasks and project-wide updates. Theta PM's notifications and mentions are designed to reduce status meetings by keeping every change visible.",
            ],
          },
          {
            h2: "Automation and Integrations",
            paragraphs: [
              "Asana offers powerful automation rules on paid plans and integrates with hundreds of tools through its app library.",
              "Theta PM has automation built in — you can move tasks between columns, assign work, and notify the right people automatically. Its integrations cover the tools teams actually run on: GitHub, Bitbucket, Asana, Trello, Slack, Figma, Canva, and WooCommerce.",
            ],
          },
          {
            h2: "Pricing",
            paragraphs: [
              "Asana's free plan is limited and the paid tiers add per-user cost that climbs with automations, advanced views, and guest seats.",
              "Theta PM's free tier covers a small team of up to five members, and paid plans are priced transparently without a maze of per-seat add-ons for basic views.",
            ],
          },
          {
            h2: "Who Should Choose Asana",
            bullets: [
              "Teams already running on Asana that are happy with it — there is no reason to move.",
              "List-first teams that rarely need Gantt or dependency views.",
              "Organizations that rely on Asana's mature marketplace and governance features.",
            ],
          },
          {
            h2: "Who Should Choose Theta PM",
            bullets: [
              "Teams that plan with timelines, milestones, and Gantt charts.",
              "Software and product teams that want GitHub issues and PRs flowing into tasks.",
              "Teams consolidating chat, boards, and spreadsheets into one platform.",
              "Budget-conscious small teams that need the full toolkit, not a teaser.",
            ],
          },
          {
            h2: "Switching From Asana to Theta PM",
            paragraphs: [
              "Moving from Asana is straightforward. Export your tasks, create projects in Theta PM, and re-link recurring processes. Most teams keep both tools running for a week or two during the switch.",
              "If you already use Asana for some projects and Theta PM for others, both platforms can run side by side without conflict.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Is Theta PM better than Asana?",
            a: "It depends on how your team works. Theta PM is better for teams that need timelines, Gantt charts, and kanban on the same tasks, plus deep GitHub integration. Asana is better for teams that are list-first and already invested in its ecosystem.",
          },
          {
            q: "Can I import my Asana projects into Theta PM?",
            a: "You can export the projects and tasks you need from Asana and set them up in Theta PM, and most teams run both tools side by side for a week or two during the switch. The Asana integration also keeps work in sync while you migrate.",
          },
          {
            q: "Does Theta PM have a free plan?",
            a: "Yes. Theta PM's free tier covers a small team of up to five members with unlimited tasks and timelines, plus boards and Gantt view.",
          },
          {
            q: "Which tool is easier to learn?",
            a: "Both are gentle. Asana's list-first interface is familiar to anyone who has used a spreadsheet. Theta PM adds more planning views, so there is slightly more to explore, but nothing that requires training.",
          },
        ]}
        internalLinks={[
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
          { label: "Jira Alternative", href: "/alternatives/jira-alternative" },
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Pricing", href: "/pricing" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
