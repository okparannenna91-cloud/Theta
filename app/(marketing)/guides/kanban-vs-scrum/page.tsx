import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Kanban vs Scrum: Key Differences and How to Choose (2026)",
  description: "Kanban vs Scrum explained simply for 2026: how the two frameworks differ in roles, cadence, and WIP limits, and how to pick the right one for your team.",
  alternates: { canonical: `${BASE}/guides/kanban-vs-scrum` },
  openGraph: {
    title: "Kanban vs Scrum: Key Differences and How to Choose (2026)",
    description: "Roles, cadence, and WIP limits compared — plus how to pick the right one.",
    url: `${BASE}/guides/kanban-vs-scrum`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kanban vs Scrum: Key Differences and How to Choose (2026)",
    description: "Roles, cadence, and WIP limits compared — plus how to pick the right one.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Kanban vs Scrum: Key Differences and How to Choose (2026)",
    description: "A plain-English comparison of Kanban and Scrum covering roles, cadence, WIP limits, and scope — with practical advice on choosing between them.",
    author: { "@type": "Organization", name: "Theta PM Systems" },
    publisher: { "@type": "Organization", name: "Theta PM Systems" },
  },
];

export default function KanbanVsScrum() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Kanban vs Scrum"]}
        title="Kanban vs Scrum: Key Differences and How to Choose"
        intro={[
          "Kanban and Scrum are the two most popular ways teams organize work. Both help you get things done in a visible, structured way — but they work very differently under the hood.",
          "In short: Scrum runs in fixed sprints with clear roles, while Kanban is a continuous flow of work with no set roles. This guide walks through both, compares them side by side, and helps you decide which fits your team.",
        ]}
        sections={[
          {
            h2: "Quick Comparison Table",
            paragraphs: [
              "Here is the fast version. The rest of this guide fills in the details.",
            ],
            table: {
              headers: ["", "Kanban", "Scrum"],
              rows: [
                ["Work rhythm", "Continuous flow", "Fixed sprints (1–4 weeks)"],
                ["Roles", "None required", "Product Owner, Scrum Master, team"],
                ["WIP limits", "Yes — core rule", "Not typically used"],
                ["Scope", "Flexible, can change anytime", "Locked during a sprint"],
                ["Planning", "On demand, pull-based", "Sprint planning at the start"],
                ["Best for", "Support, ops, ongoing work", "Product delivery in cycles"],
                ["Key metrics", "Cycle time, flow", "Velocity"],
              ],
            },
          },
          {
            h2: "What Is Kanban?",
            paragraphs: [
              "Kanban is a visual method for managing work. Work items sit on a board as cards, and columns show each stage of the workflow — like To Do, In Progress, and Done. Cards move left to right as work gets done.",
              "There are no sprints and no fixed roles. Work is pulled through the system continuously, and the team limits how many items can be in progress at once (WIP limits) so nobody gets overloaded.",
            ],
            bullets: [
              "Every work item is a card, and the board shows exactly where each one sits.",
              "WIP limits cap how many cards can be open at once, so work gets finished instead of just started.",
              "Bottlenecks show up as a pile-up in one column — easy to see, easy to fix.",
              "The team agrees what 'In Progress' and 'Done' mean, so the board stays honest.",
            ],
            screenshot: "Screenshot: A kanban board showing cards flowing through To Do, In Progress, and Done columns.",
          },
          {
            h2: "What Is Scrum?",
            paragraphs: [
              "Scrum is a structured framework for delivering work in cycles called sprints. Each sprint lasts one to four weeks, and the team commits to a batch of work at the start. New work is not added mid-sprint — the team stays focused on what it promised.",
              "Scrum comes with specific roles and ceremonies that keep the process running. That structure is a strength when you need predictability, but it is also the biggest reason some teams find it heavy.",
            ],
            h3s: [
              {
                heading: "Scrum roles",
                bullets: [
                  "Product Owner — owns the backlog and decides what gets built next.",
                  "Scrum Master — coaches the team and clears anything slowing it down.",
                  "Development team — picks up the work and delivers it inside the sprint.",
                ],
              },
              {
                heading: "Scrum ceremonies",
                bullets: [
                  "Sprint planning — the team picks the batch of work it will finish.",
                  "Daily standup — fifteen minutes to sync up and flag anything stuck.",
                  "Sprint review — demo the finished work to stakeholders.",
                  "Retrospective — the team agrees what to change next time.",
                ],
              },
            ],
          },
          {
            h2: "Kanban vs Scrum: The Key Differences",
            paragraphs: [
              "The differences between Kanban and Scrum show up in four places: cadence, roles, WIP limits, and scope.",
            ],
            bullets: [
              "Cadence — Scrum runs in fixed sprints; Kanban flows continuously with no calendar pressure.",
              "Roles — Scrum requires three defined roles; Kanban works with no roles at all.",
              "WIP limits — Kanban treats limiting work in progress as its core rule; Scrum relies on sprint commitments instead.",
              "Scope — Scrum locks the sprint's scope and says no to mid-sprint changes; Kanban lets new work join the board anytime.",
              "Planning — Scrum plans in a dedicated ceremony; Kanban plans on demand, one item at a time.",
            ],
            screenshot: "Screenshot: A scrum sprint board with a sprint backlog and a kanban board side by side.",
          },
          {
            h2: "How to Choose: Kanban or Scrum?",
            paragraphs: [
              "Pick the framework that matches how your work actually arrives, not the one that sounds better in a meeting.",
            ],
            h3s: [
              {
                heading: "Choose Kanban if",
                bullets: [
                  "Work arrives continuously — support tickets, requests, maintenance.",
                  "New requests land every day and the list keeps moving.",
                  "You want minimal ceremony and will actually cap how much is in progress.",
                  "Your team does not have clear product roles to fill.",
                ],
              },
              {
                heading: "Choose Scrum if",
                bullets: [
                  "Your work ships in releases, and you can promise a fixed batch every few weeks.",
                  "Someone can own the backlog and keep it ranked and ready.",
                  "Your team can stay together long enough to hold roles and ceremonies.",
                  "You need a predictable rhythm stakeholders can plan around.",
                ],
              },
              {
                heading: "When neither fits perfectly",
                body: "Many teams land on a hybrid called Scrumban — Scrum's planning and roles plus Kanban's visual board and WIP limits. If you are between the two, that is often the answer. The tool you use should let you run both, so you are not forced into one.",
              },
            ],
          },
          {
            h2: "Running Both: Scrum Inside Kanban",
            paragraphs: [
              "You do not have to pick one forever. Teams frequently plan in sprints (Scrum) while running the daily work on a kanban board with WIP limits (Kanban). The two combine well because they work at different levels: sprints set the plan, and the board manages the flow.",
              "Whatever you choose, the tool should stay out of the way. Look for a platform where the same tasks can be shown as a kanban board for daily flow, a timeline for planning, and a calendar for deadlines — without copying work between views.",
            ],
            bullets: [
              "Use sprint planning to set the batch of work, then let the kanban board manage it day to day.",
              "Keep WIP limits even during a sprint so the team stays focused.",
              "Review the board and the sprint together in your retrospective.",
            ],
          },
          {
            h2: "Tools That Support Both",
            paragraphs: [
              "Your project management software should not pick your methodology for you. A tool that only shows one view will quietly steer your process in one direction.",
              "Theta PM shows the same tasks as kanban, timeline, Gantt, and calendar views, so you can run a board for daily flow and keep the plan on the timeline without copying work between views. That keeps the methodology decision yours — not the software's.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is the main difference between Kanban and Scrum?",
            a: "Scrum works in fixed-length sprints with defined roles and locked scope. Kanban is continuous — work flows through a board with WIP limits and no fixed roles or sprint boundaries.",
          },
          {
            q: "Can you use Kanban and Scrum together?",
            a: "Yes. The combination is called Scrumban: plan in sprints, then manage the daily work on a kanban board with WIP limits. Many teams run this way.",
          },
          {
            q: "Which is better for beginners: Kanban or Scrum?",
            a: "Kanban is usually easier to start because there is no setup — just make a board and move cards. Scrum takes more structure and discipline but gives you a clearer rhythm once it is running.",
          },
          {
            q: "Does Kanban have WIP limits?",
            a: "Yes, limiting work in progress is Kanban's central rule. It stops the team from starting too much at once so work actually gets finished.",
          },
          {
            q: "Is Scrum an Agile framework?",
            a: "Yes. Scrum is the most popular framework for putting agile principles into practice, using sprints, roles, and ceremonies to deliver work in small increments.",
          },
        ]}
        internalLinks={[
          { label: "Kanban Guide", href: "/guides/kanban" },
          { label: "Kanban vs Scrum vs Agile", href: "/guides/kanban-vs-scrum-vs-agile" },
          { label: "What is Agile Project Management", href: "/guides/what-is-agile" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
