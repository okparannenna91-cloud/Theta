import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Kanban vs Scrum vs Agile: What's the Difference? (2026)",
  description: "Kanban vs Scrum vs Agile explained simply: how they differ, when to use each, and how to choose the right framework for your team in 2026.",
  alternates: { canonical: `${BASE}/guides/kanban-vs-scrum-vs-agile` },
  openGraph: {
    title: "Kanban vs Scrum vs Agile: What's the Difference? (2026)",
    description: "How they differ, when to use each, and how to choose.",
    url: `${BASE}/guides/kanban-vs-scrum-vs-agile`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kanban vs Scrum vs Agile: What's the Difference? (2026)",
    description: "How they differ, when to use each, and how to choose.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Kanban vs Scrum vs Agile: What's the Difference? (2026)",
    description: "Kanban, Scrum, and Agile compared: how they differ, when to use each, and how to choose.",
    author: { "@type": "Organization", name: "Theta PM Systems" },
    publisher: { "@type": "Organization", name: "Theta PM Systems" },
  },
];

export default function KanbanVsScrumVsAgile() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Kanban vs Scrum vs Agile"]}
        title="Kanban vs Scrum vs Agile: What's the Difference? (2026)"
        intro={[
          "If the difference between Agile, Scrum, and Kanban feels fuzzy, you are not alone. They are three overlapping ideas that people use interchangeably — but they are not the same thing.",
          "Here is the simplest way to think about it: Agile is a philosophy, Scrum is a framework built on that philosophy, and Kanban is a method you can use with or without Scrum. This guide explains all three and helps you pick the right one for your team.",
        ]}
        sections={[
          {
            h2: "Quick Comparison Table",
            paragraphs: [
              "The short version, before the details.",
            ],
            table: {
              headers: ["", "Agile", "Scrum", "Kanban"],
              rows: [
                ["What it is", "A set of principles", "A framework with roles & ceremonies", "A visual workflow method"],
                ["Time-boxed?", "No", "Yes — sprints", "No — continuous flow"],
                ["Roles", "Self-organizing team", "Scrum Master, Product Owner, team", "No fixed roles"],
                ["Planning", "Iterative", "Sprint planning", "On demand, pull-based"],
                ["Best for", "Teams wanting to adapt", "Product delivery in cycles", "Support, ops, continuous work"],
                ["Can combine?", "Foundation", "Can use kanban boards", "Works inside or without Scrum"],
              ],
            },
          },
          {
            h2: "What Is Agile?",
            paragraphs: [
              "Agile is a set of principles for delivering work in small increments and adapting as you learn. It is not a process with steps — it is a way of thinking that values working software, customer collaboration, and responding to change.",
              "Teams that say they are 'doing Agile' are usually using a framework like Scrum or a method like Kanban that puts those principles into practice.",
            ],
            bullets: [
              "Deliver small pieces of value often, not one big reveal at the end.",
              "Get feedback early and adapt the plan as you learn.",
              "Keep the customer and the team collaborating throughout.",
              "Reflect on the process regularly and improve it.",
            ],
          },
          {
            h2: "What Is Scrum?",
            paragraphs: [
              "Scrum is a structured framework for agile delivery. Work is planned in time-boxed cycles called sprints, usually two to four weeks. Each sprint ends with a review and a retrospective, then the next sprint begins.",
            ],
            h3s: [
              {
                heading: "Scrum roles",
                bullets: [
                  "Product Owner — decides what to build and in what order.",
                  "Scrum Master — keeps the process running and removes blockers.",
                  "Development team — plans and does the work in each sprint.",
                ],
              },
              {
                heading: "Scrum ceremonies",
                bullets: [
                  "Sprint planning — agree on what the team commits to this sprint.",
                  "Daily standup — a short check-in on progress and blockers.",
                  "Sprint review — show what was delivered.",
                  "Retrospective — discuss what to improve next sprint.",
                ],
              },
            ],
          },
          {
            h2: "What Is Kanban?",
            paragraphs: [
              "Kanban is a visual method for managing workflow with a board of columns and cards. There are no sprints and no fixed roles. Work is pulled through the system continuously, and WIP limits keep the team from overloading.",
            ],
            bullets: [
              "Visualize work on a board — columns are stages, cards are work items.",
              "Limit work in progress so the team finishes before it starts.",
              "Manage flow and fix bottlenecks when cards pile up.",
              "Make rules explicit — who does what, and when a card is done.",
            ],
            screenshot: "Screenshot: A kanban board illustrating pull-based workflow with WIP limits.",
          },
          {
            h2: "Scrum vs Kanban: Key Differences",
            paragraphs: [
              "The practical differences show up in rhythm and roles.",
            ],
            bullets: [
              "Rhythm — Scrum works in fixed sprints; Kanban flows continuously.",
              "Roles — Scrum has defined roles; Kanban has none.",
              "Planning — Scrum plans at sprint start; Kanban plans on demand.",
              "Change — Scrum protects the sprint from new work; Kanban absorbs changes anytime.",
              "Metrics — Scrum tracks velocity; Kanban tracks cycle time and flow.",
            ],
          },
          {
            h2: "How to Choose",
            paragraphs: [
              "Match the framework to the nature of your work, not the fashion of the moment.",
            ],
            h3s: [
              {
                heading: "Choose Scrum if",
                bullets: [
                  "You deliver a product in regular releases and can commit to fixed-length cycles.",
                  "A dedicated Product Owner can keep the backlog prioritized.",
                  "The team is stable enough to hold roles and ceremonies.",
                ],
              },
              {
                heading: "Choose Kanban if",
                bullets: [
                  "Work arrives continuously — support, operations, requests.",
                  "Priorities change often and you need flexibility.",
                  "You want the least process possible and can enforce WIP limits.",
                ],
              },
              {
                heading: "Combine them (Scrumban) if",
                body: "Many teams plan in sprints but visualize daily work on a kanban board with WIP limits. That hybrid is common and works well — the tools you pick should support both boards and sprints.",
              },
            ],
          },
          {
            h2: "Tools That Support Agile, Scrum, and Kanban",
            paragraphs: [
              "Your tool should not force the methodology. Look for a platform where you can run a kanban board for daily flow, a timeline for planning, and keep everything on the same tasks.",
              "Theta PM shows the same work as kanban, timeline, Gantt, and calendar views, so teams can move between continuous flow and structured planning without changing tools.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Is Kanban an Agile methodology?",
            a: "Kanban is often described as an agile method, but it is really a workflow method that can be used with or without agile principles. It works well inside an agile team, especially combined with Scrum.",
          },
          {
            q: "Can you use Kanban and Scrum together?",
            a: "Yes. Many teams run Scrum sprints while visualizing daily work on a kanban board with WIP limits. This hybrid is commonly called Scrumban.",
          },
          {
            q: "What is the difference between Agile and Scrum?",
            a: "Agile is a philosophy of iterative delivery and adaptation. Scrum is a specific framework — with roles, sprints, and ceremonies — that puts agile principles into practice.",
          },
          {
            q: "Which is better: Kanban or Scrum?",
            a: "Neither is better overall. Scrum suits product teams that can commit to fixed-length sprints. Kanban suits teams with continuous, changing work. Pick based on your workflow, not preference.",
          },
          {
            q: "Does the tool matter when choosing a methodology?",
            a: "Yes. A tool that only offers one view will steer your process. Platforms like Theta PM and Asana support both boards and timelines, so the methodology choice stays yours.",
          },
        ]}
        internalLinks={[
          { label: "Kanban Guide", href: "/guides/kanban" },
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "What Is Agile?", href: "/guides/what-is-agile" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
